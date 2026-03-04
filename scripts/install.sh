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
(cd backend && npm install && DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/monitoring}" npx prisma generate)

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
echo "=== Готово ==="
echo "  Из корня репо запускайте:"
echo "    make localterm   или  npm run localterm  — терминальный TUI (сначала: make up)"
echo "    make webterm     или  npm run webterm     — поднять Docker и открыть веб"
echo "  make up  — поднять стек (postgres, backend, web)"
echo "  Backend: http://localhost:3000   Web: http://localhost:3001"
echo "  Команды в PATH (опционально): npm link"
