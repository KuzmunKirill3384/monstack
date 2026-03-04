# API Reference

Monstack backend exposes a REST API. Live interactive docs: **http://localhost:3000/api/docs** (Swagger) when the backend is running.

Base URL: `http://localhost:3000` (or your backend host). Ingest uses path prefix `/v1`; other routes have no global prefix.

---

## 1. Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /health | No | Liveness; returns `{ "status": "ok" }`. |
| GET | /ready | No | Readiness (DB check); returns `{ "status": "ok" }`. |

---

## 2. Auth (when AUTH_ENABLED=true)

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | /auth/login | `{ "email", "password" }` | 200 + `access_token` + Set-Cookie (HttpOnly). 401 on invalid credentials. |
| POST | /auth/logout | — | Clears cookie. |
| GET | /auth/me | — | 200 + `{ id, email }` or anonymous. Requires optional JWT. |
| POST | /auth/change-password | `{ "currentPassword", "newPassword" }` | 200 or 401 (wrong password). Requires JWT. |

Example login (save cookie for subsequent requests):

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@test.com","password":"demo"}' \
  -c cookies.txt -b cookies.txt
```

---

## 3. Ingest (Agent)

| Method | Path | Headers | Body |
|--------|------|---------|------|
| POST | /v1/ingest | Authorization: Bearer \<host_token\>, Content-Type: application/json, optional Content-Encoding: gzip | IngestBatchDTO |

**IngestBatchDTO:** `host_id` (UUID), `ts` (ISO8601), `metrics` (object with cpu_total_pct, load1, load5, load15, mem_used_mb, mem_total_mb, disk_used_pct, net_rx_bps, net_tx_bps), `processes` (array of { pid, name, cpu_pct, rss_mb, io_read_bps, io_write_bps, state, cmd }).

Responses: 204 No Content (success), 400 (invalid body/host_id), 401 (invalid or missing token).

---

## 4. Hosts

| Method | Path | Query | Response |
|--------|------|-------|----------|
| GET | /hosts | optional `online=true|false` | Array of Host (id, name, os, arch, tags, createdAt, lastSeenAt, online, lastMetric). |
| GET | /hosts/:id | — | Single Host or 404. |

---

## 5. Metrics

| Method | Path | Query | Response |
|--------|------|-------|----------|
| GET | /metrics | host (required), from (ISO8601), to (ISO8601), resolution (optional: raw, 1m, 5m) | Array of metric points (ts, cpu_total_pct, load1, load5, load15, mem_used_mb, mem_total_mb, disk_used_pct, net_rx_bps, net_tx_bps). |

Example:

```bash
curl -s "http://localhost:3000/metrics?host=HOST_ID&from=2025-01-01T00:00:00Z&to=2025-01-01T01:00:00Z&resolution=1m"
```

---

## 6. Processes

| Method | Path | Query | Response |
|--------|------|-------|----------|
| GET | /processes | host (required), from, to (ISO8601), limit | Array of ProcSnapshot (ts, pid, name, cmd, cpu_pct, rss_mb, io_read_bps, io_write_bps, state). |

---

## 7. Host process signal

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | /hosts/:id/processes/:pid/signal | `{ "signal": "SIGTERM" \| "SIGKILL" }` | 200 or 4xx. Requires host to have agent_url and shared AGENT_COMMAND_SECRET. |

---

## 8. Alerts

| Method | Path | Query | Response |
|--------|------|-------|----------|
| GET | /alerts | host, status (firing\|ok), from, to | Array of alert events. |
| GET | /alerts/stream | — | SSE stream of alert events. |

---

## 9. Alert rules

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | /alert-rules | optional host (UUID) | Array of rules. |
| POST | /alert-rules | hostId?, metric, op, threshold?, window?, severity?, enabled? | 201 + rule object. |
| PATCH | /alert-rules/:id | Partial { enabled?, threshold?, ... } | Updated rule. |
| DELETE | /alert-rules/:id | — | 204. |

Operators: gt, lt, gte, lte, eq. Metrics: e.g. cpu_total_pct, load1, mem_used_mb, disk_used_pct.

Example:

```bash
curl -X POST http://localhost:3000/alert-rules \
  -H "Content-Type: application/json" \
  -d '{"metric":"cpu_total_pct","op":"gt","threshold":90,"severity":"critical","enabled":true}'
```

---

## 10. Rate limits and errors

- **Ingest:** Rate limit per Authorization (or IP) on `/v1/ingest` (configurable; default e.g. 120/min). 429 when exceeded.
- **Read:** Global read rate limit per IP (configurable). 429 when exceeded.
- **Errors:** 400 (validation), 401 (unauthorized), 403 (forbidden), 404 (not found), 429 (rate limit), 5xx (server error). Body may contain message or validation details.

For full request/response schemas and try-it-out, use **http://localhost:3000/api/docs**.
