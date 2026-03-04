# Архитектура

В документе описана архитектура Monstack: компоненты, поток данных, зависимости и масштабирование.

---

## 1. Общая схема

```
                    +------------------+
                    |  Web (Next.js)   |
                    |   порт 3001      |
                    +--------+---------+
                             |
                             | HTTP GET (hosts, metrics, processes, alerts)
                             v
+--------+   POST /v1/ingest  +------------------+    Prisma     +------------+
| Agent  | ------------------>| Backend (NestJS) |<------------->| PostgreSQL |
| (Go)   |   Bearer token     |   порт 3000      |               | порт 5432  |
+--------+                    +--------+---------+                +------------+
     ^                                |
     | чтение /proc                   | HTTP GET (как у Web)
     |                                v
+--------+                    +------------------+
|  TUI   |                    |  Опционально:    |
|(Node/C)|                    |  TimescaleDB    |
+--------+                    +------------------+
```

- **Агент:** работает на мониторируемых хостах (Linux). Читает `/proc`, формирует JSON-батчи, сжимает gzip, отправляет POST на бэкенд. Идентификация по Bearer-токену хоста (SHA256 хранится в БД как `Host.tokenHash`).
- **Бэкенд:** одно приложение NestJS на Fastify. Обрабатывает ingest, REST API для хостов/метрик/процессов/алертов, авторизацию (JWT при `AUTH_ENABLED=true`), rate limit, health/ready.
- **PostgreSQL:** постоянное хранилище для хостов, metrics_raw, proc_snapshots, alert_rules, alert_events, users. Опционально образ TimescaleDB для оптимизации временных рядов.
- **Веб:** SPA на Next.js; обращается к API бэкенда; дашборд, детализация хоста, алерты, настройки.
- **TUI:** клиенты на Node (blessed) и C (ncurses); тот же read API, что и веб.

---

## 2. Компоненты

### 2.1 Агент (Go)

- **Путь:** `agent/`
- **Точка входа:** `agent/cmd/agent/main.go`
- **Назначение:** сбор OS-метрик и снимков процессов; отправка на бэкенд с настраиваемым интервалом.
- **Конфиг:** YAML (server_url, host_id, host_token, metrics_interval_sec, process_interval_sec и др.).
- **Отправка:** `POST /v1/ingest` с `Authorization: Bearer <host_token>`, тело — JSON (опционально gzip). Бэкенд определяет хост по хешу токена и host_id в теле.

### 2.2 Бэкенд (NestJS)

- **Путь:** `backend/`
- **Точка входа:** `backend/src/main.ts` (Fastify, без глобального префикса; Swagger на `/api/docs`).
- **Модули:** Auth (login, logout, me, change-password); Ingest (POST /v1/ingest); Hosts (GET, signal); Metrics (GET с resolution); Processes (GET); Alerts (события, правила, cron, stream).
- **БД:** Prisma + PostgreSQL. Миграции в `backend/prisma/migrations`.

### 2.3 Веб (Next.js)

- **Путь:** `web/`
- **Страницы:** логин, хосты, детализация хоста (метрики и процессы), дашборды, алерты, правила алертов, настройки.
- **Клиент API:** fetch к `NEXT_PUBLIC_API_URL` с `credentials: 'include'`. React Query для данных и повторов.

### 2.4 TUI (Node и C)

- **Node:** `tools/term/` — интерфейс на blessed; экраны: хосты, процессы, метрики, алерты, правила.
- **C:** `tools/term-c/` — ncurses + libcurl; 4 экрана; обновление 500 ms.

### 2.5 CLI (Go)

- **Путь:** `monstack-cli/`
- **Команда:** `monstack-cli up` — проверка/создание `.env`, запуск docker compose. Используется в `make up-one`.

---

## 3. Поток данных

### Ingest (Агент → Бэкенд → БД)

1. Агент читает `/proc` (stat, meminfo, loadavg, net/dev, statvfs, список процессов).
2. Формирует батч: host_id, ts, объект metrics, массив processes.
3. Сжимает тело gzip, отправляет POST на SERVER_URL/v1/ingest с Authorization: Bearer HOST_TOKEN.
4. Бэкенд: проверяет токен (совпадение хеша с Host), проверяет host_id, пишет в metrics_raw и proc_snapshots, обновляет Host.lastSeenAt.

### Чтение (Веб/TUI → Бэкенд → БД)

1. Клиент выполняет GET к /hosts, /metrics, /processes, /alerts, /alert-rules (при необходимости с cookie авторизации).
2. Бэкенд применяет опциональный JWT guard, запрашивает БД через Prisma, возвращает JSON.

### Алерты

1. Правила хранятся в alert_rules (host_id, metric, op, threshold, window, enabled).
2. Крон (AlertsCronService) периодически проверяет правила; при нарушении создаёт записи в alert_events.
3. Клиенты опрашивают API или подписываются на /alerts/stream (SSE).

---

## 4. Зависимости

| Уровень | Зависит от |
|---------|------------|
| Агент | Только конфиг; HTTP к бэкенду. |
| Бэкенд | PostgreSQL (должен быть запущен); env: DATABASE_URL, JWT_SECRET и др. |
| Веб | Бэкенд (NEXT_PUBLIC_API_URL). |
| TUI | Бэкенд (API_URL). |
| Docker Compose | postgres → backend → web, agent; healthcheck бэкенда перед агентом. |

---

## 5. Масштабируемость и ограничения

- **Целевой масштаб:** небольшие и средние инсталляции (порядка 1–50 хостов на один инстанс бэкенда).
- **Узкие места:** один процесс бэкенда; объём записи в БД (метрики и процессы); политики retention.
- **Масштабирование:** горизонтальное масштабирование бэкенда потребует общей БД и отсутствия локального состояния; rate limit применяется к инстансу.
- **Лимиты:** размер тела ingest (например 1 MB); лимиты запросов на /v1/ingest и на GET (настраиваются через env).

---

## 6. Безопасность

- **Ingest:** аутентификация только по токену хоста; личность пользователя не используется. Токен должен храниться в секрете; в БД хранится только хеш.
- **Read API:** при `AUTH_ENABLED=true` требуется аутентификация пользователя (логин); JWT в HttpOnly cookie.
- **Сеть:** бэкенд слушает на 0.0.0.0; в продакшене рекомендуется TLS и ограничение доступа (обратный прокси, файрвол).

Подробнее: [SECURITY.md](SECURITY.md).
