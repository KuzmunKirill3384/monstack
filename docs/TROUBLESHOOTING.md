# Troubleshooting Guide

Систематическое руководство по диагностике проблем Monstack. Для быстрого старта и команд см. [GETTING_STARTED.md](GETTING_STARTED.md).

---

## Agent

### Агент не может подключиться к backend

**Симптомы:** в логах агента `connection refused`, `timeout`, `no such host`.

1. Проверьте `server_url` в конфиге агента — должен указывать на доступный backend (http://ip:3000).
2. С машины агента: `curl -s http://<backend-ip>:3000/ready` — должен вернуть `{"status":"ok"}`.
3. Проверьте firewall: порт 3000 должен быть открыт.
4. В Docker: агент использует `http://backend:3000` (внутренняя DNS Docker). При запуске агента вне Docker используйте внешний IP.

### Агент получает 401 Unauthorized

Токен агента (`host_token`) не совпадает с `token_hash` в БД. SHA256 токена должен быть равен `token_hash`.

```bash
echo -n "your-token" | sha256sum
# сравните с token_hash в таблице Host
```

### Агент теряет данные (ingest failed в логах)

Агент при ошибке ingest логирует предупреждение и пропускает batch — данные не буферизируются. Причины:

- Backend перезагружается — агент автоматически повторит через backoff (1s → 2s → ... → 30s).
- 413 Payload Too Large — агент уменьшает число процессов в batch. Увеличьте `bodyLimit` backend или уменьшите `process_top_n` в конфиге.
- Сетевые проблемы — проверьте связность, таймауты.

### Агент не собирает процессы

1. Агент шлёт процессы раз в `process_interval_sec` (по умолчанию 30 с). Подождите минимум 30–60 с.
2. В Docker: сервис `agent` должен иметь `pid: host` в docker-compose — иначе видит только свои процессы.
3. На хосте: агент читает `/proc/[pid]/stat` — нужны права на чтение (обычно достаточно запуска от root или с cap_sys_ptrace).

---

## Backend

### Backend контейнер unhealthy / не стартует

1. `docker compose logs backend` — ошибка при старте.
2. Частая причина: healthcheck использует wget. Убедитесь, что в Dockerfile backend есть `apk add wget`. Пересобрать: `docker compose build backend --no-cache && make up`.
3. Prisma migrate: при ошибке `migrate deploy` проверьте доступ к БД (`docker compose logs postgres`). При дубликате seed: `docker compose down -v` (удалит данные).

### Ошибка подключения к PostgreSQL

1. Проверьте `DATABASE_URL` в переменных окружения backend.
2. `docker compose ps` — postgres должен быть healthy.
3. `docker compose logs postgres` — ошибки инициализации.

### 429 Too Many Requests

Rate limit применяется только к `POST /v1/ingest`. Запросы GET не лимитируются.

Увеличить лимит: `INGEST_RATE_LIMIT_MAX=300` в `.env`. Отключить: `INGEST_RATE_LIMIT_DISABLED=1`.

---

## Database

### БД растёт слишком быстро

При 10 хостах, метрики каждые 10 с, процессы каждые 30 с — ~100 MB/день.

Решения:

1. Включите retention policy (автоочистка): backend автоматически удаляет данные старше настроенных порогов. Переменные окружения:
   - `RETENTION_METRICS_DAYS` (по умолчанию 30)
   - `RETENTION_PROCS_DAYS` (по умолчанию 14)
   - `RETENTION_ALERTS_DAYS` (по умолчанию 90)
2. Для больших инсталляций — включите TimescaleDB (`scripts/enable-timescale.sh`).
3. Ручная очистка: `DELETE FROM metrics_raw WHERE ts < NOW() - INTERVAL '7 days';`

### Медленные запросы

1. Проверьте индексы: `metrics_raw` имеет `(host_id, ts)` и `(ts)`, `proc_snapshots` — `(host_id, ts)`.
2. Для больших диапазонов используйте `resolution=1m` или `resolution=5m` вместо `raw`.
3. Уменьшите `limit` в запросах.

---

## Web

### Веб не открывается

1. Проверьте: `docker compose ps` — контейнер web должен быть running.
2. Порт 3001 не занят: `lsof -i :3001`.
3. `NEXT_PUBLIC_API_URL` должен указывать на доступный backend (по умолчанию `http://localhost:3000`).

### 401 на запросах в вебе

1. При `AUTH_ENABLED=true` нужна авторизация. Откройте `/login`, войдите (demo@test.com / demo после seed).
2. Cookie: запросы отправляются с `credentials: 'include'`. CORS должен разрешать credentials с правильного origin.

### Медленный дашборд при множестве хостов

1. Backend кэширует список хостов (TTL 5 с) и последние метрики (TTL 10 с) — при первом запросе может быть задержка.
2. Уменьшите количество одновременно отображаемых хостов (пагинация в API).
3. Используйте `resolution=1m` для графиков за длинные периоды.

---

## TUI (терминальный интерфейс)

### TUI не запускается

1. `make localterm` — проверяет `/ready` перед стартом. Если backend недоступен — TUI выходит с ошибкой.
2. Убедитесь, что backend запущен: `curl -s http://localhost:3000/ready`.
3. `API_URL` по умолчанию `http://localhost:3000`. Переопределить: `API_URL=http://ip:3000 make localterm`.

### TUI показывает пустые экраны

1. Хосты пустые: агент не запущен или не шлёт данные.
2. Процессы пустые: подождите 30–60 с, нажмите **r** для обновления.
3. Алерты пустые: создайте правило и подождите 2 минуты (интервал cron).

---

## Docker

### Permission denied (Docker socket)

```bash
sudo usermod -aG docker $USER
```

Затем выйдите и зайдите снова или `newgrp docker`.

### Контейнеры не стартуют

1. postgres должен быть healthy, иначе backend не стартует.
2. Проверьте порты: 5432, 3000, 3001 не заняты.
3. `docker compose logs` — полные логи всех сервисов.

### Сброс данных

```bash
docker compose down -v   # удалит volumes (данные БД)
make up                  # чистый старт с seed
```

---

## CI

### Тесты падают в CI

| Компонент | Команда | Частые причины |
|-----------|---------|----------------|
| Backend | `npm ci && npx prisma generate && npm test && npm run test:e2e` | Не сгенерирован Prisma client |
| Web | `npm ci && npm run lint && npm run build && npm test` | Ошибки линтера, TypeScript |
| Agent | `go build ./cmd/agent && go test ./...` | Несовместимость версии Go |
| Term | `npm ci && npm test && make term-check` | term-check ожидает exit 1 при недоступном API |
| Term-c | `apt install libncurses-dev libcurl4-openssl-dev && make` | Отсутствуют системные библиотеки |

Конфигурация CI: [.github/workflows/ci.yml](../.github/workflows/ci.yml).

---

## Процессы (kill/signal)

### Signal не работает

1. Для отправки сигнала нужен `agent_url` у хоста (поле в БД). Устанавливается автоматически при ingest или вручную.
2. `AGENT_COMMAND_SECRET` должен быть одинаковым на backend и агенте.
3. Агент должен слушать команды: `command_listen_addr` в конфиге (по умолчанию `:9090`).
4. Проверьте доступность: `curl -s http://<agent-ip>:9090/health`.

Допустимые сигналы: `SIGTERM`, `SIGKILL`, `SIGINT`, `SIGHUP`.
