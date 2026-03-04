# Monstack

**Monstack** — интегрированный стек мониторинга OS-метрик: агент на Go собирает данные с хостов, бэкенд на NestJS принимает и хранит их в PostgreSQL, веб-дашборд на Next.js и терминальные клиенты отображают хосты, графики, процессы и алерты.

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](package.json)
[![Node](https://img.shields.io/badge/node-20%2B-brightgreen.svg)](package.json)
[![Go](https://img.shields.io/badge/go-1.22%2B-00ADD8.svg)](agent/go.mod)

---

## Возможности

- **Агент (Go):** сбор CPU, памяти, load, сети, диска и топ-процессов из Linux `/proc`; батчи и gzip; отправка на бэкенд через `POST /v1/ingest` с Bearer-токеном.
- **Бэкенд (NestJS + Fastify):** приём данных, реестр хостов, метрики/процессы/правила и события алертов; Prisma + PostgreSQL; опциональная JWT-авторизация; rate limiting; health и ready.
- **Веб (Next.js):** дашборд с хостами, детализация хоста (метрики и процессы), дашборды, алерты, правила алертов, настройки; логин при включённой авторизации; адаптивный интерфейс.
- **TUI:** терминальные клиенты на Node.js (blessed) и C (ncurses) для хостов, процессов, метрик и алертов.
- **CLI:** `monstack-cli up` собирает стек и агент, при отсутствии создаёт `.env`; однокомандный запуск через `make up-one`.
- **Алерты:** настраиваемые правила (метрика, оператор, порог); проверка по крону; история событий и опциональный SSE-поток.

---

## Обзор архитектуры

```mermaid
flowchart LR
  subgraph agents [Агенты]
    A[Agent Go]
  end
  subgraph backend [Бэкенд]
    B[NestJS API]
  end
  subgraph storage [Хранилище]
    DB[(PostgreSQL)]
  end
  subgraph clients [Клиенты]
    W[Web Next.js]
    T[TUI]
  end
  A -->|"POST /v1/ingest\nBearer token"| B
  B <--> DB
  W -->|"GET /hosts, /metrics\n/alerts, ..."| B
  T -->|"GET ..."| B
```

```mermaid
sequenceDiagram
  participant Agent as Агент
  participant Backend as Бэкенд
  participant DB as PostgreSQL
  participant Web as Web / TUI
  Agent->>Backend: POST /v1/ingest (метрики, процессы)
  Backend->>DB: Запись metrics_raw, proc_snapshots
  Web->>Backend: GET /hosts, /metrics, /alerts
  Backend->>DB: Чтение
  Backend->>Web: JSON
```

Поток данных: агент → бэкенд (ingest) → БД; веб/TUI → бэкенд (чтение) → БД. Хосты идентифицируются по хешу токена; пользователи (при `AUTH_ENABLED=true`) аутентифицируются по JWT в cookies.

Подробнее: [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Установка

- **Только Docker + Node:** `git clone ... && cd monstack && make install-docker-only` (или `make up`). Затем `make localterm` или `make webterm` (нужен Node.js).
- **Полная (с Go CLI):** `make install` затем `make up` или однокомандно `make up-one` (сборка CLI, создание `.env` при необходимости, запуск стека и агента).
- **Bootstrap (Ubuntu/Debian/Kali/Fedora/macOS):**  
  `curl -fsSL https://raw.githubusercontent.com/KuzmunKirill3384/monstack/main/scripts/bootstrap.sh | bash`

Требования: Docker и docker compose, Node.js 20+ (для веба и Node TUI). Для агента и CLI: Go 1.22+. См. [INSTALLATION.md](INSTALLATION.md).

---

## Быстрый старт

```bash
git clone https://github.com/KuzmunKirill3384/monstack.git ~/monstack
cd ~/monstack
make up-one
```

- **Веб:** http://localhost:3001  
- **API:** http://localhost:3000  
- **Swagger:** http://localhost:3000/api/docs  

Из корня репо: `make localterm` (Node TUI) или `make webterm` (открыть веб в браузере). Чтобы команды `localterm`/`webterm` были в PATH: `make term-global`.

---

## Использование

| Команда | Описание |
|--------|----------|
| `make up` | Запуск стека (postgres, backend, web, agent). |
| `make down` | Остановка контейнеров. |
| `make check` | Проверка готовности backend и web. |
| `make localterm` | Запуск Node TUI (экраны 1–5, Enter/s/f/r/q). |
| `make webterm` | Запуск стека и открытие веб-интерфейса. |
| `make term-c` | Сборка и запуск C TUI (ncurses + curl). |
| `make test` | Запуск тестов backend, web и term. |

Подробнее: [USAGE.md](USAGE.md).

---

## Конфигурация

Основные параметры через переменные окружения (например `.env` или docker-compose):

| Переменная | По умолчанию | Описание |
|------------|--------------|----------|
| `DATABASE_URL` | `postgresql://postgres:postgres@...` | Подключение к PostgreSQL. |
| `JWT_SECRET` | `change-me-in-production` | Секрет для подписи JWT. |
| `AUTH_ENABLED` | `false` | Требовать логин для API (seed: demo@test.com / demo). |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3000` | URL бэкенда для веба. |
| `SERVER_URL` / `HOST_ID` / `HOST_TOKEN` | (агент) | URL бэкенда и идентификация хоста для агента. |

См. [CONFIGURATION.md](CONFIGURATION.md).

---

## Скриншоты и примеры

- **Веб:** после `make up-one` откройте http://localhost:3001 — дашборд (хосты, метрики, процессы, алерты, настройки).
- **API:** интерактивная документация http://localhost:3000/api/docs (Swagger). Пример: `curl -s http://localhost:3000/hosts`.
- **TUI:** команда `make localterm` — терминальный интерфейс (экраны 1–5: хосты, процессы, метрики, алерты, правила).

---

## Документация

| Документ | Описание |
|----------|----------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Архитектура системы, компоненты, поток данных. |
| [INSTALLATION.md](INSTALLATION.md) | Требования, установка из исходников, Docker. |
| [USAGE.md](USAGE.md) | Команды, TUI, типовые сценарии. |
| [CONFIGURATION.md](CONFIGURATION.md) | Переменные окружения и конфигурационные файлы. |
| [API.md](API.md) | Справочник HTTP API и примеры. |
| [DEVELOPMENT.md](DEVELOPMENT.md) | Окружение разработчика, тесты, сборка. |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Как участвовать в разработке. |
| [SECURITY.md](SECURITY.md) | Модель безопасности и сообщение об уязвимостях. |
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | Типичные проблемы и решения. |
| [CHANGELOG.md](CHANGELOG.md) | История изменений. |
| [ROADMAP.md](ROADMAP.md) | Планы развития. |

Расширенная документация (runbook, модель данных, TUI): [docs/](docs/).

---

## Участие в разработке

Приветствуются контрибуции. Ознакомьтесь с [CONTRIBUTING.md](CONTRIBUTING.md): workflow, правила коммитов и требования к коду.

---

## Безопасность

По вопросам безопасности см. [SECURITY.md](SECURITY.md). Уязвимости не следует обсуждать в публичных issue.

---

## Лицензия

Проект распространяется под Apache License, Version 2.0. См. [LICENSE](LICENSE) и [LICENSE.md](LICENSE.md).
