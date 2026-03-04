# Troubleshooting

Common issues and fixes for Monstack. For runbooks and checklists, see [docs/runbook.md](docs/runbook.md).

---

## 1. Installation and dependencies

### Docker or docker compose not found

- Install [Docker Engine](https://docs.docker.com/engine/install/) and ensure Docker Compose v2 is available (`docker compose version`).
- On Linux, add your user to the `docker` group if needed.

### Node or Go version too old

- Node: use 20 LTS or newer (`node -v`). Install from nodejs.org or via nvm.
- Go: use 1.22+ (`go version`). Install from go.dev.

### make: command not found

- On Windows use WSL or a Unix-like environment. On macOS/Linux install Xcode Command Line Tools or build-essential.

---

## 2. Stack and services

### Backend container unhealthy or won’t start

- Check logs: `docker compose logs backend`.
- Ensure Postgres is healthy: `docker compose ps` and `docker compose logs postgres`.
- Verify `DATABASE_URL` (e.g. `postgresql://postgres:postgres@postgres:5432/monitoring`).
- If migrations fail: `docker compose down -v` (removes volumes) then `make up` again. For persistent data, fix DB and run migrations manually.

### Web shows “Cannot connect” or blank

- Ensure backend is up and reachable: `curl -s http://localhost:3000/ready`.
- Check `NEXT_PUBLIC_API_URL` (build-time for Next.js). In Docker it should match how the browser reaches the API (e.g. http://localhost:3000).
- Open browser dev tools and check for CORS or network errors.

### No hosts in UI

- Hosts appear only after at least one successful ingest. Default compose runs an agent in a container; wait 10–30 s after `make up`.
- Check agent logs: `docker compose logs agent`. Look for 401 (wrong token), 413 (body too large), or connection errors.
- Verify host token: SHA256 of the token must equal `token_hash` in the `Host` table for that host.

### Agent 401 Unauthorized

- Token in agent config must match a host in the DB: `token_hash` = SHA256(host_token). Create or update the host record and set `token_hash` accordingly.
- Ensure `Authorization: Bearer <token>` is sent; no extra spaces or newlines in token.

### Agent 413 Payload Too Large

- Backend limits ingest body size (e.g. 1 MB). Reduce number of processes per batch in agent config (e.g. `process_top_n`) or increase backend body limit if you control the server.

### 429 Too Many Requests

- Ingest or read rate limit exceeded. Increase limits via env (e.g. `INGEST_RATE_LIMIT_MAX`, `READ_RATE_LIMIT_MAX`) or disable ingest limit with `INGEST_RATE_LIMIT_DISABLED=1` for testing only.

---

## 3. Database

### DB grows too fast

- Enable retention: set `RETENTION_METRICS_DAYS`, `RETENTION_PROCS_DAYS`, `RETENTION_ALERTS_DAYS` (see [CONFIGURATION.md](CONFIGURATION.md)).
- Consider TimescaleDB and aggregation for large deployments (see `docs/timescale-retention.md` and `scripts/enable-timescale.sh`).

### Migrations fail

- Ensure `DATABASE_URL` is correct and DB is up. Run `cd backend && npx prisma migrate deploy`.
- If schema and DB are out of sync, backup data and consider `prisma migrate reset` in dev only.

---

## 4. Auth and login

### 401 on all API requests

- When `AUTH_ENABLED=true`, you must log in. Use web `/login` or `POST /auth/login` and send the cookie (or Bearer token) with subsequent requests.
- Seed user: demo@test.com / demo (after `prisma db seed`).

### Cookie not sent / CORS

- Use same origin for web and API in dev, or set `CORS_ORIGIN` and ensure credentials are included in fetch. Web uses `credentials: 'include'`.

---

## 5. TUI

### Node TUI exits immediately or “backend unavailable”

- Set `API_URL` to backend URL (e.g. http://localhost:3000). If backend is down, TUI may exit; this is expected for `make term-check`.
- Ensure backend is up: `curl -s http://localhost:3000/ready`.

### C TUI won’t build

- Install ncurses and libcurl dev packages (e.g. Ubuntu: `libncurses-dev libcurl4-openssl-dev`; macOS: `ncurses` and `curl` via Homebrew). Then `make term-c` or `cd tools/term-c && make`.

---

## 6. Alerts

### Alerts never fire

- Ensure alert rules exist and are enabled: check Alert rules in UI or `GET /alert-rules`.
- Check threshold and metric name (e.g. cpu_total_pct). Backend cron evaluates periodically; allow for window (e.g. 5m) and evaluation interval.
- Check backend logs for alert cron or evaluation errors.

---

## 7. Getting more help

- **Logs:** `docker compose logs -f [service]`.
- **Health:** `curl -s http://localhost:3000/health` and `curl -s http://localhost:3000/ready`.
- **Docs:** [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) (extended), [docs/runbook.md](docs/runbook.md), [INSTALLATION.md](INSTALLATION.md).

If you believe you’ve found a bug, open an issue with version, steps, and logs (redact secrets).
