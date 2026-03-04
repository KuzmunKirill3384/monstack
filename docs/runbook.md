# Runbook: диагностика Monitoring Stack

Краткий чеклист при сбоях.

---

## One-shot установка (Kali / Ubuntu / Debian)

- **Bootstrap (всё с нуля):** `curl -fsSL https://raw.githubusercontent.com/KuzmunKirill3384/monstack/main/scripts/bootstrap.sh | bash` или после клона: `./scripts/bootstrap.sh`. Флаги: `--yes`, `--skip-docker`, `--skip-node`, `--skip-up`.
- **Из корня репо (Docker уже есть):** `make up-one` — одна команда: сборка CLI, генерация `.env`, запуск стека с агентом. Чтобы вызывать **`localterm`** и **`webterm`** из любой папки: один раз выполнить **`make term-global`** (или после полного `make install` они уже в PATH).

**Важно:** команды `make up`, `make up-one`, `make localterm`, `make webterm` работают только из **корня репозитория**. После `make install` или `make term-global` команды **`localterm`** и **`webterm`** доступны из любой папки (через `npm link`).

---

## Backend контейнер unhealthy / не стартует

1. **Логи:** `docker compose logs backend` — смотреть ошибку при старте.
2. **Часто:** в образе не было `wget`, healthcheck падал. В Dockerfile backend добавлен `apk add wget`. Пересобрать: `docker compose build backend --no-cache` затем `make up`.
3. **Prisma:** при ошибке `migrate deploy` или `db seed` — проверить доступ к БД (`docker compose logs postgres`), при повторном seed (дубликат) можно закомментировать seed в entrypoint или очистить volume: `docker compose down -v` (удалит данные БД).

---

## Ошибка: permission denied while trying to connect to the Docker daemon socket

Пользователь не в группе `docker`. Выполните:

```bash
sudo usermod -aG docker $USER
```

Затем **выйдите из сессии и зайдите снова** или выполните `newgrp docker`. После этого `make up` и `docker compose` будут работать без sudo.

---

## Нет хостов в списке

1. **Проверить backend:** `curl -s http://localhost:3000/ready` — должен вернуть `{"status":"ok"}`.
2. **Проверить агент:** агент отправляет данные на `POST /v1/ingest`. Без запущенного агента хосты не появятся. Запуск: `docker compose --profile agent up -d` или отдельная установка агента с валидным `host_token`.
3. **Добавить хост вручную:** через Prisma/БД или будущий API создания хоста; токен хоста должен совпадать с тем, что указан в агенте.
4. **Логи backend:** при ingest с неверным токеном — 401; при несовпадении host_id — 400. Смотреть логи: `docker compose logs backend`.

---

## Нет метрик / пустые графики

1. **Хост online?** В списке хостов проверьте индикатор (зелёный = online). Если offline — агент не шлёт данные или не запущен.
2. **Диапазон времени:** убедитесь, что выбранный период (from/to) попадает в время работы агента.
3. **Логи агента:** при ошибках отправки агент пишет в stderr. Проверить сетевая доступность до backend, таймауты, 413 (payload too large).

---

## Нет процессов в таблице

1. **Агент должен быть запущен.** При `make up` или `make up-one` агент поднимается вместе со стеком. Без агента снимки процессов не попадают в БД.
2. **Интервал снимков:** агент шлёт процессы раз в **30 секунд** (`process_interval_sec`). Подождите минимум 30–60 с после запуска агента, затем обновите страницу или запрос.
3. **Агент в Docker:** в `docker-compose` у сервиса `agent` указано `pid: host` — контейнер видит процессы **хоста**. Если агент запущен на хосте (не в Docker), он и так видит все процессы.
4. **Проверка API:** `curl -s "http://localhost:3000/processes?host=<host_id>&limit=10"` — подставьте реальный `host_id` из списка хостов. Пустой массив при работающем агенте — проверить логи агента: `docker compose --profile agent logs -f agent`.

---

## Алерты не срабатывают / не отображаются

1. **Cron алертов:** backend запускает проверку правил каждые 2 мин (`AlertsCronService`). Убедиться, что правила созданы и enabled.
2. **Правила:** `GET /alert-rules` — список правил; пороги и метрики должны соответствовать данным хоста.
3. **События:** `GET /alerts` — список событий; фильтр по status (firing/ok).

---

## Ошибка 429 (rate limit) в TUI или вебе

Rate limit применяется **только к POST /v1/ingest** (приём данных от агента). Запросы GET /hosts, /metrics, /processes, /alerts **не** лимитируются — TUI и веб могут опрашивать API без 429. Если 429 всё же появляется на других запросах: задать `INGEST_RATE_LIMIT_DISABLED=1` в .env или увеличить `INGEST_RATE_LIMIT_MAX` (по умолчанию 120/мин на ingest).

---

## Веб не открывается / 401 на запросах

1. **AUTH_ENABLED:** при `AUTH_ENABLED=true` нужна авторизация. Открыть `/login`, войти (demo@test.com / demo после seed).
2. **Cookie:** запросы к API должны отправляться с `credentials: 'include'`. Проверить, что домен/порт совпадают (CORS с credentials).

---

## Docker: контейнеры не стартуют

1. **postgres healthy:** `docker compose ps` — postgres должен быть healthy, иначе backend не пройдёт healthcheck.
2. **Порты:** 5432 (postgres), 3000 (backend), 3001 (web) не заняты другими процессами.
3. **Логи:** `docker compose logs postgres`, `docker compose logs backend` — ошибки миграций, подключения к БД.

---

## Как запускать тесты

Локально (по компонентам):

- **Backend (unit):** `cd backend && npm test`
- **Backend (e2e):** `cd backend && npm run test:e2e` (использует моки Prisma; для auth e2e задаются `JWT_SECRET`, `PASSWORD_SALT`, `AUTH_ENABLED` через `test/env-e2e.js`)
- **Web:** `cd web && npm test` (Vitest + React Testing Library)
- **Agent:** `cd agent && go test ./...`
- **Term:** `cd tools/term && npm test` (utils, config, api)

Полный прогон как в CI: см. секцию «CI тесты падают» ниже. Конфигурация пайплайна: [.github/workflows/ci.yml](../.github/workflows/ci.yml).

---

## CI тесты падают

- **Backend:** `cd backend && npm ci && npx prisma generate && npm test && npm run test:e2e`.
- **Web:** `cd web && npm ci && npm run lint && npm run build && npm test`.
- **Agent:** `cd agent && go build ./cmd/agent && go test ./...`.
- **Term:** `cd tools/term && npm ci && npm test && make term-check` (term-check ожидает exit 1 при недоступном API).
- **Term-c:** установить ncurses и curl, `make`, затем smoke с таймаутом (ожидается ненулевой exit при недоступном backend).
