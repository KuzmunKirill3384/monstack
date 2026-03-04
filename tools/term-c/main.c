/*
 * Fast TUI (C): ncurses + libcurl. Screens: 1 Hosts, 2 Processes, 3 Metrics, 4 Alerts.
 * Keys: 1-4 screens, Enter select host, s sort, r refresh, q quit.
 * Build: make. Run: ./monterm [API_URL]
 */
#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <strings.h>
#include <ncurses.h>
#include <curl/curl.h>

#define REFRESH_MS 500
#define MAX_PROCS 300
#define MAX_ALERTS 100
#define MAX_HOSTS 16
#define BUF_SIZE (512 * 1024)

typedef struct {
  int pid;
  char name[64];
  double cpu_pct;
  double rss_mb;
  char state[8];
} Proc;

typedef struct {
  char ts[32];
  char host_id[48];
  char status[24];
  char message[80];
} Alert;

typedef struct {
  char id[64];
  char name[64];
  int online;
} Host;

static char api_base[256] = "http://localhost:3000";
static Proc procs[MAX_PROCS];
static int nprocs;
static Alert alerts[MAX_ALERTS];
static int nalerts;
static Host hosts[MAX_HOSTS];
static int nhosts;
static int host_idx = 0;
static int host_selected = 0;
static int screen_mode = 1; /* 0=hosts, 1=procs, 2=metrics, 3=alerts */
static char host_name[64] = "-";
static char host_id[128] = "";
static double last_cpu = 0, last_mem_used = 0, last_mem_total = 0, last_load1 = 0;
static double last_disk = 0;
static int sort_by = 0;
static int sort_desc = 1;
static int fetch_error = 0;

static size_t write_cb(char *ptr, size_t size, size_t nmemb, void *user) {
  size_t len = size * nmemb;
  char **buf = (char **)user;
  size_t cur = *buf ? strlen(*buf) : 0;
  if (cur + len + 1 > BUF_SIZE) return 0;
  if (!*buf) {
    *buf = malloc(BUF_SIZE);
    if (!*buf) return 0;
    (*buf)[0] = '\0';
  }
  memcpy(*buf + cur, ptr, len + 1);
  (*buf)[cur + len] = '\0';
  return len;
}

static int fetch_url(const char *path, char **out) {
  CURL *curl = curl_easy_init();
  if (!curl) return -1;
  *out = NULL;
  char url[768];
  snprintf(url, sizeof(url), "%s%s", api_base, path);
  curl_easy_setopt(curl, CURLOPT_URL, url);
  curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_cb);
  curl_easy_setopt(curl, CURLOPT_WRITEDATA, out);
  curl_easy_setopt(curl, CURLOPT_TIMEOUT, 5L);
  CURLcode res = curl_easy_perform(curl);
  long http_code = 0;
  curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &http_code);
  curl_easy_cleanup(curl);
  if (res != CURLE_OK) {
    free(*out);
    *out = NULL;
    return -1;
  }
  if (http_code < 200 || http_code >= 300) {
    free(*out);
    *out = NULL;
    return -1;
  }
  if (!*out || !**out) return -1;
  return 0;
}

static const char *json_str(const char *start, const char *key, char *out, size_t outsz) {
  char needle[64];
  snprintf(needle, sizeof(needle), "\"%s\"", key);
  const char *p = strstr(start, needle);
  if (!p) return NULL;
  p += strlen(needle);
  while (*p == ' ' || *p == ':') p++;
  if (*p == '"') {
    p++;
    size_t i = 0;
    while (p[i] && p[i] != '"' && i < outsz - 1) {
      if (p[i] == '\\') i++;
      out[i] = p[i];
      i++;
    }
    out[i] = '\0';
    return p + i + 1;
  }
  if (*p == '-' || (*p >= '0' && *p <= '9')) {
    snprintf(out, outsz, "%.2f", atof(p));
    while (*p && *p != ',' && *p != '}' && *p != ']') p++;
    return p;
  }
  return NULL;
}

