#!/usr/bin/env bash
# Проверка установленных зависимостей проекта.
# Usage: ./scripts/check-deps.sh
# Exit: 0 — всё есть, 1 — чего-то не хватает

set -e
cd "$(dirname "$0")/.."

OK=0
FAIL=0

check() {
  local name="$1"
  local cond="$2"
  local hint="${3:-}"
  if eval "$cond" 2>/dev/null; then
    echo "OK   $name"
    OK=$((OK + 1))
    return 0
  else
    echo "FAIL $name${hint:+ — $hint}"
    FAIL=$((FAIL + 1))
    return 1
  fi
}

echo "=== Monitoring Stack: проверка зависимостей ==="
echo ""

echo ">> Обязательные"
check "node" "command -v node >/dev/null" "apt install nodejs  или  https://nodejs.org"
NODE_VER=0
if command -v node >/dev/null 2>&1; then
  NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
  if [[ "$NODE_VER" -lt 18 ]]; then
    echo "     (версия $(node -v), нужна 18+)"
  fi
fi
check "npm" "command -v npm >/dev/null" "идёт с Node.js"
check "docker" "command -v docker >/dev/null" "Ubuntu/Debian/Kali: apt install docker.io  или  curl -fsSL https://get.docker.com | sh"
check "docker-socket" "docker info >/dev/null 2>&1" "sudo usermod -aG docker \$USER; затем newgrp docker или перелогиньтесь"
check "docker-compose" "docker compose version >/dev/null 2>&1 || command -v docker-compose >/dev/null 2>&1" "Ubuntu/Debian/Kali: apt install docker-compose  или установите Docker Compose plugin"
check "make" "command -v make >/dev/null" "Ubuntu/Debian/Kali: apt install build-essential"

echo ""
echo ">> Опционально (C TUI)"
check "gcc" "command -v gcc >/dev/null" "apt install build-essential"
if [[ "$(uname -s)" == "Darwin" ]]; then
  check "ncurses" "brew list ncurses >/dev/null 2>&1" "brew install ncurses"
else
  check "ncurses" "dpkg-query -W -f='\${Status}' libncurses-dev 2>/dev/null | grep -q 'install ok' || pkg-config --exists ncurses 2>/dev/null" "Ubuntu/Debian/Kali: sudo apt install libncurses-dev"
  check "libcurl" "dpkg-query -W -f='\${Status}' libcurl4-openssl-dev 2>/dev/null | grep -q 'install ok' || pkg-config --exists libcurl 2>/dev/null" "Ubuntu/Debian/Kali: sudo apt install libcurl4-openssl-dev"
fi

echo ""
echo ">> npm-пакеты (в репо)"
check "backend/node_modules" "test -d backend/node_modules" "make install"
check "web/node_modules" "test -d web/node_modules" "make install"
check "tools/term/node_modules" "test -d tools/term/node_modules" "make install"

echo ""
echo "=== Итого: $OK OK, $FAIL FAIL ==="
if [[ $FAIL -gt 0 ]]; then
  echo "Установите недостающее: make install  или  ./scripts/install-all.sh"
  exit 1
fi
echo "Готово. Запуск: make up  →  make localterm / make term"
exit 0
