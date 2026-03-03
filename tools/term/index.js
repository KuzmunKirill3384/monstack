#!/usr/bin/env node
import { config } from './config.js';
import { getHosts, getMetrics, getProcesses } from './api.js';

const WATCH_INTERVAL_MS = 10000;

function formatTable(headers, rows) {
  const widths = headers.map((h, i) => Math.max(String(h).length, ...rows.map((r) => String(r[i] ?? '').length)));
  const pad = (s, w) => String(s).slice(0, w).padEnd(w);
  const row = (arr) => '  ' + arr.map((s, i) => pad(s, widths[i])).join('  ');
  return [row(headers), row(widths.map((w) => '-'.repeat(w))), ...rows.map((r) => row(r))].join('\n');
}

function render(chalk, hosts, metricsByHost, processesByHost) {
  console.clear();
  console.log(chalk.bold(' Hosts\n'));
  if (!hosts.length) {
    console.log('  No hosts. Start the agent (e.g. docker compose up agent).\n');
    return;
  }
  for (const h of hosts) {
    const status = h.online ? chalk.green('● online') : chalk.gray('○ offline');
    console.log(`  ${chalk.bold(h.name)}  ${status}  ${h.lastSeenAt ? new Date(h.lastSeenAt).toLocaleString() : '—'}`);
    const metrics = metricsByHost[h.id];
    if (metrics?.length) {
      const m = metrics[metrics.length - 1];
      console.log(`    CPU ${m.cpu_total_pct.toFixed(1)}%  Load ${m.load1.toFixed(2)}  Mem ${m.mem_used_mb}/${m.mem_total_mb} MB  Disk ${m.disk_used_pct.toFixed(1)}%`);
    }
    const procs = processesByHost[h.id];
    if (procs?.length) {
      console.log('    Top processes:');
      const header = ['PID', 'NAME', 'CPU%', 'RSS MB'];
      const rows = procs.slice(0, 5).map((p) => [p.pid, (p.name || '').slice(0, 20), p.cpu_pct.toFixed(1), p.rss_mb.toFixed(1)]);
      console.log(formatTable(header, rows).replace(/^/gm, '      '));
    }
    console.log('');
  }
  console.log(chalk.gray(` API: ${config.API_URL}  (--watch to refresh every ${WATCH_INTERVAL_MS / 1000}s)`));
}

async function main() {
  const watch = process.argv.includes('--watch');
  const chalk = (await import('chalk')).default;
  const run = async () => {
    try {
      const hosts = await getHosts();
      const to = new Date();
      const from = new Date(to.getTime() - 3600000);
      const metricsByHost = {};
      const processesByHost = {};
      for (const h of hosts) {
        try {
          metricsByHost[h.id] = await getMetrics(h.id, from, to);
          processesByHost[h.id] = await getProcesses(h.id, 5);
        } catch {
          metricsByHost[h.id] = [];
          processesByHost[h.id] = [];
        }
      }
      render(chalk, hosts, metricsByHost, processesByHost);
    } catch (e) {
      console.error(chalk.red('Error:'), e.message);
      console.log(chalk.gray('Ensure backend is running: docker compose up -d backend agent'));
    }
  };
  await run();
  if (watch) setInterval(run, WATCH_INTERVAL_MS);
}

main();