static const char *json_num(const char *start, const char *key, double *num) {
  char needle[64];
  snprintf(needle, sizeof(needle), "\"%s\"", key);
  const char *p = strstr(start, needle);
  if (!p) return NULL;
  p += strlen(needle);
  while (*p == ' ' || *p == ':') p++;
  *num = atof(p);
  while (*p && *p != ',' && *p != '}' && *p != ']') p++;
  return p;
}

static const char *json_int(const char *start, const char *key, int *num) {
  double d;
  const char *next = json_num(start, key, &d);
  if (next) *num = (int)d;
  return next;
}

static const char *json_bool(const char *start, const char *key, int *out) {
  char needle[64];
  snprintf(needle, sizeof(needle), "\"%s\"", key);
  const char *p = strstr(start, needle);
  if (!p) return NULL;
  p += strlen(needle);
  while (*p == ' ' || *p == ':') p++;
  if (strncmp(p, "true", 4) == 0) { *out = 1; return p + 4; }
  if (strncmp(p, "false", 5) == 0) { *out = 0; return p + 5; }
  return NULL;
}

static int check_backend(void) {
  char *json = NULL;
  int r = fetch_url("/ready", &json);
  free(json);
  return r == 0;
}

static int fetch_hosts_list(void) {
  char *json = NULL;
  if (fetch_url("/hosts", &json) != 0) { free(json); return -1; }
  if (!json) { free(json); return -1; }
  const char *p = strchr(json, '[');
  if (!p) { free(json); return -1; }
  memset(hosts, 0, sizeof(hosts));
  nhosts = 0;
  for (;;) {
    p = strchr(p, '{');
    if (!p || nhosts >= MAX_HOSTS) break;
    Host *h = &hosts[nhosts];
    memset(h, 0, sizeof(*h));
    json_str(p, "id", h->id, sizeof(h->id));
    json_str(p, "name", h->name, sizeof(h->name));
    json_bool(p, "online", &h->online);
    nhosts++;
    p = strchr(p + 1, '}');
    if (!p) break;
    p++;
  }
  free(json);
  if (nhosts > 0 && host_idx < nhosts) {
    snprintf(host_id, sizeof(host_id), "%s", hosts[host_idx].id);
    snprintf(host_name, sizeof(host_name), "%.63s", hosts[host_idx].name[0] ? hosts[host_idx].name : hosts[host_idx].id);
  }
  return 0;
}

static int fetch_processes(void) {
  if (!host_id[0]) return -1;
  time_t now = time(NULL);
  time_t from_t = now - 120;
  char from_buf[32], to_buf[32];
  struct tm *g = gmtime(&from_t);
  strftime(from_buf, sizeof(from_buf), "%Y-%m-%dT%H:%M:%S.000Z", g);
  g = gmtime(&now);
  strftime(to_buf, sizeof(to_buf), "%Y-%m-%dT%H:%M:%S.000Z", g);
  char path[640];
  snprintf(path, sizeof(path), "/processes?host=%s&from=%s&to=%s&limit=%d",
           host_id, from_buf, to_buf, MAX_PROCS);
  char *json = NULL;
  if (fetch_url(path, &json) != 0) { free(json); return -1; }
  if (!json) return -1;
  const char *p = strchr(json, '[');
  if (!p) { free(json); return -1; }
  memset(procs, 0, sizeof(procs));
  nprocs = 0;
  for (;;) {
    p = strchr(p, '{');
    if (!p || nprocs >= MAX_PROCS) break;
    Proc *proc = &procs[nprocs];
    proc->pid = 0; proc->name[0] = '\0'; proc->cpu_pct = 0; proc->rss_mb = 0; proc->state[0] = '\0';
    json_int(p, "pid", &proc->pid);
    json_str(p, "name", proc->name, sizeof(proc->name));
    json_num(p, "cpu_pct", &proc->cpu_pct);
    json_num(p, "rss_mb", &proc->rss_mb);
    json_str(p, "state", proc->state, sizeof(proc->state));
    nprocs++;
    p = strchr(p + 1, '}');
    if (!p) break;
    p++;
  }
  free(json);
  return 0;
}

