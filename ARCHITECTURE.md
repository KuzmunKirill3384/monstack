# Architecture

This document describes the system architecture of Monstack: components, data flow, dependencies, and scaling considerations.

---

## 1. High-level diagram

```
                    +------------------+
                    |   Web (Next.js)  |
                    |   port 3001      |
                    +--------+---------+
                             |
                             | HTTP GET (hosts, metrics, processes, alerts)
                             v
+--------+   POST /v1/ingest  +------------------+    Prisma     +------------+
| Agent  | ------------------>| Backend (NestJS) |<------------->| PostgreSQL |
| (Go)   |   Bearer token     |   port 3000      |               | port 5432  |
+--------+                    +--------+---------+                +------------+
     ^                                |
     | read /proc                     | HTTP GET (same as Web)
     |                                v
+--------+                    +------------------+
|  TUI   |                    |  Optional:      |
|(Node/C)|                    |  TimescaleDB     |
+--------+                    +------------------+
```

- **Agent:** Runs on monitored hosts (Linux). Reads `/proc`, builds JSON batches, gzips, POSTs to backend. Authenticated by host Bearer token (SHA256 stored in DB as `Host.tokenHash`).
- **Backend:** Single NestJS app on Fastify. Handles ingest, REST API for hosts/metrics/processes/alerts, auth (JWT when `AUTH_ENABLED=true`), rate limits, health/ready.
- **PostgreSQL:** Persistent store for hosts, metrics_raw, proc_snapshots, alert_rules, alert_events, users. Optional TimescaleDB image for time-series optimizations.
- **Web:** Next.js SPA; consumes backend API; dashboard, host detail, alerts, settings.
- **TUI:** Node (blessed) or C (ncurses) clients; same read API as web.

---

## 2. Components

### 2.1 Agent (Go)

- **Path:** `agent/`
- **Entry:** `agent/cmd/agent/main.go`
- **Role:** Collect OS metrics and process snapshots; send to backend at configurable interval.
- **Config:** YAML (e.g. `server_url`, `host_id`, `host_token`, `metrics_interval_sec`, `process_interval_sec`).
- **Output:** `POST /v1/ingest` with `Authorization: Bearer <host_token>`, body = JSON (optionally gzip). Backend resolves host by token hash and `host_id` in body.

### 2.2 Backend (NestJS)

- **Path:** `backend/`
- **Entry:** `backend/src/main.ts` (Fastify, no global prefix; Swagger at `/api/docs`).
- **Modules:**
  - **Auth:** Login (JWT in cookie), logout, me, change-password; optional guard on read endpoints.
  - **Ingest:** `POST /v1/ingest` (HostTokenGuard), writes to `metrics_raw` and `proc_snapshots`, updates `Host.lastSeenAt`.
  - **Hosts:** GET list, GET by id, POST signal (kill process via agent).
  - **Metrics:** GET range (query params: host, from, to, resolution); supports raw/1m/5m aggregates if enabled.
  - **Processes:** GET by host and time range.
  - **Alerts:** GET events (filter by host, status, from, to); GET stream (SSE); AlertRules CRUD; cron job evaluates rules and creates events.
- **DB:** Prisma + PostgreSQL. Migrations in `backend/prisma/migrations`.

### 2.3 Web (Next.js)

- **Path:** `web/`
- **Entry:** Next.js dev/server or `next start`; App Router.
- **Pages:** Login, Hosts, Host detail (metrics + processes), Dashboards, Alerts, Alert rules, Settings.
- **API client:** `fetch` to `NEXT_PUBLIC_API_URL` with `credentials: 'include'` (cookies). React Query for data and retries.

### 2.4 TUI (Node and C)

- **Node:** `tools/term/` — blessed UI; screens: hosts, processes, metrics, alerts, rules. Connects to backend via `API_URL`.
- **C:** `tools/term-c/` — ncurses + libcurl; 4 screens; 500 ms refresh. Binary: `monterm`.

### 2.5 CLI (Go)

- **Path:** `monstack-cli/`
- **Entry:** `monstack-cli up` — ensures `.env`, runs docker compose, optionally builds/attaches agent. Used by `make up-one`.

---

## 3. Data flow

### Ingest (Agent → Backend → DB)

1. Agent reads `/proc` (stat, meminfo, loadavg, net/dev, statvfs, process list).
2. Builds batch: `host_id`, `ts`, `metrics` object, `processes` array.
3. Gzips body, POSTs to `SERVER_URL/v1/ingest` with `Authorization: Bearer HOST_TOKEN`.
4. Backend: validates token (hash match in Host), validates `host_id`, writes to `metrics_raw` and `proc_snapshots`, updates `Host.lastSeenAt`.

### Read (Web/TUI → Backend → DB)

1. Client sends GET to `/hosts`, `/metrics`, `/processes`, `/alerts`, `/alert-rules` (with optional auth cookie).
2. Backend applies optional JWT guard, queries DB via Prisma, returns JSON.

### Alerts

1. Rules stored in `alert_rules` (host_id, metric, op, threshold, window, enabled).
2. Cron (e.g. AlertsCronService) periodically evaluates; on breach inserts `alert_events` and may trigger notifications (future).
3. Clients poll or subscribe to `/alerts/stream` (SSE) for live events.

---

## 4. Dependencies

| Layer | Depends on |
|-------|------------|
| Agent | None (stdlib + config); HTTP to Backend. |
| Backend | PostgreSQL (must be up); env: DATABASE_URL, JWT_SECRET, etc. |
| Web | Backend (NEXT_PUBLIC_API_URL). |
| TUI | Backend (API_URL). |
| Docker Compose | postgres → backend → web, agent; backend healthcheck before agent. |

---

## 5. Scalability and limits

- **Designed for:** Small to medium deployments (e.g. 1–50 hosts per backend instance).
- **Bottlenecks:** Single backend process; DB write volume (metrics + procs); retention (default retention jobs prune old data).
- **Scaling:** Horizontal scaling of backend would require shared DB and no local state; ingest and read rate limits are per-instance. For large scale, consider TimescaleDB, aggregation, and external alerting/notification pipelines.
- **Limits:** Ingest body size (e.g. 1 MB); rate limits on `/v1/ingest` and on GET endpoints (configurable via env).

---

## 6. Security boundaries

- **Ingest:** Authenticated by host token only; no user identity. Token must be kept secret; hash stored in DB.
- **Read API:** When `AUTH_ENABLED=true`, user must authenticate (login); JWT in HttpOnly cookie.
- **Network:** Backend listens on 0.0.0.0; production should put backend behind TLS and restrict access (e.g. reverse proxy, firewall).

See [SECURITY.md](SECURITY.md) for threat model and reporting.
