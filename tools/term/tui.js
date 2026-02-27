#!/usr/bin/env node
/**
 * TUI: Hosts | Processes | Metrics | Alerts. Keys: 1-4 or F1-F4 screens, Enter on host = processes, q quit.
 */
const API_URL = process.env.API_URL || 'http://localhost:3000';
const REFRESH_MS = 5000;
const ALERTS_REFRESH_MS = 10000;
const PROCESS_LIMIT = 200;

async function apiGet(path) {
  const res = await globalThis.fetch(new URL(path, API_URL));
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

function getMetrics(hostId, from, to) {
  const params = new URLSearchParams({
    host: hostId,
    from: from.toISOString(),
    to: to.toISOString(),
    resolution: 'raw',
  });
  return apiGet(`/metrics?${params}`);
}

function getProcesses(hostId, limit = PROCESS_LIMIT) {
  const to = new Date();
  const from = new Date(to.getTime() - 120000);
  const params = new URLSearchParams({
    host: hostId,
    from: from.toISOString(),
    to: to.toISOString(),
    limit: String(limit),
  });
  return apiGet(`/processes?${params}`);
}

function getAlerts(opts = {}) {
  const params = new URLSearchParams();
  if (opts.host) params.set('host', opts.host);
  if (opts.from) params.set('from', opts.from.toISOString());
  if (opts.to) params.set('to', opts.to.toISOString());
  if (opts.status) params.set('status', opts.status);
  return apiGet(`/alerts?${params}`);
}

const SORT_KEYS = ['cpu_pct', 'rss_mb', 'name', 'pid'];
function sortProcs(procs, sortBy, desc) {
  const key = sortBy || 'cpu_pct';
  const mult = desc ? -1 : 1;
  return [...procs].sort((a, b) => {
    let va = a[key];
    let vb = b[key];
    if (typeof va === 'string') {
      va = (va || '').toLowerCase();
      vb = (vb || '').toLowerCase();
      return mult * (va < vb ? -1 : va > vb ? 1 : 0);
    }
    return mult * (va - vb);
  });
}

function formatProcRow(p) {
  const name = (p.name || '').slice(0, 36);
  return [
    String(p.pid),
    name,
    p.cpu_pct.toFixed(1),
    p.rss_mb.toFixed(1),
    (p.state || '-').slice(0, 4),
  ];
}

const SPARK_CHARS = '▁▂▃▄▅▆▇█';
function sparkline(values, width = 20) {
  if (!values.length) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = Math.max(1, Math.ceil(values.length / width));
  let out = '';
  for (let i = 0; i < width; i++) {
    const idx = Math.min(i * step, values.length - 1);
    const v = values[idx];
    const pct = (v - min) / range;
    const ci = Math.min(Math.floor(pct * SPARK_CHARS.length), SPARK_CHARS.length - 1);
    out += SPARK_CHARS[ci];
  }
  return out;
}

async function runTui() {
  const blessed = (await import('blessed')).default;
  const screen = blessed.screen({ smartCSR: true, title: 'Monitoring TUI' });

  let mode = 'hosts'; // hosts | processes | metrics | alerts
  let sortBy = 'cpu_pct';
  let sortDesc = true;
  let hostIndex = 0;
  let hosts = [];
  let processes = [];
  let metrics = null;
  let metricsHistory = [];
  let alerts = [];
  let alertsStatusFilter = ''; // '' | 'firing' | 'ok'
  let filterStr = '';

  const header = blessed.box({
    parent: screen,
    top: 0,
    left: 0,
    width: '100%',
    height: 3,
    tags: true,
    style: { bg: 'blue', fg: 'white', bold: true },
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
    style: {
      header: { fg: 'cyan', bold: true },
      cell: { fg: 'white' },
      selected: { bg: 'blue', fg: 'white' },
      border: { fg: 'gray' },
    },
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
    style: { fg: 'black', bg: 'cyan' },
    content: '',
  });

  const FOOTERS = {
    hosts: ' 1:Hosts 2:Processes 3:Metrics 4:Alerts  Enter:select host  r:refresh  q:quit ',
    processes: ' 1:Hosts 2:Processes 3:Metrics 4:Alerts  s:sort  f:filter  k:kill  h:host  r:refresh  q:quit ',
    metrics: ' 1:Hosts 2:Processes 3:Metrics 4:Alerts  r:refresh  q:quit ',
    alerts: ' 1:Hosts 2:Processes 3:Metrics 4:Alerts  f:filter status  r:refresh  q:quit ',
  };

  function setFooter() {
    footer.setContent(FOOTERS[mode] || FOOTERS.hosts);
  }

  function setHeaderText(line1, line2 = '') {
    const hostName = hosts[hostIndex]?.name || '—';
    const m = metrics && metrics.length ? metrics[metrics.length - 1] : null;
    const cpu = m ? `${m.cpu_total_pct.toFixed(1)}%` : '—';
    const mem = m ? `${m.mem_used_mb.toFixed(0)}/${m.mem_total_mb.toFixed(0)} MB` : '—';
    const load = m ? `${m.load1.toFixed(2)} ${m.load5.toFixed(2)} ${m.load15.toFixed(2)}` : '—';
    header.setContent(
      ` {bold}${hostName}{/bold}  CPU ${cpu}  Mem ${mem}  Load ${load}\n` +
        (line2 ? ` ${line2}` : '')
    );
  }

  function renderHosts() {
    const rows = [
      ['NAME', 'ONLINE', 'LAST SEEN', 'CPU%', 'MEM'],
      ...hosts.map((h) => {
        const last = (h.lastMetric || {});
        const cpu = last.cpu_total_pct != null ? `${last.cpu_total_pct.toFixed(1)}%` : '—';
        const mem = last.mem_used_mb != null && last.mem_total_mb != null
          ? `${last.mem_used_mb.toFixed(0)}/${last.mem_total_mb.toFixed(0)}` : '—';
        const seen = h.lastSeenAt
          ? new Date(h.lastSeenAt).toLocaleString()
          : '—';
        return [h.name || h.id?.slice(0, 8), h.online ? 'yes' : 'no', seen, cpu, mem];
      }),
    ];
    table.setData(rows);
    setHeaderText('Hosts', `Hosts: ${hosts.length}`);
    setFooter();
    screen.render();
  }

  function renderProcesses() {
    let list = processes;
    if (filterStr) {
      const f = filterStr.toLowerCase();
      list = list.filter((p) => String(p.pid).includes(f) || (p.name || '').toLowerCase().includes(f));
    }
    const sorted = sortProcs(list, sortBy, sortDesc);
    const rows = [
      ['PID', 'NAME', 'CPU%', 'RSS', 'STATE'],
      ...sorted.map(formatProcRow),
    ];
    table.setData(rows);
    setHeaderText(
      '',
      `Processes: ${sorted.length}${filterStr ? ` (filter: "${filterStr}")` : ''}  Sort: ${sortBy} ${sortDesc ? '↓' : '↑'}`
    );
    setFooter();
    screen.render();
  }

  function renderMetrics() {
    const host = hosts[hostIndex];
    const m = metrics && metrics.length ? metrics[metrics.length - 1] : null;
    const cpuVals = (metrics || []).map((x) => x.cpu_total_pct);
    const spark = sparkline(cpuVals.slice(-40), 20);
    const rows = [
      ['Metric', 'Value'],
      ['CPU %', m ? `${m.cpu_total_pct.toFixed(2)}%` : '—'],
      ['Load 1/5/15', m ? `${m.load1.toFixed(2)} ${m.load5.toFixed(2)} ${m.load15.toFixed(2)}` : '—'],
      ['Mem used/total MB', m ? `${m.mem_used_mb.toFixed(0)} / ${m.mem_total_mb.toFixed(0)}` : '—'],
      ['Disk %', m ? `${m.disk_used_pct.toFixed(1)}%` : '—'],
      ['Net Rx/Tx Bps', m ? `${m.net_rx_bps} / ${m.net_tx_bps}` : '—'],
      ['CPU spark (last)', spark || '—'],
    ];
    table.setData(rows);
    setHeaderText('Metrics', host ? `Host: ${host.name}` : '');
    setFooter();
    screen.render();
  }

  function renderAlerts() {
    let list = alerts;
    if (alertsStatusFilter) {
      list = list.filter((e) => (e.status || '').toLowerCase() === alertsStatusFilter.toLowerCase());
    }
    const rows = [
      ['TIME', 'HOST', 'RULE', 'STATUS', 'MESSAGE'],
      ...list.slice(0, 100).map((e) => {
        const hostName = hosts.find((h) => h.id === e.hostId)?.name || e.hostId?.slice(0, 8) || '—';
        const time = e.ts ? new Date(e.ts).toLocaleString() : '—';
        const rule = (e.ruleId || '').slice(0, 12);
        const msg = (e.message || '').slice(0, 24);
        return [time, hostName, rule, e.status || '—', msg];
      }),
    ];
    table.setData(rows);
    setHeaderText(
      'Alerts',
      `Events: ${list.length}${alertsStatusFilter ? ` (status=${alertsStatusFilter})` : ''}`
    );
    setFooter();
    screen.render();
  }

  function render() {
    if (mode === 'hosts') renderHosts();
    else if (mode === 'processes') renderProcesses();
    else if (mode === 'metrics') renderMetrics();
    else if (mode === 'alerts') renderAlerts();
  }

  async function refresh() {
    try {
      hosts = await apiGet('/hosts');
      if (!hosts.length) {
        header.setContent(' No hosts. Start agent: docker compose up -d agent\n');
        table.setData([['(no data)']]);
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
              const last = data && data.length ? data[data.length - 1] : null;
              h.lastMetric = last;
            } catch (_) {
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
        metricsHistory = metricsData || [];
        if (mode === 'processes') processes = procsData;
      }

      if (mode === 'alerts') {
        const to = new Date();
        const from = new Date(to.getTime() - 86400000);
        alerts = await getAlerts({ from, to, status: alertsStatusFilter || undefined });
      }

      render();
    } catch (e) {
      header.setContent(` Error: ${e.message}\n`);
      setFooter();
      screen.render();
    }
  }

  async function refreshAlertsOnly() {
    if (mode !== 'alerts') return;
    try {
      const to = new Date();
      const from = new Date(to.getTime() - 86400000);
      alerts = await getAlerts({ from, to, status: alertsStatusFilter || undefined });
      renderAlerts();
    } catch (_) {}
  }

  table.on('select', (_, i) => {
    if (mode === 'hosts' && i > 0 && i <= hosts.length) {
      hostIndex = i - 1;
      mode = 'processes';
      refresh();
    }
  });

  screen.key(['1', 'f1'], () => {
    mode = 'hosts';
    refresh();
  });
  screen.key(['2', 'f2'], () => {
    mode = 'processes';
    refresh();
  });
  screen.key(['3', 'f3'], () => {
    mode = 'metrics';
    refresh();
  });
  screen.key(['4', 'f4'], () => {
    mode = 'alerts';
    refresh();
  });

  screen.key(['enter'], () => {
    if (mode === 'hosts' && hosts.length) {
      hostIndex = table.selected;
      if (hostIndex >= 1 && hostIndex <= hosts.length) {
        hostIndex = hostIndex - 1;
        mode = 'processes';
        refresh();
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

  screen.key(['r', 'R'], () => {
    refresh();
  });

  async function sendSignal(pid, signal) {
    const host = hosts[hostIndex];
    if (!host) return;
    try {
      const res = await fetch(
        new URL(`/hosts/${host.id}/processes/${pid}/signal`, API_URL),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ signal }),
        }
      );
      if (!res.ok) throw new Error(await res.text() || res.statusText);
      refresh();
    } catch (e) {
      setHeaderText('', `Signal failed: ${e.message}`);
      screen.render();
    }
  }

  screen.key(['k', 'f9'], () => {
    if (mode !== 'processes' || !processes.length) return;
    let list = processes;
    if (filterStr) {
      const f = filterStr.toLowerCase();
      list = list.filter((p) => String(p.pid).includes(f) || (p.name || '').toLowerCase().includes(f));
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
      style: { border: { fg: 'cyan' }, selected: { bg: 'blue' } },
      keys: true,
      items: ['SIGTERM', 'SIGKILL'],
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
        style: { border: { fg: 'yellow' } },
      });
      confirmBox.input(
        ` PID ${proc.pid} (${(proc.name || '').slice(0, 20)}), send ${signal}? (y/n): `,
        'n',
        async (err, value) => {
          if (!err && (value || '').toLowerCase().startsWith('y')) {
            await sendSignal(proc.pid, signal);
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

  screen.key(['h'], () => {
    if (mode === 'processes' && hosts.length > 1) {
      hostIndex = (hostIndex + 1) % hosts.length;
      refresh();
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
        style: { border: { fg: 'cyan' } },
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
        style: { border: { fg: 'cyan' } },
      });
      prompt.input(' Status filter (firing|ok|empty): ', alertsStatusFilter, (err, value) => {
        if (!err && value != null) alertsStatusFilter = String(value).trim();
        renderAlerts();
      });
    }
  });

  screen.key(['q', 'C-c', 'escape'], () => process.exit(0));

  await refresh();
  let interval = setInterval(refresh, REFRESH_MS);
  let alertsInterval;
  function setIntervals() {
    clearInterval(interval);
    interval = setInterval(refresh, REFRESH_MS);
    if (alertsInterval) clearInterval(alertsInterval);
    alertsInterval = setInterval(refreshAlertsOnly, ALERTS_REFRESH_MS);
  }
  setIntervals();

  process.on('exit', () => {
    clearInterval(interval);
    if (alertsInterval) clearInterval(alertsInterval);
  });
}

runTui().catch((e) => {
  console.error(e);
  process.exit(1);
});