static int fetch_metrics(void) {
  if (!host_id[0]) return -1;
  time_t now = time(NULL);
  time_t from_t = now - 60;
  char from_buf[32], to_buf[32];
  struct tm *g = gmtime(&from_t);
  strftime(from_buf, sizeof(from_buf), "%Y-%m-%dT%H:%M:%S.000Z", g);
  g = gmtime(&now);
  strftime(to_buf, sizeof(to_buf), "%Y-%m-%dT%H:%M:%S.000Z", g);
  char path[640];
  snprintf(path, sizeof(path), "/metrics?host=%s&from=%s&to=%s&resolution=raw", host_id, from_buf, to_buf);
  char *json = NULL;
  if (fetch_url(path, &json) != 0) { free(json); return -1; }
  const char *p = strrchr(json, '{');
  if (p) {
    json_num(p, "cpu_total_pct", &last_cpu);
    json_num(p, "mem_used_mb", &last_mem_used);
    json_num(p, "mem_total_mb", &last_mem_total);
    json_num(p, "load1", &last_load1);
    json_num(p, "disk_used_pct", &last_disk);
  }
  free(json);
  return 0;
}

static int fetch_alerts(void) {
  time_t now = time(NULL);
  time_t from_t = now - 86400;
  char from_buf[32], to_buf[32];
  struct tm *g = gmtime(&from_t);
  strftime(from_buf, sizeof(from_buf), "%Y-%m-%dT%H:%M:%S.000Z", g);
  g = gmtime(&now);
  strftime(to_buf, sizeof(to_buf), "%Y-%m-%dT%H:%M:%S.000Z", g);
  char path[512];
  snprintf(path, sizeof(path), "/alerts?from=%s&to=%s", from_buf, to_buf);
  char *json = NULL;
  if (fetch_url(path, &json) != 0) { free(json); return -1; }
  if (!json) return -1;
  const char *p = strchr(json, '[');
  if (!p) { free(json); return -1; }
  memset(alerts, 0, sizeof(alerts));
  nalerts = 0;
  for (;;) {
    p = strchr(p, '{');
    if (!p || nalerts >= MAX_ALERTS) break;
    Alert *a = &alerts[nalerts];
    memset(a, 0, sizeof(*a));
    json_str(p, "ts", a->ts, sizeof(a->ts));
    json_str(p, "hostId", a->host_id, sizeof(a->host_id));
    json_str(p, "status", a->status, sizeof(a->status));
    json_str(p, "message", a->message, sizeof(a->message));
    nalerts++;
    p = strchr(p + 1, '}');
    if (!p) break;
    p++;
  }
  free(json);
  return 0;
}

static int cmp_proc(const void *a, const void *b) {
  const Proc *pa = (const Proc *)a, *pb = (const Proc *)b;
  int mul = sort_desc ? -1 : 1;
  switch (sort_by) {
    case 0: return mul * (pa->cpu_pct > pb->cpu_pct ? 1 : (pa->cpu_pct < pb->cpu_pct ? -1 : 0));
    case 1: return mul * (pa->rss_mb > pb->rss_mb ? 1 : (pa->rss_mb < pb->rss_mb ? -1 : 0));
    case 2: return mul * strcasecmp(pa->name, pb->name);
    case 3: return mul * (pa->pid - pb->pid);
    default: return 0;
  }
}

static void draw_hosts(int rows, int cols) {
  mvprintw(1, 0, " NAME                              ONLINE ");
  attron(A_REVERSE);
  mvhline(2, 0, 0, cols);
  attroff(A_REVERSE);
  int y = 3;
  for (int i = 0; i < nhosts && y < rows - 2; i++, y++) {
    Host *h = &hosts[i];
    char nm[34];
    snprintf(nm, sizeof(nm), "%.32s", h->name[0] ? h->name : h->id);
    if (i == host_selected) attron(A_REVERSE);
    mvprintw(y, 0, " %-32s  %s ", nm, h->online ? "yes" : "no");
    if (i == host_selected) attroff(A_REVERSE);
  }
}

