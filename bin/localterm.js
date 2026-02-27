#!/usr/bin/env node
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = path.resolve(__dirname, '..');

const API_URL = process.env.API_URL || 'http://localhost:3000';
const WEB_URL = 'http://localhost:3001';
const DOCS_URL = 'http://localhost:3000/api/docs';
const DELAY_MS = Number(process.env.LOCALTERM_DELAY) ?? 1000;

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
  ║   Терминальный мониторинг (htop-like). 1-5|F1-F5 экраны.         ║
  ║                                                                  ║
  ╠══════════════════════════════════════════════════════════════════╣
  ║  Ссылки (нужен backend: make up):                                ║
  ║    Web        →  ${WEB_URL.padEnd(42)}║
  ║    Swagger    →  ${DOCS_URL.padEnd(42)}║
  ║    API        →  ${API_URL.padEnd(42)}║
  ╠══════════════════════════════════════════════════════════════════╣
  ║  Клавиши: 1-5|F1-F5 экраны  Enter выбор  s сортировка  f фильтр   ║
  ║           r обновить  q выход                                   ║
  ╚══════════════════════════════════════════════════════════════════╝
`;

async function checkReady() {
  try {
    const res = await fetch(new URL('/ready', API_URL), { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

function main() {
  console.log(banner);
  const run = async () => {
    const ok = await checkReady();
    if (!ok) {
      console.log('  Backend не готов. Запустите: make up\n');
    } else {
      console.log('  Backend OK\n');
    }
    if (DELAY_MS > 0) {
      console.log(`  Запуск TUI через ${DELAY_MS} мс...\n`);
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
    const tuiPath = path.join(root, 'tools', 'term', 'tui.js');
    const child = spawn(process.execPath, [tuiPath], {
      cwd: path.join(root, 'tools', 'term'),
      stdio: 'inherit',
      env: { ...process.env, API_URL },
    });
    child.on('exit', (code) => process.exit(code ?? 0));
  };
  run().catch(() => {
    console.log('  Запуск TUI...\n');
    const tuiPath = path.join(root, 'tools', 'term', 'tui.js');
    const child = spawn(process.execPath, [tuiPath], {
      cwd: path.join(root, 'tools', 'term'),
      stdio: 'inherit',
      env: { ...process.env, API_URL },
    });
    child.on('exit', (code) => process.exit(code ?? 0));
  });
}

main();
