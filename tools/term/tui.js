#!/usr/bin/env node
import { config } from './config.js';
import { theme, FOOTERS } from './theme.js';
import {
  apiGet,
  apiPatch,
  getMetrics,
  getProcesses,
  getAlerts,
  getAlertRules,
  checkBackend,
} from './api.js';
import { sortProcs, formatProcRow, sparkline, SORT_KEYS } from './utils.js';

const MODES = ['hosts', 'processes', 'metrics', 'alerts', 'rules'];

async function runTui() {
  const ok = await checkBackend();
  if (!ok) {
    process.stderr.write(
      `\nBackend not available at ${config.API_URL}\nRun: make up\n\n`
    );
    process.exit(1);
  }

  const blessed = (await import('blessed')).default;
  const screen = blessed.screen({ smartCSR: true, title: 'Monitoring TUI' });

  let mode = 'hosts';
  let sortBy = 'cpu_pct';
  let sortDesc = true;
  let hostIndex = 0;
  let hosts = [];
  let processes = [];
  let metrics = null;
  let alerts = [];
  let alertRules = [];
  let alertsStatusFilter = '';
  let filterStr = '';
  let hostFilterStr = '';
  let loading = false;
  let lastError = null;
  let refreshAbort = null;

  const header = blessed.box({
    parent: screen,
    top: 0,
    left: 0,
    width: '100%',
    height: 3,
    tags: true,
    style: theme.header,
    content: ' Loading...',
  });

  const table = blessed.listtable({
    parent: screen,
    top: 3,
    left: 0,
    width: '100%',
    height: '100%-2',
    keys: true,
    vi: true,
    mouse: true,
    style: theme.table,
    align: 'left',
    pad: 1,
    noCellBorders: true,
  });

  const footer = blessed.box({
    parent: screen,
    bottom: 0,
    left: 0,
    width: '100%',
    height: 1,
    tags: true,
    style: theme.footer,
    content: '',
  });

  function setFooter() {
    footer.setContent(FOOTERS[mode] || FOOTERS.hosts);
  }

  function setLoading(value) {
    loading = value;
  }

  function setHeaderText(line1, line2 = '') {
    const hostName = hosts[hostIndex]?.name || '—';
    const m = metrics?.length ? metrics[metrics.length - 1] : null;
    const cpu = m ? `${(m.cpu_total_pct ?? 0).toFixed(1)}%` : '—';
    const mem = m
      ? `${(m.mem_used_mb ?? 0).toFixed(0)}/${(m.mem_total_mb ?? 0).toFixed(0)} MB`
      : '—';
    const load = m
      ? `${(m.load1 ?? 0).toFixed(2)} ${(m.load5 ?? 0).toFixed(2)} ${(m.load15 ?? 0).toFixed(2)}`
      : '—';
    const cpuVals = (metrics || []).map((x) => x.cpu_total_pct).filter(Boolean);
    const spark = sparkline(cpuVals.slice(-30), 12);
    const loadLine =
      loading && lastError
        ? ` Error: ${lastError}`
        : loading
          ? ` Loading...`
          : lastError
            ? ` Error: ${lastError}`
            : ` {bold}${hostName}{/bold}  CPU ${cpu}  Mem ${mem}  Load ${load}  ${spark ? `[${spark}]` : ''}`;
    header.setContent(` ${loadLine}\n` + (line2 ? ` ${line2}` : ''));
  }

  function filteredHosts() {
    if (!hostFilterStr) return hosts;
    const f = hostFilterStr.toLowerCase();
    return hosts.filter(
      (h) =>
        (h.name || '').toLowerCase().includes(f) ||
        (h.id || '').toLowerCase().includes(f)
    );
  }

  function renderHosts() {
    const list = filteredHosts();
    const rows = [
      ['NAME', 'ONLINE', 'LAST SEEN', 'CPU%', 'MEM'],
      ...list.map((h) => {
        const last = h.lastMetric || {};
        const cpu =
          last.cpu_total_pct != null ? `${last.cpu_total_pct.toFixed(1)}%` : '—';
        const mem =
          last.mem_used_mb != null && last.mem_total_mb != null
            ? `${last.mem_used_mb.toFixed(0)}/${last.mem_total_mb.toFixed(0)}`
            : '—';
        const seen = h.lastSeenAt ? new Date(h.lastSeenAt).toLocaleString() : '—';
        return [h.name || h.id?.slice(0, 8), h.online ? 'yes' : 'no', seen, cpu, mem];
      }),
    ];
    table.setData(rows.length > 1 ? rows : [['(no hosts match filter)']]);
    setHeaderText(
      'Hosts',
      `Hosts: ${list.length}${hostFilterStr ? ` (filter: "${hostFilterStr}")` : ''}`
    );
    setFooter();
    screen.render();
  }

  function renderProcesses() {
    let list = processes;
    if (filterStr) {
      const f = filterStr.toLowerCase();
      list = list.filter(
        (p) =>
          String(p.pid).includes(f) || (p.name || '').toLowerCase().includes(f)
      );
    }
    const sorted = sortProcs(list, sortBy, sortDesc);
    const rows = [
      ['PID', 'NAME', 'CPU%', 'RSS', 'STATE'],
      ...sorted.map(formatProcRow),
    ];
    const emptyRows =
      rows.length <= 1
        ? [
            ['(no processes)', '', '', '', ''],
            ['Tip: make up-full, wait 30s, press r', '', '', '', ''],
          ]
        : [];
    table.setData(rows.length > 1 ? rows : [rows[0], ...emptyRows]);
    setHeaderText(
      '',
      `Processes: ${sorted.length}${filterStr ? ` (filter: "${filterStr}")` : ''}  Sort: ${sortBy} ${sortDesc ? '↓' : '↑'}`
    );
    setFooter();
    screen.render();
  }

  function renderMetrics() {
    const host = hosts[hostIndex];
    const m = metrics?.length ? metrics[metrics.length - 1] : null;
    const cpuVals = (metrics || []).map((x) => x.cpu_total_pct).filter(Boolean);
    const memVals = (metrics || []).map(
      (x) => (x.mem_used_mb / (x.mem_total_mb || 1)) * 100
    );
    const spark = sparkline(cpuVals.slice(-40), 20);
    const memSpark = sparkline(memVals.slice(-40), 12);
    const rows = [
      ['Metric', 'Value'],
      ['CPU %', m ? `${(m.cpu_total_pct ?? 0).toFixed(2)}%` : '—'],
      [
        'Load 1/5/15',
        m
          ? `${(m.load1 ?? 0).toFixed(2)} ${(m.load5 ?? 0).toFixed(2)} ${(m.load15 ?? 0).toFixed(2)}`
          : '—',
      ],
      [
        'Mem used/total MB',
        m
          ? `${(m.mem_used_mb ?? 0).toFixed(0)} / ${(m.mem_total_mb ?? 0).toFixed(0)}`
          : '—',
      ],
      ['Disk %', m ? `${(m.disk_used_pct ?? 0).toFixed(1)}%` : '—'],
      ['Net Rx/Tx Bps', m ? `${m.net_rx_bps} / ${m.net_tx_bps}` : '—'],
      ['CPU spark', spark || '—'],
      ['Mem % spark', memSpark || '—'],
    ];
    table.setData(rows);
    setHeaderText('Metrics', host ? `Host: ${host.name}` : '');
    setFooter();
    screen.render();
  }

  function renderAlerts() {
    let list = alerts;
    if (alertsStatusFilter) {
      list = list.filter(
        (e) =>
          (e.status || '').toLowerCase() === alertsStatusFilter.toLowerCase()
      );
    }
    const rows = [
      ['TIME', 'HOST', 'RULE', 'STATUS', 'MESSAGE'],
      ...list.slice(0, 100).map((e) => {
        const hostName =
          hosts.find((h) => h.id === e.hostId)?.name ||
          e.hostId?.slice(0, 8) ||
          '—';
        const time = e.ts ? new Date(e.ts).toLocaleString() : '—';
        const rule = (e.ruleId || '').slice(0, 12);
        const msg = (e.message || '').slice(0, 24);
        return [time, hostName, rule, e.status || '—', msg];
      }),
    ];
    table.setData(rows.length > 1 ? rows : [['(no alerts)']]);
    setHeaderText(
      'Alerts',
      `Events: ${list.length}${alertsStatusFilter ? ` (status=${alertsStatusFilter})` : ''}`
    );
    setFooter();
    screen.render();
  }

  function renderRules() {
    const host = hosts[hostIndex];
    const hostId = host?.id;
    const list = hostId
      ? alertRules.filter((r) => !r.hostId || r.hostId === hostId)
      : alertRules;
    const rows = [
      ['HOST', 'METRIC', 'OP', 'THRESHOLD', 'ENABLED', 'SEVERITY'],
      ...list.map((r) => {
        const hostName =
          r.hostId
            ? hosts.find((h) => h.id === r.hostId)?.name || r.hostId.slice(0, 8)
            : 'any';
        return [
          hostName,
          (r.metric || '').slice(0, 12),
          r.op || '—',
          r.threshold != null ? String(r.threshold) : '—',
          r.enabled ? 'yes' : 'no',
          r.severity || '—',
        ];
      }),
    ];
    table.setData(rows.length > 1 ? rows : [['(no rules)']]);
    setHeaderText(
      'Alert Rules',
      host ? `Host: ${host.name}` : 'All hosts'
    );
    setFooter();
    screen.render();
  }

  function render() {
    if (mode === 'hosts') renderHosts();
    else if (mode === 'processes') renderProcesses();
    else if (mode === 'metrics') renderMetrics();
    else if (mode === 'alerts') renderAlerts();
    else if (mode === 'rules') renderRules();
  }

  async function refresh() {
    if (refreshAbort) {
      refreshAbort.abort?.();
    }
    setLoading(true);
    lastError = null;
    render();

    try {
      hosts = await apiGet('/hosts');
      if (!hosts.length) {
        header.setContent(
          ' No hosts. Start agent: docker compose up -d agent\n'
        );
        table.setData([['(no data)']]);
        setLoading(false);
        setFooter();
        screen.render();
        return;
      }
      if (hostIndex >= hosts.length) hostIndex = 0;
      const host = hosts[hostIndex];

      if (mode === 'hosts') {
        const to = new Date();
        const from = new Date(to.getTime() - 300000);
        await Promise.all(
          hosts.map(async (h) => {
            try {
              const data = await getMetrics(h.id, from, to);
              h.lastMetric = data?.length ? data[data.length - 1] : null;
            } catch {
              h.lastMetric = null;
            }
          })
        );
      }

      if (mode === 'processes' || mode === 'metrics') {
        const to = new Date();
        const from = new Date(to.getTime() - 60000);
        const [metricsData, procsData] = await Promise.all([
          getMetrics(host.id, from, to),
          mode === 'processes' ? getProcesses(host.id) : Promise.resolve([]),
        ]);
        metrics = metricsData;
        if (mode === 'processes') processes = procsData;
      }

      if (mode === 'alerts') {
        const to = new Date();
        const from = new Date(to.getTime() - 86400000);
        alerts = await getAlerts({
          from,
          to,
          status: alertsStatusFilter || undefined,
        });
      }

      if (mode === 'rules') {
        alertRules = await getAlertRules(host?.id);
      }

      lastError = null;
      render();
    } catch (e) {
      lastError = e.message;
      render();
    } finally {
      setLoading(false);
    }
  }

  async function refreshAlertsOnly() {
    if (mode !== 'alerts') return;
    try {
      const to = new Date();
      const from = new Date(to.getTime() - 86400000);
      alerts = await getAlerts({
        from,
        to,
        status: alertsStatusFilter || undefined,
      });
      renderAlerts();
    } catch {}
  }

  table.on('select', (_, i) => {
    if (mode === 'hosts' && hosts.length) {
      const list = filteredHosts();
      if (i > 0 && i <= list.length) {
        const idx = hosts.indexOf(list[i - 1]);
        if (idx >= 0) {
          hostIndex = idx;
          mode = 'processes';
          refresh();
        }
      }
    } else if (mode === 'rules' && alertRules.length) {
      const list = hostIndex >= 0
        ? alertRules.filter((r) => !r.hostId || r.hostId === hosts[hostIndex]?.id)
        : alertRules;
      if (i > 0 && i <= list.length) {
        const rule = list[i - 1];
        const newEnabled = !rule.enabled;
        apiPatch(`/alert-rules/${rule.id}`, { enabled: newEnabled })
          .then(() => refresh())
          .catch(() => {});
      }
    }
  });

  const bindScreen = () => {
    for (let i = 1; i <= 5; i++) {
      const k = String(i);
      const fk = `f${i}`;
      screen.key([k, fk], () => {
        mode = MODES[i - 1];
        refresh();
      });
    }

    screen.key(['enter'], () => {
      if (mode === 'hosts' && hosts.length) {
        const list = filteredHosts();
        const sel = table.selected;
        if (sel >= 1 && sel <= list.length) {
          const idx = hosts.indexOf(list[sel - 1]);
          if (idx >= 0) {
            hostIndex = idx;
            mode = 'processes';
            refresh();
          }
        }
      }
    });

    screen.key(['s'], () => {
      if (mode === 'processes') {
        const idx = SORT_KEYS.indexOf(sortBy);
        sortBy = SORT_KEYS[(idx + 1) % SORT_KEYS.length];
        renderProcesses();
      }
    });

    screen.key(['S'], () => {
      if (mode === 'processes') {
        sortDesc = !sortDesc;
        renderProcesses();
      }
    });

    screen.key(['r', 'R'], () => refresh());

    screen.key(['/'], () => {
      if (mode === 'hosts') {
        const prompt = blessed.prompt({
          parent: screen,
          top: 'center',
          left: 'center',
          width: '50%',
          height: 'shrink',
          tags: true,
          border: { type: 'line' },
          style: theme.prompt,
        });
        prompt.input(' Search hosts (name or id): ', hostFilterStr, (err, value) => {
          if (!err && value != null) hostFilterStr = String(value).trim();
          renderHosts();
        });
      }
    });

    screen.key(['f'], () => {
      if (mode === 'processes') {
        const prompt = blessed.prompt({
          parent: screen,
          top: 'center',
          left: 'center',
          width: '50%',
          height: 'shrink',
          tags: true,
          border: { type: 'line' },
          style: theme.prompt,
        });
        prompt.input(' Filter (PID or name): ', filterStr, (err, value) => {
          if (!err && value != null) filterStr = String(value).trim();
          renderProcesses();
        });
      } else if (mode === 'alerts') {
        const prompt = blessed.prompt({
          parent: screen,
          top: 'center',
          left: 'center',
          width: '50%',
          height: 'shrink',
          tags: true,
          border: { type: 'line' },
          style: theme.prompt,
        });
        prompt.input(
          ' Status filter (firing|ok|empty): ',
          alertsStatusFilter,
          (err, value) => {
            if (!err && value != null) alertsStatusFilter = String(value).trim();
            renderAlerts();
          }
        );
      }
    });

    screen.key(['h'], () => {
      if (mode === 'processes' && hosts.length > 1) {
        hostIndex = (hostIndex + 1) % hosts.length;
        refresh();
      }
    });

    screen.key(['k', 'f9'], () => {
      if (mode !== 'processes' || !processes.length) return;
      let list = processes;
      if (filterStr) {
        const f = filterStr.toLowerCase();
        list = list.filter(
          (p) =>
            String(p.pid).includes(f) || (p.name || '').toLowerCase().includes(f)
        );
      }
      const sorted = sortProcs(list, sortBy, sortDesc);
      const idx = table.selected - 1;
      if (idx < 0 || idx >= sorted.length) return;
      const proc = sorted[idx];
      const sigs = ['SIGTERM', 'SIGKILL'];
      const listbox = blessed.list({
        parent: screen,
        top: 'center',
        left: 'center',
        width: 30,
        height: 6,
        tags: true,
        border: { type: 'line' },
        style: { ...theme.table, border: theme.prompt.border },
        keys: true,
        items: sigs,
      });
      listbox.on('select', async (item, i) => {
        const signal = sigs[i];
        listbox.destroy();
        const confirmBox = blessed.prompt({
          parent: screen,
          top: 'center',
          left: 'center',
          width: '50%',
          height: 'shrink',
          tags: true,
          border: { type: 'line' },
          style: theme.prompt,
        });
        confirmBox.input(
          ` PID ${proc.pid} (${(proc.name || '').slice(0, 20)}), send ${signal}? (y/n): `,
          'n',
          async (err, value) => {
            if (!err && (value || '').toLowerCase().startsWith('y')) {
              const host = hosts[hostIndex];
              try {
                await fetch(
                  new URL(
                    `/hosts/${host.id}/processes/${proc.pid}/signal`,
                    config.API_URL
                  ),
                  {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ signal }),
                  }
                );
                refresh();
              } catch (e) {
                lastError = e.message;
                render();
              }
            }
            render();
          }
        );
      });
      listbox.key(['escape'], () => {
        listbox.destroy();
        render();
      });
      screen.render();
    });

    screen.key(['q', 'C-c', 'escape'], quit);
  };

  let interval;
  let alertsInterval;

  function quit() {
    if (interval) clearInterval(interval);
    if (alertsInterval) clearInterval(alertsInterval);
    process.stdout.write('\nBye\n');
    process.exit(0);
  }

  bindScreen();
  await refresh();

  interval = setInterval(refresh, config.REFRESH_MS);
  alertsInterval = setInterval(refreshAlertsOnly, config.ALERTS_REFRESH_MS);

  process.on('SIGINT', quit);
  process.on('SIGTERM', quit);
}

runTui().catch((e) => {
  console.error(e);
  process.exit(1);
});
