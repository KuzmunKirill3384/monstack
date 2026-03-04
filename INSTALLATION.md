# Installation

This document covers system requirements, dependencies, and installation methods for Monstack.

---

## 1. System requirements

| Requirement | Minimum |
|-------------|---------|
| OS | Linux (agent reads `/proc`; backend/web/TUI run on Linux or macOS for dev) |
| Docker | 20.x+ with Compose v2 (e.g. `docker compose`) |
| Node.js | 20 LTS or later (for backend, web, Node TUI) |
| Go | 1.22+ (for agent and monstack-cli; optional if using pre-built images only) |
| Memory | 512 MB for postgres; 256 MB each for backend/web; 64 MB for agent |
| Disk | ~500 MB for images and build artifacts; plus DB storage (see retention) |

**For C TUI only:** gcc, ncurses, libcurl (e.g. Ubuntu: `build-essential libncurses-dev libcurl4-openssl-dev`; macOS: `ncurses` and `curl` via Homebrew).

---

## 2. Dependencies overview

- **Backend:** Node.js, npm; Prisma CLI; PostgreSQL (or use Docker).
- **Web:** Node.js, npm.
- **Agent:** Go 1.22+ (or use Docker image).
- **Node TUI:** Node.js, npm (blessed, chalk, etc. in `tools/term`).
- **CLI:** Go 1.22+ (for `monstack-cli up`).

---

## 3. Install from source

### 3.1 Clone repository

```bash
git clone https://github.com/KuzmunKirill3384/monstack.git ~/monstack
cd ~/monstack
```

Use a path without root and without special characters (e.g. `~/projects/monstack`). Avoid `/tmp` (ephemeral) and system directories.

### 3.2 Minimal path (Docker + Node only)

No Go required. Start stack and use web or Node TUI:

```bash
make install-docker-only   # same as: make up
# Or: make install  then  make up
make check                 # verify backend and web
```

Then open http://localhost:3001 or run `make localterm` / `make webterm`.

### 3.3 Full install (backend, web, TUI, optional CLI/agent)

```bash
make install    # backend + web + tools/term npm install; npm link for localterm/webterm
make up         # docker compose up (postgres, backend, web, agent)
make check
```

Optional: build Go CLI and agent locally:

```bash
make cli-build  # builds ./bin/monstack-cli
# Agent: cd agent && go build -o monagent ./cmd/agent
```

### 3.4 One-command startup (with Go)

```bash
make up-one     # builds CLI if missing, creates .env if missing, runs ./bin/monstack-cli up
```

This starts the full stack including the in-container agent. Then use `make localterm`, `make webterm`, or open http://localhost:3001.

### 3.5 Bootstrap script (Linux/macOS)

On supported systems (Ubuntu, Debian, Kali, Mint, Fedora, macOS):

```bash
curl -fsSL https://raw.githubusercontent.com/KuzmunKirill3384/monstack/main/scripts/bootstrap.sh | bash
```

Options: `--yes`, `--skip-docker`, `--skip-node`, `--skip-up`. Install directory can be set with `INSTALL_DIR=/path`.

---

## 4. Docker

The project uses Docker Compose for the core stack.

- **Default compose file:** `docker-compose.yml` (services: postgres, backend, web, agent).
- **Override for TimescaleDB:** `docker-compose.timescale.yml` (use with `-f docker-compose.yml -f docker-compose.timescale.yml` or via `scripts/enable-timescale.sh`).

Ports:

- Postgres: 5432
- Backend: 3000
- Web: 3001 (mapped from container 3000)

Agent runs with `pid: host` so it can collect host processes when the stack runs on the host. For remote hosts, run the agent binary on each host and point `SERVER_URL` to your backend.

---

## 5. Environment

Copy and edit env if needed:

```bash
cp .env.example .env
```

Required for backend: `DATABASE_URL`. For production: set `JWT_SECRET`, consider `AUTH_ENABLED=true`. See [CONFIGURATION.md](CONFIGURATION.md).

---

## 6. Troubleshooting

- **Docker not found:** Install Docker Engine and Docker Compose (v2). See [TROUBLESHOOTING.md](TROUBLESHOOTING.md).
- **Port in use:** Change backend/web ports in compose or stop conflicting services.
- **Backend unhealthy:** Check `docker compose logs backend` and postgres connectivity; ensure `DATABASE_URL` is correct.
- **No hosts in UI:** Agent must send at least one successful ingest; wait 10–30 s after start and check agent logs and backend ingest logs.
- **Prisma errors:** Run `cd backend && npx prisma generate`; for migrations use `npx prisma migrate deploy` (or `migrate dev` in development).

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for more cases.