static void draw_procs(int rows, int cols) {
  mvprintw(1, 0, " PID   NAME                                    CPU%%   RSS    STATE ");
  attron(A_REVERSE);
  mvhline(2, 0, 0, cols);
  attroff(A_REVERSE);
  int y = 3;
  for (int i = 0; i < nprocs && y < rows - 2; i++, y++) {
    Proc *p = &procs[i];
    char nm[40];
    snprintf(nm, sizeof(nm), "%.36s", p->name[0] ? p->name : "-");
    mvprintw(y, 0, "%5d  %-40s %5.1f  %6.1f  %-4s", p->pid, nm, p->cpu_pct, p->rss_mb, p->state[0] ? p->state : "-");
  }
}

static void draw_metrics(int rows, int cols) {
  (void)rows;
  (void)cols;
  mvprintw(1, 0, " Metric              Value ");
  attron(A_REVERSE);
  mvhline(2, 0, 0, cols);
  attroff(A_REVERSE);
  mvprintw(3, 0, " CPU %%               %.2f%%", last_cpu);
  mvprintw(4, 0, " Load 1                %.2f", last_load1);
  mvprintw(5, 0, " Mem used/total MB     %.0f / %.0f", last_mem_used, last_mem_total);
  mvprintw(6, 0, " Disk %%                %.1f%%", last_disk);
}

static void draw_alerts(int rows, int cols) {
  mvprintw(1, 0, " TIME       HOST/ID         STATUS   MESSAGE ");
  attron(A_REVERSE);
  mvhline(2, 0, 0, cols);
  attroff(A_REVERSE);
  int y = 3;
  for (int i = 0; i < nalerts && y < rows - 2; i++, y++) {
    Alert *a = &alerts[i];
    char ts_short[20] = {0};
    if (strlen(a->ts) >= 19) {
      memcpy(ts_short, a->ts + 11, 8);
      ts_short[8] = '\0';
    } else
      snprintf(ts_short, sizeof(ts_short), "%.19s", a->ts);
    char host_short[16];
    snprintf(host_short, sizeof(host_short), "%.12s", a->host_id[0] ? a->host_id : "-");
    char msg_short[40];
    snprintf(msg_short, sizeof(msg_short), "%.36s", a->message[0] ? a->message : "-");
    if (has_colors()) {
      if (strstr(a->status, "firing")) { attron(COLOR_PAIR(1)); }
      else if (strstr(a->status, "resolved") || strstr(a->status, "ok")) { attron(COLOR_PAIR(2)); }
    }
    mvprintw(y, 0, " %-8s  %-14s  %-6s  %s ", ts_short, host_short, a->status[0] ? a->status : "-", msg_short);
    if (has_colors()) { attroff(COLOR_PAIR(1)); attroff(COLOR_PAIR(2)); }
  }
}

static const char *footer_msg(void) {
  switch (screen_mode) {
    case 0: return " 1:Hosts 2:Procs 3:Metrics 4:Alerts  Enter:select  r:refresh  q:quit ";
    case 1: return " 1:Hosts 2:Procs 3:Metrics 4:Alerts  s:sort  r:refresh  q:quit ";
    case 2:
    case 3: return " 1:Hosts 2:Procs 3:Metrics 4:Alerts  r:refresh  q:quit ";
    default: return " 1-4: screens  r:refresh  q:quit ";
  }
}

