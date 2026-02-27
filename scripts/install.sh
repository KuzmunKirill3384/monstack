#!/usr/bin/env bash
# Установка всех зависимостей проекта. Запуск: ./scripts/install.sh или make install

set -e
cd "$(dirname "$0")/.."

echo "=== Monitoring Stack: установка зависимостей ==="

if ! command -v node >/dev/null 2>&1; then
  echo "Нужен Node.js. Установите: https://nodejs.org или nvm"
  exit 1
fi

echo ""
echo ">> backend"
(cd backend && npm install && npx prisma generate)

echo ""
echo ">> web"
(cd web && npm install)

echo ""
echo ">> tools/term (терминальный TUI)"
(cd tools/term && npm install)

echo ""
echo ">> tools/term-c (опционально, быстрый TUI на C)"
if (cd tools/term-c 2>/dev/null && make 2>/dev/null); then
  echo "    Собран: tools/term-c/monterm"
else
  echo "    Пропущен (нужны: gcc, ncurses, libcurl). Ubuntu: sudo apt install build-essential libncurses-dev libcurl4-openssl-dev"
fi

echo ""
(cd "$(dirname "$0")/.." && npm link 2>/dev/null) && echo "Команды localterm и webterm добавлены в PATH" || true
echo ""
echo "=== Готово ==="
echo "  localterm  — терминальный TUI (сначала: make up)"
echo "  webterm    — поднять Docker и открыть веб в браузере"
echo "  make up    — только поднять стек"
echo "  Backend: http://localhost:3000   Web: http://localhost:3001"
