# Установка

В документе описаны системные требования, зависимости и способы установки Monstack.

---

## 1. Системные требования

| Требование | Минимум |
|------------|---------|
| ОС | Linux (агент читает `/proc`; бэкенд/веб/TUI можно запускать на Linux или macOS для разработки) |
| Docker | 20.x+ с Compose v2 (например `docker compose`) |
| Node.js | 20 LTS или новее (для бэкенда, веба, Node TUI) |
| Go | 1.22+ (для агента и monstack-cli; опционально при использовании только образов) |
| Память | 512 MB для postgres; 256 MB для backend и web; 64 MB для agent |
| Диск | ~500 MB для образов и артефактов сборки; плюс место под БД (см. retention) |

**Для C TUI:** gcc, ncurses, libcurl (например Ubuntu: `build-essential libncurses-dev libcurl4-openssl-dev`; macOS: `ncurses` и `curl` через Homebrew).

---

## 2. Зависимости

- **Бэкенд:** Node.js, npm; Prisma CLI; PostgreSQL (или через Docker).
- **Веб:** Node.js, npm.
- **Агент:** Go 1.22+ (или образ Docker).
- **Node TUI:** Node.js, npm (blessed и др. в `tools/term`).
- **CLI:** Go 1.22+ (для `monstack-cli up`).

---

## 3. Установка из исходников

### 3.1 Клонирование

```bash
git clone https://github.com/KuzmunKirill3384/monstack.git ~/monstack
cd ~/monstack
```

Рекомендуется путь без root и без спецсимволов (например `~/projects/monstack`). Не клонировать в `/tmp` (временный каталог) и в системные директории.

### 3.2 Минимальный путь (только Docker + Node)

Без Go. Запуск стека и использование веба или Node TUI:

```bash
make install-docker-only   # то же, что make up
# или: make install, затем make up
make check                 # проверка backend и web
```

Далее открыть http://localhost:3001 или выполнить `make localterm` / `make webterm`.

### 3.3 Полная установка (бэкенд, веб, TUI, опционально CLI/агент)

```bash
make install    # npm install в backend, web, tools/term; npm link для localterm/webterm
make up         # docker compose up (postgres, backend, web, agent)
make check
```

Опционально сборка Go CLI и агента локально:

```bash
make cli-build  # сборка ./bin/monstack-cli
# Агент: cd agent && go build -o monagent ./cmd/agent
```

### 3.4 Однокомандный запуск (с Go)

```bash
make up-one     # сборка CLI при отсутствии, создание .env при необходимости, запуск ./bin/monstack-cli up
```

Поднимается полный стек, включая агент в контейнере. Далее: `make localterm`, `make webterm` или http://localhost:3001.

### 3.5 Bootstrap-скрипт (Linux/macOS)

На поддерживаемых системах (Ubuntu, Debian, Kali, Fedora, macOS):

```bash
curl -fsSL https://raw.githubusercontent.com/KuzmunKirill3384/monstack/main/scripts/bootstrap.sh | bash
```

Опции: `--yes`, `--skip-docker`, `--skip-node`, `--skip-up`. Каталог установки можно задать через `INSTALL_DIR=/путь`.

---

## 4. Docker

Используется Docker Compose для основного стека.

- **Файл:** `docker-compose.yml` (сервисы postgres, backend, web, agent).
- **Override для TimescaleDB:** `docker-compose.timescale.yml` (подключение через `-f` или скрипт `scripts/enable-timescale.sh`).

Порты: Postgres 5432, Backend 3000, Web 3001 (проброс из контейнера 3000).

Агент запускается с `pid: host`, чтобы собирать процессы хоста при запуске стека на той же машине. Для удалённых хостов нужно запускать бинарник агента на каждом хосте и указывать SERVER_URL на ваш бэкенд.

---

## 5. Переменные окружения

При необходимости скопировать и отредактировать env:

```bash
cp .env.example .env
```

Для бэкенда обязателен `DATABASE_URL`. В продакшене задать `JWT_SECRET`, рассмотреть `AUTH_ENABLED=true`. См. [CONFIGURATION.md](CONFIGURATION.md).

---

## 6. Устранение неполадок

- **Docker не найден:** установить Docker Engine и Docker Compose v2. См. [TROUBLESHOOTING.md](TROUBLESHOOTING.md).
- **Порт занят:** изменить порты в compose или остановить конфликтующие сервисы.
- **Бэкенд unhealthy:** проверить `docker compose logs backend` и доступность postgres; проверить `DATABASE_URL`.
- **Нет хостов в UI:** хосты появляются после хотя бы одного успешного ingest; подождать 10–30 с после `make up`, проверить логи агента и бэкенда.
- **Ошибки Prisma:** выполнить `cd backend && npx prisma generate`; для миграций — `npx prisma migrate deploy` (или `migrate dev` в разработке).

Подробнее: [TROUBLESHOOTING.md](TROUBLESHOOTING.md).
