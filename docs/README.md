# Документация Monitoring Stack

Полная документация по архитектуре, API, эксплуатации и разработке.

---

## Quick Start (одна команда)

Поддерживаются: Ubuntu, Debian, Kali, Mint, Pop!_OS, Fedora, macOS.

```bash
curl -fsSL https://raw.githubusercontent.com/KuzmunKirill3384/monstack/main/scripts/bootstrap.sh | bash
```

При установке через curl репозиторий клонируется в `$HOME/monstack` (можно изменить через `INSTALL_DIR=/путь/куда/клонировать`).

Или: `git clone ... && cd monstack && ./scripts/bootstrap.sh`. Флаги: `--yes`, `--skip-docker`, `--skip-node`, `--skip-up`.

---

## Оглавление

### Начало работы

| Документ | Описание |
|----------|----------|
| [Демо-сценарий](demo-scenario.md) | Быстрый запуск стека, проверка готовности, первый хост и правило алерта |
| [Деплой](deploy/README.md) | Примеры nginx, systemd; развёртывание в продакшене |

### Архитектура и проектирование

| Документ | Описание |
|----------|----------|
| [Внутренняя архитектура](ARCHITECTURE.md) | Уровни системы (Web/TUI → Backend → DB), поток данных, модули backend, зависимости Docker |
| [Модель данных](data-model.md) | ER-схема, таблицы БД (users, hosts, metrics_raw, proc_snapshots, alert_rules, alert_events), индексы |
| [Дизайн: частоты и хранение](design.md) | Интервалы сбора метрик и процессов, retention по слоям, резолюции API (raw / 1m / 5m), jitter |
| [TimescaleDB и агрегаты](timescale-retention.md) | Варианты развития: переход на TimescaleDB, continuous aggregates, retention без TimescaleDB |
| [Диаграммы (PlantUML)](diagrams/README.md) | Генерация PNG из `docs/diagrams/*.puml` (архитектура, поток данных, Docker, жизненный цикл, структура репо) |

### API и контракты

| Документ | Описание |
|----------|----------|
| [API Contracts](api-contracts.md) | Контракты API: POST /v1/ingest (агент), POST /auth/login, GET /hosts, /metrics, /processes, /alerts, CRUD /alert-rules; примеры curl; актуальный Swagger: http://localhost:3000/api/docs |

### Эксплуатация и диагностика

| Документ | Описание |
|----------|----------|
| [Runbook](runbook.md) | Диагностика: нет хостов, нет метрик, нет процессов, алерты не срабатывают, 401, Docker; как запускать тесты; CI |

### Компоненты и роли

| Документ | Описание |
|----------|----------|
| [TUI (терминальный интерфейс)](TUI.md) | Node TUI и C TUI: экраны, клавиши, переменные окружения, проверка backend, обёртки localterm/webterm |
| [Роли и аутентификация](roles.md) | Роли admin/user, идентификация хоста по токену, JWT/cookie для пользователей |
| [Метрики ОС (Linux)](os-metrics.md) | Привязка метрик к ядру Linux: /proc/stat, /proc/meminfo, /proc/loadavg, /proc/net/dev, statvfs, процессы |

---

## Где клонировать

Рекомендуется: `~/projects/monstack` или `~/dev/monstack`. Не клонировать в `/tmp` или в системные каталоги.

## Быстрый старт (из корня репозитория)

**Одна команда (Docker уже установлен):**

```bash
make up-one      # CLI + .env + стек с агентом
make term-global # опционально: localterm и webterm в PATH
```

Дальше из любой папки: **`localterm`** или **`webterm`**.

**Полная установка (backend, web, TUI):**

```bash
make install     # зависимости + npm link (localterm/webterm в PATH)
make up          # стек в Docker (postgres, backend, web, agent)
make check       # проверка /ready и web
localterm        # или webterm (уже в PATH после install)
```

Веб: http://localhost:3001 · API: http://localhost:3000 · Swagger: http://localhost:3000/api/docs

---

## Аутентификация

При `AUTH_ENABLED=true` (переменная окружения backend) все GET-запросы к API требуют авторизации. Вход: **/login**. Пользователь из seed: **demo@test.com** / **demo**. JWT хранится в HttpOnly cookie. Подробнее: [roles.md](roles.md).

---

## Структура репозитория

| Путь | Описание |
|------|----------|
| **agent/** | Go-агент: сбор метрик и процессов, ingest (gzip), конфиг YAML, transport |
| **backend/** | NestJS + Fastify + Prisma: auth, hosts, ingest, metrics, processes, alerts |
| **web/** | Next.js: дашборд (hosts, метрики, процессы, алерты), логин при AUTH_ENABLED |
| **tools/term/** | Node TUI (blessed): 5 экранов, api.js, темы |
| **tools/term-c/** | C TUI (ncurses, libcurl): 4 экрана |
| **scripts/** | install.sh, check-stack.sh и др. |
| **deploy/** | Примеры nginx, systemd |
| **docs/** | Документация (этот каталог) |

Главная точка входа по проекту: [README.md в корне](../README.md). Разработка и тесты: [CONTRIBUTING.md](../CONTRIBUTING.md).
