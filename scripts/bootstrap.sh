#!/usr/bin/env bash
# One-shot установка Monitoring Stack: ОС, Docker, Node, npm-зависимости, docker compose up, check.
# curl -fsSL https://raw.githubusercontent.com/KuzmunKirill3384/monstack/main/scripts/bootstrap.sh | bash
# или: git clone ... && cd monstack && ./scripts/bootstrap.sh

set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")/.." && pwd)"
cd "$ROOT"

SKIP_DOCKER=false
SKIP_NODE=false
SKIP_UP=false
DEV=false
YES=false

for arg in "$@"; do
  case "$arg" in
    --yes|-y) YES=true ;;
    --skip-docker) SKIP_DOCKER=true ;;
    --skip-node) SKIP_NODE=true ;;
    --skip-up) SKIP_UP=true ;;
    --dev) DEV=true ;;
  esac
done

maybe_sudo() {
  if command -v sudo >/dev/null 2>&1 && [[ "$(id -u)" -ne 0 ]]; then
    sudo "$@"
  else
    "$@"
  fi
}

# --- Определение ОС (debian-like: Ubuntu, Debian, Kali, Mint, Pop, etc.) ---
OS=""
if [[ "$OSTYPE" == "darwin"* ]]; then
  OS="macos"
elif [[ -f /etc/os-release ]]; then
  . /etc/os-release
  ID="${ID:-}"
  ID_LIKE="${ID_LIKE:-}"
  if [[ "$ID" == "ubuntu" || "$ID" == "debian" || "$ID" == "kali" || \
        "$ID" == "linuxmint" || "$ID" == "pop" ]]; then
    OS="debian"
  elif [[ "$ID_LIKE" == *debian* || "$ID_LIKE" == *ubuntu* ]]; then
    OS="debian"
  elif [[ "$ID" == "fedora" || "$ID" == "rhel" || "$ID" == "centos" ]]; then
    OS="fedora"
  elif [[ "$ID_LIKE" == *rhel* || "$ID_LIKE" == *fedora* ]]; then
    OS="fedora"
  else
    OS="linux"
  fi
else
  OS="linux"
fi

echo "[bootstrap] Monitoring Stack — one-shot установка (OS: $OS)"
echo ""

