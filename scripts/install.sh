#!/usr/bin/env bash
# Установка зависимостей. ./scripts/install.sh [--tui-only] или make install / make install-console

set -e
cd "$(dirname "$0")/.."
TUI_ONLY=false
for arg in "$@"; do
  [[ "$arg" == "--tui-only" ]] && TUI_ONLY=true
done

ROOT="$(pwd)"

if $TUI_ONLY; then
  echo "=== Установка только TUI (консоль) ==="
  echo ">> tools/term-c (C, без Node)"
  if (cd tools/term-c 2>/dev/null && make 2>/dev/null); then
    echo "    Собран: tools/term-c/monterm"
  else
    echo "    Нужны: gcc, ncurses, libcurl. Ubuntu: sudo apt install build-essential libncurses-dev libcurl4-openssl-dev"
  fi
  if command -v node >/dev/null 2>&1; then
    echo ""
    echo ">> tools/term (Node TUI)"
    (cd tools/term && npm install)
  else
    echo "    Node TUI пропущен (нет Node). C TUI готов: make term-c"
  fi
  echo ""
  echo "=== Готово (TUI) ==="
  echo "  Стек: make up   Затем: make term-c   или   make localterm"
  echo "  Корень репо: cd $ROOT"
  exit 0
fi

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
echo "  Команды make — только из корня репо. Если вы в подпапке: cd $ROOT"
echo "    make up         — поднять стек (postgres, backend, web)"
echo "    make localterm  /  npm run localterm  — TUI (после make up)"
echo "    make webterm    /  npm run webterm    — Docker + веб"
echo "  Backend: http://localhost:3000   Web: http://localhost:3001"
echo "  В PATH (опционально): npm link"
exit 0
