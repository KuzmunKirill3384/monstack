# Внутренняя архитектура

Единый источник правды по структуре системы.

---

## Уровни (сверху вниз)

```
┌─────────────────────────────────────────────────────────┐
│  Пользователь                                            │
│  Web (Next.js :3001) | Node TUI | C TUI                  │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP GET /hosts, /metrics, …
┌───────────────────────▼─────────────────────────────────┐
│  Backend (NestJS + Fastify :3000)                        │
│  Controllers → Services → Prisma                         │
└───────────────────────┬─────────────────────────────────┘
                        │ SQL
┌───────────────────────▼─────────────────────────────────┐
│  PostgreSQL :5432                                        │
│  Host, MetricsRaw, ProcSnapshot, AlertRule, AlertEvent   │
└──────────────────────────────────────────────────────────┘

                        ▲
                        │ POST /v1/ingest (Bearer token, gzip)
                        │
┌───────────────────────┴─────────────────────────────────┐
│  Agent (Go)                                               │
│  /proc → CPU, mem, load, net, disk; top-N процессов       │
└──────────────────────────────────────────────────────────┘
```

---

## Поток данных

| Направление | Протокол | Описание |
|-------------|----------|----------|
| **Agent → Backend** | POST /v1/ingest, gzip | Batch метрик + процессов каждые 10 s / 30 s |
| **Backend → DB** | Prisma / SQL | Запись в metrics_raw, proc_snapshots; обновление host.last_seen_at |
| **Web / TUI → Backend** | GET /hosts, /metrics, /processes, /alerts | Чтение для дашбордов и TUI |

---

## Компоненты Backend

| Модуль | Роль |
|--------|------|
| **HostsModule** | CRUD хостов, updateLastSeen при ingest |
| **IngestModule** | Приём batch по Bearer token, валидация host_id |
| **MetricsModule** | GET /metrics с resolution raw/1m/5m |
| **ProcessesModule** | GET /processes (снимки за период) |
| **AlertsModule** | GET /alerts, AlertsCronService (cron каждые 2 min) |
| **AuthModule** | JWT (опционально AUTH_ENABLED) |

---

## Зависимости Docker

```
postgres (healthy)
    └── backend (healthcheck /ready)
            ├── web
            └── agent
```

---

## Точки входа

| Команда | Описание |
|---------|----------|
| `make up` | docker compose up |
| `make check` | scripts/check-stack.sh |
| `make term` | Node TUI |
| `make term-c` | C TUI |
