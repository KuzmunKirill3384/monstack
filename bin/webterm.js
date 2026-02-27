#!/usr/bin/env node
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = path.resolve(__dirname, '..');

const WEB_URL = 'http://localhost:3001';
const API_URL = 'http://localhost:3000';
const DOCS_URL = 'http://localhost:3000/api/docs';
const WAIT_READY_TIMEOUT_MS = 60000;
const WAIT_READY_INTERVAL_MS = 2000;

const banner = `
  ╔══════════════════════════════════════════════════════════════════╗
  ║                                                                  ║
  ║     ██╗    ██╗███████╗██████╗    ████████╗███████╗██████╗ ███╗  ██╗  ║
  ║     ██║    ██║██╔════╝██╔══██╗   ╚══██╔══╝██╔════╝██╔══██╗████╗ ██║  ║
  ║     ██║ █╗ ██║█████╗  ██████╔╝      ██║   █████╗  ██████╔╝██╔████╔██║  ║
  ║     ██║███╗██║██╔══╝  ██╔══██╗      ██║   ██╔══╝  ██╔══██╗██║╚██╔╝██║  ║
  ║     ╚███╔███╔╝███████╗██████╔╝      ██║   ███████╗██║  ██║██║ ╚═╝ ██║  ║
  ║      ╚══╝╚══╝ ╚══════╝╚═════╝       ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝  ║
  ║                                                                  ║
  ║   Веб-интерфейс. Запуск Docker (postgres, backend, web, agent)... ║
  ║                                                                  ║
  ╠══════════════════════════════════════════════════════════════════╣
  ║  Ссылки (откроются после готовности):                            ║
  ║    Дашборд  →  ${WEB_URL.padEnd(42)}║
  ║    Swagger  →  ${DOCS_URL.padEnd(42)}║
  ║    API      →  ${API_URL.padEnd(42)}║
  ╚══════════════════════════════════════════════════════════════════╝
`;

async function waitForBackend() {
  const start = Date.now();
  while (Date.now() - start < WAIT_READY_TIMEOUT_MS) {
    try {
      const res = await fetch(new URL('/ready', API_URL), {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, WAIT_READY_INTERVAL_MS));
  }
  return false;
}

function openUrl(url) {
  const plat = process.platform;
  const cmd = plat === 'darwin' ? 'open' : plat === 'win32' ? 'start' : 'xdg-open';
  spawn(cmd, [url], { stdio: 'ignore', detached: true }).unref();
}

function main() {
  console.log(banner);
  const docker = spawn('docker', ['compose', 'up', '-d', '--build'], {
    cwd: root,
    stdio: 'inherit',
  });
  docker.on('exit', async (code) => {
    if (code !== 0) {
      console.error(
        '\nОшибка Docker. Убедитесь что Docker запущен и есть docker-compose.yml.\n'
      );
      process.exit(code);
    }
    console.log('\n  Стек поднят. Ждём готовности backend...\n');
    const ok = await waitForBackend();
    if (ok) {
      console.log('  Backend готов. Открываю браузер...\n');
      openUrl(WEB_URL);
    } else {
      console.log('  Таймаут ожидания backend. Открываю браузер (страница может быть пустой).\n');
      openUrl(WEB_URL);
    }
  });
}

main();
