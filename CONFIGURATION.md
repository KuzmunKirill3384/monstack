# Configuration

This document describes configuration for Monstack: environment variables and config files.

---

## 1. Environment variables

### Backend

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | — | PostgreSQL connection string (required). |
| `PORT` | 3000 | HTTP listen port. |
| `JWT_SECRET` | change-me-in-production | Secret for JWT signing. |
| `AUTH_ENABLED` | false | If true, GET endpoints require JWT (cookie or Bearer). |
| `PASSWORD_SALT` | salt | Salt for password hashing (change in production). |
| `COOKIE_SECRET` | monstack-cookie-secret | Secret for cookie signing. |
| `AGENT_COMMAND_SECRET` | dev-secret | Secret for agent signal (kill) requests. |
| `LOG_JSON` | false | If true, log in JSON format. |
| `INGEST_RATE_LIMIT_MAX` | 120 | Max requests per window for /v1/ingest. |
| `INGEST_RATE_LIMIT_WINDOW_MS` | 60000 | Window in ms for ingest rate limit. |
| `INGEST_RATE_LIMIT_DISABLED` | 0 | Set to 1 to disable ingest rate limit. |
| `READ_RATE_LIMIT_MAX` | 300 | Max GET requests per window per IP. |
| `READ_RATE_LIMIT_WINDOW_MS` | 60000 | Window in ms for read rate limit. |
| `RETENTION_METRICS_DAYS` | 30 | Delete metrics older than N days. |
| `RETENTION_PROCS_DAYS` | 14 | Delete process snapshots older than N days. |
| `RETENTION_ALERTS_DAYS` | 90 | Delete alert events older than N days. |
| `CORS_ORIGIN` | true | CORS origin (true = reflect request origin). |

### Web

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | http://localhost:3000 | Backend API base URL. |

### Agent

| Variable | Default | Description |
|----------|---------|-------------|
| `SERVER_URL` | — | Backend URL (e.g. http://backend:3000). |
| `HOST_ID` | — | Host UUID (must match DB). |
| `HOST_TOKEN` | — | Token; SHA256 must equal Host.token_hash in DB. |
| `AGENT_COMMAND_SECRET` | — | Optional; for signal endpoint. |
| Config file | — | YAML: server_url, host_id, host_token, intervals, etc. |

### Node TUI

| Variable | Default | Description |
|----------|---------|-------------|
| `API_URL` | http://localhost:3000 | Backend URL. |
| `TUI_REFRESH_MS` | 5000 | Refresh interval. |
| `TUI_ALERTS_REFRESH_MS` | 10000 | Alerts refresh. |
| `TUI_THEME` | dark | dark / light. |
| `TUI_PROCESS_LIMIT` | 200 | Max processes to request. |

---

## 2. Config files

### Agent (YAML)

Example path: `config.yaml` (or via `-config` flag).

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

### Root .env

Copy from `.env.example`:

```bash
cp .env.example .env
```

Used by docker-compose and by backend/web when run locally. Do not commit `.env` with secrets.

---

## 3. Docker Compose

Variables for services are set in `docker-compose.yml`; overrides via `.env` or `environment` in compose. Key mappings:

- **postgres:** POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB.
- **backend:** DATABASE_URL, JWT_SECRET, AUTH_ENABLED, AGENT_COMMAND_SECRET, PORT, NODE_OPTIONS.
- **web:** NEXT_PUBLIC_API_URL (build-time for Next.js).
- **agent:** SERVER_URL, HOST_ID, HOST_TOKEN, AGENT_COMMAND_SECRET.

---

## 4. Auth (AUTH_ENABLED=true)

- Seed user (after `prisma db seed`): **demo@test.com** / **demo**.
- Login: POST `/auth/login` with JSON body; backend sets HttpOnly cookie.
- Web uses cookie automatically; for API tools use cookie jar or `Authorization: Bearer <access_token>`.
