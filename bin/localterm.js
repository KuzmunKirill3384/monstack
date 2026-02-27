#!/usr/bin/env node
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = path.resolve(__dirname, '..');

const API_URL = process.env.API_URL || 'http://localhost:3000';
const WEB_URL = 'http://localhost:3001';
const DOCS_URL = 'http://localhost:3000/api/docs';

const banner = `
  ╔══════════════════════════════════════════════════════════════════╗
  ║                                                                  ║
  ║   ███╗   ███╗ ██████╗ ███╗   ██╗██╗████████╗ ██████╗ ██████╗    ║
  ║   ████╗ ████║██╔═══██╗████╗  ██║██║╚══██╔══╝██╔═══██╗██╔══██╗   ║
  ║   ██╔████╔██║██║   ██║██╔██╗ ██║██║   ██║   ██║   ██║██████╔╝   ║
  ║   ██║╚██╔╝██║██║   ██║██║╚██╗██║██║   ██║   ██║   ██║██╔══██╗   ║
  ║   ██║ ╚═╝ ██║╚██████╔╝██║ ╚████║██║   ██║   ╚██████╔╝██║  ██║   ║
  ║   ╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝   ║
  ║                                                                  ║
  ║   Терминальный мониторинг (htop-like). Обновление раз в 1 сек.   ║
  ║                                                                  ║
  ╠══════════════════════════════════════════════════════════════════╣
  ║  Ссылки (нужен запущенный backend: make up):                     ║
  ║    Web-интерфейс   →  ${WEB_URL.padEnd(42)}║
  ║    API / Swagger   →  ${DOCS_URL.padEnd(42)}║
  ║    API (данные)    →  ${API_URL.padEnd(42)}║
  ╠══════════════════════════════════════════════════════════════════╣
  ║  Клавиши: s — сортировка  S — направление  r — обновить          ║
  ║           f — фильтр      h — другой хост  q — выход             ║
  ╚══════════════════════════════════════════════════════════════════╝
`;

function main() {
  console.log(banner);
  console.log('  Запуск TUI через 2 сек...\n');
  setTimeout(() => {
    const tuiPath = path.join(root, 'tools', 'term', 'tui.js');
    const child = spawn(process.execPath, [tuiPath], {
    cwd: path.join(root, 'tools', 'term'),
    stdio: 'inherit',
    env: { ...process.env, API_URL },
  });
  child.on('exit', (code) => process.exit(code ?? 0));
  }, 2000);
}

main();
