#!/usr/bin/env bash
# Установка всех зависимостей проекта: Node.js, Docker, Make, системные пакеты (ncurses, curl), npm-пакеты.
# Запуск: ./scripts/install-all.sh   или   ./scripts/install-all.sh --skip-system
#
# --skip-system  — не устанавливать системные пакеты (Node, Docker, Make, ncurses, curl), только npm
# --yes, -y      — не спрашивать подтверждение при установке системных пакетов

set -e
cd "$(dirname "$0")/.."
ROOT="$(pwd)"

SKIP_SYSTEM=false
YES=false
for arg in "$@"; do
  case "$arg" in
    --skip-system) SKIP_SYSTEM=true ;;
    --yes|-y) YES=true ;;
  esac
done

echo "=== Monitoring Stack: полная установка зависимостей ==="

# --- Определение ОС ---
OS=""
if [[ "$OSTYPE" == "darwin"* ]]; then
  OS="macos"
elif [[ -f /etc/os-release ]]; then
  . /etc/os-release
  case "${ID:-}" in
    ubuntu|debian) OS="ubuntu" ;;
    fedora|rhel|centos) OS="fedora" ;;
    *) OS="linux" ;;
  esac
else
  OS="linux"
fi

maybe_sudo() {
  if command -v sudo >/dev/null 2>&1 && [[ "$(id -u)" -ne 0 ]]; then
    sudo "$@"
  else
    "$@"
  fi
}

pkg_installed_deb() {
  dpkg-query -W -f='${Status}' "$1" 2>/dev/null | grep -q "install ok installed"
}

install_system_ubuntu() {
  local pkgs=()
  command -v docker >/dev/null 2>&1 || pkgs+=(docker.io)
  # docker-compose (v1) — в universe; docker-compose-plugin — только из Docker repo
  (docker compose version >/dev/null 2>&1 || command -v docker-compose >/dev/null 2>&1) || pkgs+=(docker-compose)
  command -v make >/dev/null 2>&1 || pkgs+=(build-essential)
  command -v gcc >/dev/null 2>&1 || pkgs+=(build-essential)
  pkg_installed_deb libncurses-dev || pkgs+=(libncurses-dev)
  pkg_installed_deb libcurl4-openssl-dev || pkgs+=(libcurl4-openssl-dev)
  if [[ ${#pkgs[@]} -eq 0 ]]; then
    return 0
  fi
  maybe_sudo apt-get update -qq
  maybe_sudo apt-get install -y "${pkgs[@]}"
}

install_node_ubuntu() {
  if command -v node >/dev/null 2>&1; then
    return 0
  fi
  echo ">> Установка Node.js (NodeSource 20.x)..."
  maybe_sudo apt-get update -qq
  maybe_sudo apt-get install -y ca-certificates curl gnupg
  curl -fsSL https://deb.nodesource.com/setup_20.x | maybe_sudo -E bash -
  maybe_sudo apt-get install -y nodejs
}

install_system_macos() {
  if ! command -v brew >/dev/null 2>&1; then
    echo "Нужен Homebrew. Установите: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    return 1
  fi
  local pkgs=()
  command -v node >/dev/null 2>&1 || pkgs+=(node)
  command -v docker >/dev/null 2>&1 || pkgs+=(docker)
  command -v make >/dev/null 2>&1 || pkgs+=(make)
  command -v gcc >/dev/null 2>&1 || pkgs+=(gcc) # Xcode / Command Line Tools обычно есть
  brew list ncurses >/dev/null 2>&1 || pkgs+=(ncurses)
  command -v curl >/dev/null 2>&1 || pkgs+=(curl)
  [[ ${#pkgs[@]} -gt 0 ]] && brew install "${pkgs[@]}"
}

install_system_fedora() {
  local pkgs=()
  command -v node >/dev/null 2>&1 || pkgs+=(nodejs npm)
  command -v docker >/dev/null 2>&1 || pkgs+=(docker)
  command -v make >/dev/null 2>&1 || pkgs+=(make gcc)
  command -v gcc >/dev/null 2>&1 || pkgs+=(gcc)
  rpm -q ncurses-devel >/dev/null 2>&1 || pkgs+=(ncurses-devel)
  rpm -q libcurl-devel >/dev/null 2>&1 || pkgs+=(libcurl-devel)
  if [[ ${#pkgs[@]} -gt 0 ]]; then
    maybe_sudo dnf install -y "${pkgs[@]}"
  fi
}

# --- Установка системных пакетов ---
if ! $SKIP_SYSTEM; then
  echo ""
  echo ">> Системные пакеты ($OS)"
  case "$OS" in
    ubuntu)
      install_node_ubuntu
      install_system_ubuntu
      ;;
    macos)
      install_system_macos
      ;;
    fedora)
      install_system_fedora
      ;;
    *)
      echo "    Автоустановка для $OS не поддерживается. Установите вручную:"
      echo "    Node.js, Docker, Make, gcc, ncurses, libcurl"
      echo "    Затем запустите: ./scripts/install-all.sh --skip-system"
      ;;
  esac
else
  echo ""
  echo ">> Пропуск системных пакетов (--skip-system)"
fi

# --- Проверка Node.js ---
if ! command -v node >/dev/null 2>&1; then
  echo "Ошибка: Node.js не найден. Установите: https://nodejs.org или nvm"
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [[ "$NODE_VERSION" -lt 18 ]]; then
  echo "Предупреждение: нужен Node.js 18+. Текущая: $(node -v)"
fi

# --- npm-пакеты ---
echo ""
echo ">> backend"
(cd backend && npm install && DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/monitoring}" npx prisma generate)
echo ">> backend OK"

echo ""
echo ">> web"
(cd web && npm install)
echo ">> web OK"

echo ""
echo ">> tools/term"
(cd tools/term && npm install)
echo ">> tools/term OK"

# --- term-c ---
echo ""
echo ">> tools/term-c"
if (cd tools/term-c 2>/dev/null && make 2>/dev/null); then
  echo ">> tools/term-c OK (monterm собран)"
else
  echo ">> tools/term-c пропущен (нужны: gcc, ncurses, libcurl)"
  echo "   Ubuntu: sudo apt install build-essential libncurses-dev libcurl4-openssl-dev"
  echo "   macOS:  brew install ncurses (curl обычно есть)"
fi

# --- npm link ---
echo ""
(cd "$ROOT" && npm link 2>/dev/null) && echo "Команды localterm и webterm добавлены в PATH" || true

echo ""
echo "=== Готово ==="
echo "  make up     — поднять стек (Docker)"
echo "  localterm   — терминальный TUI"
echo "  webterm     — поднять Docker и открыть веб"
echo "  make term   — Node TUI   |   make term-c  — C TUI"
echo "  Backend: http://localhost:3000   Web: http://localhost:3001"