# --- Системные пакеты (debian-like) ---
install_system_debian() {
  local pkgs=()
  command -v make >/dev/null 2>&1 || pkgs+=(build-essential)
  command -v gcc >/dev/null 2>&1 || pkgs+=(build-essential)
  dpkg-query -W -f='${Status}' libncurses-dev 2>/dev/null | grep -q "install ok" || pkgs+=(libncurses-dev)
  dpkg-query -W -f='${Status}' libcurl4-openssl-dev 2>/dev/null | grep -q "install ok" || pkgs+=(libcurl4-openssl-dev)
  dpkg-query -W -f='${Status}' ca-certificates 2>/dev/null | grep -q "install ok" || pkgs+=(ca-certificates)
  command -v curl >/dev/null 2>&1 || pkgs+=(curl)
  command -v gnupg >/dev/null 2>&1 || pkgs+=(gnupg)
  if [[ ${#pkgs[@]} -gt 0 ]]; then
    echo "[bootstrap] Установка системных пакетов: ${pkgs[*]}"
    maybe_sudo apt-get update -qq
    maybe_sudo apt-get install -y "${pkgs[@]}"
  fi
}

# --- Docker (debian-like): официальный скрипт или docker.io + docker-compose ---
install_docker_debian() {
  if docker info >/dev/null 2>&1; then
    echo "[bootstrap] Docker уже доступен"
    return 0
  fi
  if command -v docker >/dev/null 2>&1; then
    if ! docker info >/dev/null 2>&1; then
      echo "[bootstrap] Docker установлен, но нет доступа к сокету. Добавляем пользователя в группу docker..."
      maybe_sudo usermod -aG docker "${SUDO_USER:-$USER}" 2>/dev/null || true
      if command -v systemctl >/dev/null 2>&1; then
        maybe_sudo systemctl start docker 2>/dev/null || true
        maybe_sudo systemctl enable docker 2>/dev/null || true
      fi
      echo "[bootstrap] Выполните: newgrp docker   или перелогиньтесь, затем снова: make up"
      return 0
    fi
    return 0
  fi
  echo "[bootstrap] Установка Docker..."
  maybe_sudo apt-get update -qq
  maybe_sudo apt-get install -y ca-certificates curl gnupg
  if curl -fsSL https://get.docker.com | maybe_sudo sh; then
    maybe_sudo usermod -aG docker "${SUDO_USER:-$USER}" 2>/dev/null || true
    if command -v systemctl >/dev/null 2>&1; then
      maybe_sudo systemctl start docker 2>/dev/null || true
      maybe_sudo systemctl enable docker 2>/dev/null || true
    fi
  else
    echo "[bootstrap] Официальный скрипт не сработал. Пробуем docker.io + docker-compose..."
    maybe_sudo apt-get install -y docker.io docker-compose
  fi
  if ! docker info >/dev/null 2>&1 && ! maybe_sudo docker info >/dev/null 2>&1; then
    echo "[bootstrap] После установки выполните: newgrp docker   или перезайдите в систему, затем make up"
  fi
}

# --- Docker Compose: проверка plugin или v1 ---
docker_compose_cmd() {
  if docker compose version >/dev/null 2>&1; then
    echo "docker compose"
  elif command -v docker-compose >/dev/null 2>&1; then
    echo "docker-compose"
  else
    echo ""
  fi
}

# --- Node.js (debian-like): NodeSource 20.x ---
install_node_debian() {
  if command -v node >/dev/null 2>&1; then
    local ver
    ver=$(node -v | sed 's/v//' | cut -d. -f1)
    if [[ "${ver:-0}" -ge 18 ]]; then
      echo "[bootstrap] Node.js уже есть: $(node -v)"
      return 0
    fi
  fi
  echo "[bootstrap] Установка Node.js 20.x (NodeSource)..."
  maybe_sudo apt-get update -qq
  maybe_sudo apt-get install -y ca-certificates curl gnupg
  curl -fsSL https://deb.nodesource.com/setup_20.x | maybe_sudo -E bash -
  maybe_sudo apt-get install -y nodejs
}

# --- macOS ---
install_system_macos() {
  if ! command -v brew >/dev/null 2>&1; then
    echo "[bootstrap] Установите Homebrew: https://brew.sh"
    return 1
  fi
  local pkgs=()
  command -v docker >/dev/null 2>&1 || pkgs+=(docker)
  command -v make >/dev/null 2>&1 || pkgs+=(make)
  command -v node >/dev/null 2>&1 || pkgs+=(node)
  command -v gcc >/dev/null 2>&1 || pkgs+=(gcc) || true
  brew list ncurses >/dev/null 2>&1 || pkgs+=(ncurses)
  [[ ${#pkgs[@]} -gt 0 ]] && brew install "${pkgs[@]}"
}

# --- Основной ход ---
if [[ "$OS" == "debian" ]]; then
  if ! $SKIP_DOCKER; then
    install_system_debian
    install_docker_debian
  fi
  if ! $SKIP_NODE; then
    install_node_debian
  fi
elif [[ "$OS" == "macos" ]]; then
  if ! $SKIP_DOCKER || ! $SKIP_NODE; then
    install_system_macos
  fi
elif [[ "$OS" == "fedora" ]]; then
  if ! $SKIP_DOCKER; then
    command -v docker >/dev/null 2>&1 || { maybe_sudo dnf install -y docker; maybe_sudo systemctl start docker; maybe_sudo usermod -aG docker "${SUDO_USER:-$USER}"; }
  fi
  if ! $SKIP_NODE; then
    command -v node >/dev/null 2>&1 || maybe_sudo dnf install -y nodejs
  fi
  command -v make >/dev/null 2>&1 || maybe_sudo dnf install -y make gcc
else
  echo "[bootstrap] Автоустановка для этой ОС не предусмотрена. Установите вручную: Docker, Node.js 18+, Make."
  echo "  Затем: ./scripts/install.sh && make up"
  if ! command -v node >/dev/null 2>&1 || ! command -v docker >/dev/null 2>&1; then
    exit 1
  fi
fi

if ! command -v node >/dev/null 2>&1; then
  echo "[bootstrap] Ошибка: Node.js не найден. Установите Node.js 18+ и повторите."
  exit 1
fi

echo ""
echo "[bootstrap] npm-зависимости..."
bash "$ROOT/scripts/install.sh"
echo ""

if ! $SKIP_UP; then
  COMPOSE=$(docker_compose_cmd)
  if [[ -n "$COMPOSE" ]]; then
    if docker info >/dev/null 2>&1; then
      echo "[bootstrap] Запуск стека: $COMPOSE up -d"
      $COMPOSE up -d --build 2>/dev/null || maybe_sudo $COMPOSE up -d --build
    else
      echo "[bootstrap] Docker недоступен без sudo. Выполните: newgrp docker   затем: make up"
    fi
  else
    echo "[bootstrap] docker compose не найден. Установите Docker Compose и выполните: make up"
  fi
fi

echo ""
if ! $SKIP_UP; then
  echo "[bootstrap] Ожидание готовности сервисов (до 60 с)..."
  for i in $(seq 1 30); do
    if curl -sf --max-time 3 "http://localhost:3000/ready" >/dev/null 2>&1; then
      break
    fi
    sleep 2
  done
  bash "$ROOT/scripts/check-stack.sh" 2>/dev/null || true
fi

echo ""
echo "=== Готово ==="
echo "  make localterm   — TUI (из корня репо)"
echo "  make webterm     — открыть веб"
echo "  make up / make down — стек"
echo "  Backend: http://localhost:3000   Web: http://localhost:3001"
echo "  Документация: docs/README.md"
