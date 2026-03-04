# API Contracts

Описание API (ориентировано на OpenAPI/Swagger). Актуальная документация: http://localhost:3000/api/docs.

---

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

**Body:** `{ "email": string, "password": string }`

**Example request:**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@test.com","password":"demo"}' \
  -c cookies.txt
```

**Response:** `200` + тело `{ "access_token": "..." }` и cookie `access_token` (httpOnly). При ошибке: `401 Unauthorized`.

### GET /hosts

Список хостов. При `AUTH_ENABLED=true` требуется cookie или заголовок `Authorization: Bearer <token>`.

**Query:** опционально `?online=true|false` (фильтр по статусу).

**Example:**
```bash
curl -b cookies.txt http://localhost:3000/hosts
```

**Response:** массив `Host` с полями `id`, `name`, `os`, `arch`, `tags`, `createdAt`, `lastSeenAt`, `online`, `lastMetric` (последняя точка метрик).

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

**Response:** массив точек `{ ts, cpu_total_pct, load1, load5, load15, mem_used_mb, mem_total_mb, disk_used_pct, net_rx_bps, net_tx_bps }`.

**Ошибки:** `400 Bad Request` — отсутствует или невалиден `host`, `from`, `to` (ожидается ISO 8601); `from` позже `to`.

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

**Ошибки:** `400 Bad Request` — отсутствует `host`; невалидные `from`/`to` (ISO 8601); `limit` вне диапазона 1–1000.

### GET /alerts

События и/или правила алертов.

**Query:**

| Параметр | Описание |
|----------|----------|
| host | UUID хоста (опционально — по всем хостам) |
| from, to | Диапазон времени для событий |
| status | firing \| resolved |

**Response:** список правил и/или событий (формат уточняется в реализации).

### CRUD /alert-rules

#### GET /alert-rules

Список правил. Опционально `?host=<uuid>` для фильтрации по хосту.

#### POST /alert-rules

Создание правила.

**Body schema:**

| Поле | Тип | Обязательное | Описание |
|------|-----|:---:|----------|
| hostId | string (uuid) \| null | нет | Хост или null = глобальное правило |
| metric | string | да | `cpu_total_pct`, `mem_used_pct`, `disk_used_pct`, `host_down` |
| op | string | да | `>`, `<`, `==` |
| threshold | number | да | Пороговое значение (%) |
| window | string | нет | Окно проверки, по умолчанию `5m` |
| severity | string | нет | `critical`, `warning`, `info` (по умолчанию `warning`) |
| enabled | boolean | нет | По умолчанию `true` |

**Примеры:**

CPU > 90% на всех хостах:

```bash
curl -X POST http://localhost:3000/alert-rules \
  -H "Content-Type: application/json" \
  -d '{
    "metric": "cpu_total_pct",
    "op": ">",
    "threshold": 90,
    "severity": "critical",
    "enabled": true
  }'
```

Память > 80% на конкретном хосте:

```bash
curl -X POST http://localhost:3000/alert-rules \
  -H "Content-Type: application/json" \
  -d '{
    "hostId": "a0000000-0000-0000-0000-000000000001",
    "metric": "mem_used_pct",
    "op": ">",
    "threshold": 80,
    "severity": "warning"
  }'
```

Диск > 95%:

```bash
curl -X POST http://localhost:3000/alert-rules \
  -H "Content-Type: application/json" \
  -d '{
    "metric": "disk_used_pct",
    "op": ">",
    "threshold": 95,
    "severity": "critical"
  }'
```

Host down (агент не шлёт данные):

```bash
curl -X POST http://localhost:3000/alert-rules \
  -H "Content-Type: application/json" \
  -d '{
    "hostId": "a0000000-0000-0000-0000-000000000001",
    "metric": "host_down",
    "op": ">",
    "threshold": 0,
    "severity": "critical"
  }'
```

**Response:** `201 Created` + объект правила с `id`.

#### PATCH /alert-rules/:id

Обновление правила. Передаются только изменяемые поля.

```bash
curl -X PATCH http://localhost:3000/alert-rules/RULE_ID \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'
```

```bash
curl -X PATCH http://localhost:3000/alert-rules/RULE_ID \
  -H "Content-Type: application/json" \
  -d '{"threshold": 85, "severity": "critical"}'
```

#### DELETE /alert-rules/:id

```bash
curl -X DELETE http://localhost:3000/alert-rules/RULE_ID
```

---

## Опционально

### GET /v1/agent/config

Выдача параметров агенту (feature flags, интервал и т.д.) — опционально для MVP.

### GET /health

Health check: `200 OK` + `{ "status": "ok" }` без проверки БД.

### GET /ready

Readiness: `200 OK` + `{ "status": "ok" }` при успешном запросе к БД. Используется в Docker healthcheck.
