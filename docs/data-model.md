# Data Model

Текущая схема БД (Prisma). ER и планы по TimescaleDB — ниже.

## ER (логическая схема)

```mermaid
erDiagram
  users ||--o{ hosts : "admin manages"
  hosts ||--o{ metrics_raw : "produces"
  hosts ||--o{ proc_snapshots : "produces"
  hosts ||--o{ alert_events : "triggers"
  alert_rules ||--o{ alert_events : "generates"
  hosts ||--o{ alert_rules : "scoped to"
  metrics_raw : time ts
  metrics_raw : host_id
  metrics_1m : bucket ts
  metrics_5m : bucket ts
  metrics_1h : bucket ts
```

## Таблицы

### users

Пользователи UI (логин/пароль или OAuth позже).

| Поле | Тип | Описание |
|------|-----|----------|
| id | UUID PK | |
| email (или username) | string unique | |
| password_hash | string | |
| role | enum | admin, user |
| created_at | timestamptz | |

### hosts

Зарегистрированные хосты (агенты). Идентификация по токену (hash).

| Поле | Тип | Описание |
|------|-----|----------|
| id | UUID PK | |
| name | string | Человекочитаемое имя |
| token_hash | string unique | HMAC/SHA256 от секрета + host_id или сам токен (храним hash) |
| os | string | Например "linux" |
| arch | string | Например "amd64" |
| tags | JSONB | Произвольные теги |
| created_at | timestamptz | |
| last_seen_at | timestamptz nullable | Обновляется при каждом ingest |

### metrics_raw

**План:** TimescaleDB hypertable по ts (chunk_interval 1 day). Сейчас — обычная таблица.

Сырые метрики, time = ts.

| Поле | Тип | Описание |
|------|-----|----------|
| ts | timestamptz | Partition key (chunk_interval 1 day) |
| host_id | UUID FK → hosts | |
| cpu_total_pct | float | |
| load1, load5, load15 | float | |
| mem_used_mb | float | |
| mem_total_mb | float | |
| disk_used_pct | float | |
| net_rx_bps | bigint | |
| net_tx_bps | bigint | |

Опционально: disk_iops, per-CPU и т.д. по необходимости.

### metrics_1m, metrics_5m, metrics_1h

Continuous aggregates в TimescaleDB: агрегация по bucket (1m, 5m, 1h), те же поля (avg/min/max по решению). Структура аналогична metrics_raw с заменой ts на bucket (time bucket).

### proc_snapshots

Срезы процессов по хосту.

| Поле | Тип | Описание |
|------|-----|----------|
| id | bigint PK | |
| host_id | UUID FK → hosts | |
| ts | timestamptz | |
| pid | int | |
| name | string | |
| cpu_pct | float | |
| rss_mb | float | |
| io_read_bps | bigint nullable | |
| io_write_bps | bigint nullable | |
| state | string | R, S, D, Z, … |

Можно сделать hypertable по ts с retention 7–14 дней.

### alert_rules

Правила алертов.

| Поле | Тип | Описание |
|------|-----|----------|
| id | UUID PK | |
| host_id | UUID FK nullable | null = все хосты |
| metric | string | cpu_total_pct, mem_used_pct, disk_used_pct, host_down |
| op | string | ">", "<", "==" |
| threshold | float nullable | не для host_down |
| window | interval/string | например "5m" |
| severity | string | critical, warning, info |
| enabled | boolean | |
| created_at | timestamptz | |

### alert_events

События срабатывания алертов.

| Поле | Тип | Описание |
|------|-----|----------|
| id | UUID PK | |
| host_id | UUID FK | |
| rule_id | UUID FK → alert_rules | |
| ts | timestamptz | |
| status | string | firing, resolved |
| message | text | |

## Индексы

- metrics_raw: (host_id, ts) — для выборок по хосту и диапазону; TimescaleDB автоматически по time.
- proc_snapshots: (host_id, ts), при hypertable — по time.
- alert_events: (host_id, ts), (rule_id, ts).
