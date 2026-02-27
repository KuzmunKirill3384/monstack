# API Contracts (OpenAPI-ориентированное описание)

## Base URL

- Backend API: `http(s)://<server>/api` (или без префикса, в зависимости от деплоя).
- Ingest (agent): `POST /v1/ingest` — отдельный путь для агентов.

---

## Agent → Backend

### POST /v1/ingest

Приём батча метрик от агента.

**Headers:**

| Header | Обязательный | Описание |
|--------|--------------|----------|
| Authorization | да | `Bearer <host_token>` |
| Content-Encoding | да (если тело сжато) | `gzip` |
| Content-Type | да | `application/json` |

**Body: IngestBatchDTO**

```json
{
  "host_id": "uuid",
  "ts": "2025-02-27T12:00:00Z",
  "metrics": {
    "cpu_total_pct": 45.2,
    "load1": 1.5,
    "load5": 1.2,
    "load15": 1.0,
    "mem_used_mb": 2048,
    "mem_total_mb": 8192,
    "disk_used_pct": 72.5,
    "net_rx_bps": 1000000,
    "net_tx_bps": 500000
  },
  "processes": [
    {
      "pid": 1234,
      "name": "node",
      "cpu_pct": 12.5,
      "rss_mb": 256,
      "io_read_bps": 0,
      "io_write_bps": 0,
      "state": "R"
    }
  ]
}
```

**Responses:**

- `204 No Content` — успех.
- `400 Bad Request` — невалидный DTO (host_id не совпадает с токеном, неверный ts и т.д.).
- `401 Unauthorized` — неверный или отсутствующий Bearer token.

---

## UI / User → Backend

Все эндпоинты ниже требуют аутентификации пользователя (JWT или session cookie), кроме опционального health.

### POST /auth/login

**Body:** `{ "username": string, "password": string }`  
**Response:** `200` + JWT в теле или в httpOnly cookie (в зависимости от реализации).

### GET /hosts

Список хостов для текущего пользователя.

**Query:** опционально `?online=true|false` (фильтр по статусу).

**Response:** массив `Host` с полями `id`, `name`, `os`, `arch`, `tags`, `created_at`, `last_seen_at`, `online` (вычисляемое).

### GET /hosts/:id

Один хост по id.

**Response:** объект `Host` или `404`.

### GET /metrics

Метрики по хосту и диапазону.

**Query:**

| Параметр | Обязательный | Описание |
|----------|---------------|----------|
| host | да | UUID хоста |
| from | да | ISO8601 (например начало периода) |
| to | да | ISO8601 (конец периода) |
| resolution | нет | `raw` \| `1m` \| `5m` (по умолчанию `1m` для больших диапазонов) |

**Response:** массив точек `{ ts, cpu_total_pct, load1, load5, load15, mem_used_mb, mem_total_mb, disk_used_pct, net_rx_bps, net_tx_bps }` и т.д.

### GET /processes

Срезы процессов по хосту.

**Query:**

| Параметр | Обязательный | Описание |
|----------|---------------|----------|
| host | да | UUID хоста |
| from | нет | ISO8601 |
| to | нет | ISO8601 |
| limit | нет | Максимум записей (по умолчанию разумный лимит) |

**Response:** массив `ProcSnapshot` (host_id, ts, pid, name, cpu_pct, rss_mb, io_read_bps, io_write_bps, state).

### GET /alerts

События и/или правила алертов.

**Query:**

| Параметр | Описание |
|----------|----------|
| host | UUID хоста (опционально — по всем хостам) |
| from, to | Диапазон времени для событий |
| status | firing \| resolved |

**Response:** список правил и/или событий (формат уточняется в реализации).

### CRUD /alert-rules (этап 5)

- `GET /alert-rules` — список правил (с фильтром по host_id).
- `POST /alert-rules` — создание правила.
- `PATCH /alert-rules/:id` — обновление (например enabled, threshold).
- `DELETE /alert-rules/:id` — удаление.

---

## Опционально

### GET /v1/agent/config

Выдача параметров агенту (feature flags, интервал и т.д.) — опционально для MVP.

### GET /health

Health check для балансировщика/оркестратора: `200 OK` при живой БД и приложении.
