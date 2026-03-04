# Usage

This document describes how to run and use Monstack: Make targets, CLI, TUI, and web UI.

---

## 1. Make targets

From the repository root:

| Target | Description |
|--------|-------------|
| `make up` | Start stack (postgres, backend, web, agent). |
| `make down` | Stop all containers. |
| `make check` | Verify backend `/ready` and web reachability. |
| `make logs` | Follow docker compose logs. |
| `make install` | Install backend, web, term (npm); run `npm link` for localterm/webterm. |
| `make install-docker-only` | Start stack only (no local Node/Go install). |
| `make localterm` | Run Node TUI (banner + TUI). |
| `make webterm` | Ensure stack is up and open web UI in browser. |
| `make term` | Run Node TUI from `tools/term` (no banner). |
| `make term-c` | Build (if needed) and run C TUI. |
| `make term-global` | Install term and link so `localterm`/`webterm` are in PATH. |
| `make up-one` | Build CLI, generate .env if missing, run `./bin/monstack-cli up`. |
| `make cli-build` | Build `./bin/monstack-cli`. |
| `make test` | Run backend tests, web lint/build/tests, term tests. |
| `make clean` | Remove node_modules and C TUI binary. |
| `make diagrams` | Generate PNGs from `docs/diagrams/*.puml` (requires Docker plantuml image). |

---

## 2. CLI (monstack-cli)

Built with `make cli-build`; binary: `./bin/monstack-cli`.

### up

```bash
./bin/monstack-cli up --dir .
```

- Ensures `.env` exists (generates from example if missing).
- Runs `docker compose up -d --build` in the given directory.
- Used by `make up-one`.

---

## 3. Node TUI

- **Start:** `make localterm` or `make term` (or `localterm`/`npm run localterm` if linked).
- **Screens:** 1–5 or F1–F5: hosts, processes, metrics, alerts, alert rules.
- **Keys:** Enter (select), s (sort), f (filter), r (refresh), q (quit).
- **Env:** `API_URL` (default http://localhost:3000), `TUI_REFRESH_MS`, `TUI_THEME`, `TUI_PROCESS_LIMIT`.

See `docs/TUI.md` for details.

---

## 4. C TUI

- **Build/run:** `make term-c` (builds `tools/term-c/monterm` if needed).
- **Requirements:** gcc, ncurses, libcurl.
- **Screens:** 4; refresh ~500 ms.

---

## 5. Web UI

- **URL:** http://localhost:3001 (after `make up` or `make up-one`).
- **Pages:** Hosts, Host detail (metrics + processes), Dashboards, Alerts, Alert rules, Settings.
- **Auth:** When `AUTH_ENABLED=true`, log in at `/login` (seed user: demo@test.com / demo).
- **API base:** Set via `NEXT_PUBLIC_API_URL` (default http://localhost:3000).

---

## 6. Typical workflows

### First run (full stack)

```bash
make up-one
make check
# Open http://localhost:3001 or run make webterm
```

### Development (backend + web locally)

```bash
make up          # postgres + agent only if needed; or run backend/web in containers
cd backend && npm run start:dev
cd web    && npm run dev
# Backend :3000, Web :3001
```

### Add a new host (remote server)

1. Create host in DB and set `token_hash` = SHA256(host_token). Or use existing seed host and replace token.
2. On the server: build agent (`cd agent && go build -o monagent ./cmd/agent`), configure `server_url`, `host_id`, `host_token`.
3. Run agent (systemd or manual). Host appears in UI after first successful ingest.

### Alerts

1. Open Alert rules in web or TUI.
2. Create rule: metric (e.g. cpu_total_pct), operator (e.g. gt), threshold (e.g. 90), window (e.g. 5m).
3. Events appear in Alerts when the rule fires; optional SSE stream for live updates.
