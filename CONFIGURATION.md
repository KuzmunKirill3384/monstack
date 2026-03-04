# Конфигурация

В документе описана конфигурация Monstack: переменные окружения и конфигурационные файлы.

---

## 1. Переменные окружения

### Бэкенд

| Переменная | По умолчанию | Описание |
|------------|--------------|----------|
| `DATABASE_URL` | — | Строка подключения к PostgreSQL (обязательна). |
| `PORT` | 3000 | Порт HTTP. |
| `JWT_SECRET` | change-me-in-production | Секрет для подписи JWT. |
| `AUTH_ENABLED` | false | При true запросы GET требуют JWT (cookie или Bearer). |
| `PASSWORD_SALT` | salt | Соль для хеширования паролей (в продакшене изменить). |
| `COOKIE_SECRET` | monstack-cookie-secret | Секрет для подписи cookie. |
| `AGENT_COMMAND_SECRET` | dev-secret | Секрет для запросов signal (kill) к агенту. |
| `LOG_JSON` | false | При true логи в формате JSON. |
| `INGEST_RATE_LIMIT_MAX` | 120 | Макс. запросов на /v1/ingest за окно. |
| `INGEST_RATE_LIMIT_WINDOW_MS` | 60000 | Окно в мс для rate limit ingest. |
| `INGEST_RATE_LIMIT_DISABLED` | 0 | Установить 1 для отключения rate limit ingest. |
| `READ_RATE_LIMIT_MAX` | 300 | Макс. GET-запросов за окно с одного IP. |
| `READ_RATE_LIMIT_WINDOW_MS` | 60000 | Окно в мс для rate limit чтения. |
| `RETENTION_METRICS_DAYS` | 30 | Удалять метрики старше N дней. |
| `RETENTION_PROCS_DAYS` | 14 | Удалять снимки процессов старше N дней. |
| `RETENTION_ALERTS_DAYS` | 90 | Удалять события алертов старше N дней. |
| `CORS_ORIGIN` | true | CORS origin (true — отражение origin запроса). |

### Веб

| Переменная | По умолчанию | Описание |
|------------|--------------|----------|
| `NEXT_PUBLIC_API_URL` | http://localhost:3000 | Базовый URL API бэкенда. |

### Агент

| Переменная | По умолчанию | Описание |
|------------|--------------|----------|
| `SERVER_URL` | — | URL бэкенда (например http://backend:3000). |
| `HOST_ID` | — | UUID хоста (должен совпадать с записью в БД). |
| `HOST_TOKEN` | — | Токен; SHA256 должен совпадать с Host.token_hash в БД. |
| `AGENT_COMMAND_SECRET` | — | Опционально; для эндпоинта signal. |
| Конфиг-файл | — | YAML: server_url, host_id, host_token, интервалы и др. |

### Node TUI

| Переменная | По умолчанию | Описание |
|------------|--------------|----------|
| `API_URL` | http://localhost:3000 | URL бэкенда. |
| `TUI_REFRESH_MS` | 5000 | Интервал обновления. |
| `TUI_ALERTS_REFRESH_MS` | 10000 | Обновление алертов. |
| `TUI_THEME` | dark | dark / light. |
| `TUI_PROCESS_LIMIT` | 200 | Макс. число процессов в запросе. |

---

## 2. Конфигурационные файлы

### Агент (YAML)

Пример пути: `config.yaml` (или флаг `-config`).

```yaml
server_url: "http://backend:3000"
host_id: "a0000000-0000-0000-0000-000000000001"
host_token: "local-dev-token"
metrics_interval_sec: 10
process_interval_sec: 30
process_top_n: 100
# command_listen_addr: ":9090"
# command_secret: "dev-secret"
```

### Корневой .env

Скопировать из `.env.example`:

```bash
cp .env.example .env
```

Используется docker-compose и при локальном запуске backend/web. Не коммитить `.env` с секретами.

---

## 3. Docker Compose

Переменные для сервисов задаются в `docker-compose.yml`; переопределение через `.env` или `environment` в compose. Основные: postgres (POSTGRES_*), backend (DATABASE_URL, JWT_SECRET, AUTH_ENABLED, AGENT_COMMAND_SECRET, PORT), web (NEXT_PUBLIC_API_URL на этапе сборки), agent (SERVER_URL, HOST_ID, HOST_TOKEN, AGENT_COMMAND_SECRET).

---

## 4. Авторизация (AUTH_ENABLED=true)

- Пользователь из seed (после `prisma db seed`): **demo@test.com** / **demo**.
- Вход: POST `/auth/login` с JSON; бэкенд выставляет HttpOnly cookie.
- Веб отправляет cookie автоматически; для вызовов API из скриптов использовать cookie jar или заголовок `Authorization: Bearer <access_token>`.
