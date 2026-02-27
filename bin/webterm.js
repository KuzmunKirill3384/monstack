#!/usr/bin/env node
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = path.resolve(__dirname, '..');

const WEB_URL = 'http://localhost:3001';
const API_URL = 'http://localhost:3000';
const DOCS_URL = 'http://localhost:3000/api/docs';

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
  ║   Веб-интерфейс. Запускаю Docker (postgres, backend, web, agent)...     ║
  ║                                                                  ║
  ╠══════════════════════════════════════════════════════════════════╣
  ║  Ссылки (откроются после поднятия стека):                        ║
  ║                                                                  ║
  ║    Дашборд   →  ${WEB_URL}                                        ║
  ║    Swagger   →  ${DOCS_URL}                                       ║
  ║                                                                  ║
  ╚══════════════════════════════════════════════════════════════════╝
`;

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
  docker.on('exit', (code) => {
    if (code !== 0) {
      console.error('\nОшибка запуска Docker. Убедитесь, что Docker запущен и в каталоге есть docker-compose.yml.');
      process.exit(code);
    }
    console.log('\n  Стек поднят. Открываю браузер...\n');
    setTimeout(() => openUrl(WEB_URL), 3000);
  });
}

main();