static void draw(int rows, int cols) {
  erase();
  attron(A_BOLD | A_REVERSE);
  char err_str[32] = "";
  if (fetch_error) snprintf(err_str, sizeof(err_str), " [Err]");
  const char *mode_name = screen_mode == 0 ? "Hosts" : screen_mode == 1 ? "Procs" : screen_mode == 2 ? "Metrics" : "Alerts";
  mvprintw(0, 0, " %s  CPU %.1f%%  Mem %.0f/%.0f  Load %.2f  [%s]%s ", host_name, last_cpu, last_mem_used, last_mem_total, last_load1, mode_name, err_str);
  attroff(A_BOLD | A_REVERSE);
  if (screen_mode == 0) draw_hosts(rows, cols);
  else if (screen_mode == 1) draw_procs(rows, cols);
  else if (screen_mode == 2) draw_metrics(rows, cols);
  else draw_alerts(rows, cols);
  attron(A_REVERSE);
  mvprintw(rows - 1, 0, "%-*s", cols, footer_msg());
  attroff(A_REVERSE);
  refresh();
}

int main(int argc, char **argv) {
  if (argc >= 2) snprintf(api_base, sizeof(api_base), "%s", argv[1]);
  curl_global_init(CURL_GLOBAL_DEFAULT);
  if (!check_backend()) {
    fprintf(stderr, "Backend not available at %s\nRun: make up\n", api_base);
    curl_global_cleanup();
    return 1;
  }
  initscr();
  cbreak();
  noecho();
  keypad(stdscr, TRUE);
  if (has_colors()) {
    start_color();
    init_pair(1, COLOR_RED, COLOR_BLACK);
    init_pair(2, COLOR_GREEN, COLOR_BLACK);
  }
  timeout(REFRESH_MS);
  fetch_hosts_list();
  if (nhosts > 0) host_selected = 0;
  for (;;) {
    fetch_error = 0;
    if (screen_mode == 0) {
      if (fetch_hosts_list() != 0) fetch_error = 1;
    } else if (screen_mode == 1) {
      if (fetch_processes() != 0) fetch_error = 1;
      else if (nprocs > 0) qsort(procs, nprocs, sizeof(Proc), cmp_proc);
      if (fetch_metrics() != 0) fetch_error = 1;
    } else if (screen_mode == 2) {
      if (fetch_metrics() != 0) fetch_error = 1;
    } else {
      if (fetch_alerts() != 0) fetch_error = 1;
      fetch_metrics();
    }
    int rows, cols;
    getmaxyx(stdscr, rows, cols);
    draw(rows, cols);
    int ch = getch();
    if (ch == 'q' || ch == 'Q' || ch == 27) break;
    if (ch == '1') screen_mode = 0;
    if (ch == '2') screen_mode = 1;
    if (ch == '3') screen_mode = 2;
    if (ch == '4') screen_mode = 3;
    if (ch == KEY_ENTER || ch == '\n' || ch == '\r') {
      if (screen_mode == 0 && nhosts > 0 && host_selected >= 0 && host_selected < nhosts) {
        host_idx = host_selected;
        snprintf(host_id, sizeof(host_id), "%s", hosts[host_idx].id);
        snprintf(host_name, sizeof(host_name), "%.63s", hosts[host_idx].name[0] ? hosts[host_idx].name : hosts[host_idx].id);
        screen_mode = 1;
      }
    }
    if (screen_mode == 0) {
      if (ch == KEY_UP && host_selected > 0) host_selected--;
      if (ch == KEY_DOWN && host_selected < nhosts - 1) host_selected++;
    }
    if (ch == 's' || ch == 'S') {
      sort_by = (sort_by + 1) % 4;
      if (ch == 'S') sort_desc = !sort_desc;
    }
    if (ch == 'r' || ch == 'R') {
      fetch_hosts_list();
      if (host_idx < nhosts) {
        snprintf(host_id, sizeof(host_id), "%s", hosts[host_idx].id);
        snprintf(host_name, sizeof(host_name), "%.63s", hosts[host_idx].name[0] ? hosts[host_idx].name : hosts[host_idx].id);
      }
      fetch_processes();
      fetch_metrics();
      fetch_alerts();
    }
  }
  endwin();
  curl_global_cleanup();
  return 0;
}
