# Runbook: диагностика Monitoring Stack

Краткий чеклист при сбоях.

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

1. **Тот же хост и период:** процессы привязаны к хосту и времени. Выберите хост и диапазон, когда агент уже отправлял снимки (интервал процессов обычно 30 с).
2. **Backend:** `GET /processes?host=<id>&from=...&to=...` — проверить ответ напрямую.

---

## Алерты не срабатывают / не отображаются

1. **Cron алертов:** backend запускает проверку правил каждые 2 мин (`AlertsCronService`). Убедиться, что правила созданы и enabled.
2. **Правила:** `GET /alert-rules` — список правил; пороги и метрики должны соответствовать данным хоста.
3. **События:** `GET /alerts` — список событий; фильтр по status (firing/ok).

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
