# Monstack

**Monstack** is an integrated monitoring stack for OS metrics: a Go agent collects data from hosts, a NestJS backend ingests and stores it in PostgreSQL, and a Next.js web dashboard plus terminal UIs display hosts, charts, processes, and alerts.

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](package.json)
[![Node](https://img.shields.io/badge/node-20%2B-brightgreen.svg)](package.json)
[![Go](https://img.shields.io/badge/go-1.22%2B-00ADD8.svg)](agent/go.mod)

---

## Features

- **Agent (Go):** Collects CPU, memory, load, network, disk, and top processes from Linux `/proc`; batches and gzips payloads; sends to backend via `POST /v1/ingest` with Bearer token.
- **Backend (NestJS + Fastify):** Ingest pipeline, host registry, metrics/processes/alert rules and events; Prisma + PostgreSQL; optional JWT auth; rate limiting; health and readiness endpoints.
- **Web (Next.js):** Dashboard with hosts, host detail (metrics + processes), dashboards, alerts, alert rules, settings; login when auth enabled; responsive UI.
- **TUI:** Node.js (blessed) and C (ncurses) terminal clients for hosts, processes, metrics, and alerts.
- **CLI:** `monstack-cli up` builds the stack and agent, generates `.env` if missing; one-command startup with `make up-one`.
- **Alerts:** Configurable rules (metric, operator, threshold); cron-based evaluation; event history and optional SSE stream.

---

## Architecture Overview

```
+-------------+     POST /v1/ingest      +-------------+     SQL      +------------+
|   Agent     | ----------------------> |   Backend   | <-----------> | PostgreSQL |
|   (Go)      |   Bearer host_token     |  (NestJS)   |              |            |
+-------------+                         +-------------+              +------------+
       ^                                       ^
       | read /proc, batch, gzip               | GET /hosts, /metrics, /processes,
       |                                       |     /alerts, /alert-rules
       |                                       v
+-------------+                         +-------------+
|  Host OS    |                         | Web / TUI   |
|  (Linux)    |                         | (clients)   |
+-------------+                         +-------------+
```

Data flow: Agent → Backend (ingest) → DB; Web/TUI → Backend (read) → DB. Hosts are identified by token hash; users (when `AUTH_ENABLED=true`) authenticate via JWT in cookies.

See [ARCHITECTURE.md](ARCHITECTURE.md) for details.

---

## Installation

- **Docker + Node (minimal):** `git clone ... && cd monstack && make install-docker-only` (or `make up`). Then `make localterm` or `make webterm` (requires Node.js).
- **Full (with Go CLI):** `make install` then `make up`, or one-shot `make up-one` (builds CLI, creates `.env` if needed, starts stack + agent).
- **Bootstrap (Ubuntu/Debian/Kali/Fedora/macOS):**  
  `curl -fsSL https://raw.githubusercontent.com/KuzmunKirill3384/monstack/main/scripts/bootstrap.sh | bash`

Requirements: Docker (and docker compose), Node.js 20+ (for web and Node TUI). For agent and CLI: Go 1.22+. See [INSTALLATION.md](INSTALLATION.md).

---

## Quick Start

```bash
git clone https://github.com/KuzmunKirill3384/monstack.git ~/monstack
cd ~/monstack
make up-one
```

- **Web:** http://localhost:3001  
- **API:** http://localhost:3000  
- **Swagger:** http://localhost:3000/api/docs  

From repo root: `make localterm` (Node TUI) or `make webterm` (open web in browser). To have `localterm`/`webterm` in PATH: `make term-global`.

---

## Usage

| Command | Description |
|--------|-------------|
| `make up` | Start stack (postgres, backend, web, agent). |
| `make down` | Stop containers. |
| `make check` | Verify backend and web readiness. |
| `make localterm` | Run Node TUI (screens 1–5, Enter/s/f/r/q). |
| `make webterm` | Start stack and open web UI. |
| `make term-c` | Build and run C TUI (ncurses + curl). |
| `make test` | Run backend, web, and term tests. |

See [USAGE.md](USAGE.md) for CLI options and workflows.

---

## Configuration

Main knobs via environment (e.g. `.env` or docker-compose):

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://postgres:postgres@...` | PostgreSQL connection. |
| `JWT_SECRET` | `change-me-in-production` | Secret for JWT signing. |
| `AUTH_ENABLED` | `false` | Require login for API (seed: demo@test.com / demo). |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3000` | Backend URL for web. |
| `SERVER_URL` / `HOST_ID` / `HOST_TOKEN` | (agent) | Backend URL and host identity for agent. |

See [CONFIGURATION.md](CONFIGURATION.md).

---

## Screenshots / examples

- **Web UI:** After `make up-one`, open http://localhost:3001 for the dashboard (hosts, metrics, processes, alerts, settings).
- **API:** Interactive docs at http://localhost:3000/api/docs (Swagger). Example: `curl -s http://localhost:3000/hosts`.
- **TUI:** Run `make localterm` for the terminal UI (screens 1–5: hosts, processes, metrics, alerts, rules).

---

## Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design, components, data flow. |
| [INSTALLATION.md](INSTALLATION.md) | Requirements, install from source, Docker. |
| [USAGE.md](USAGE.md) | Commands, TUI, typical workflows. |
| [CONFIGURATION.md](CONFIGURATION.md) | Env vars and config files. |
| [API.md](API.md) | HTTP API reference and examples. |
| [DEVELOPMENT.md](DEVELOPMENT.md) | Dev setup, tests, lint, build. |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute. |
| [SECURITY.md](SECURITY.md) | Security model and reporting. |
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | Common issues and fixes. |
| [CHANGELOG.md](CHANGELOG.md) | Version history. |
| [ROADMAP.md](ROADMAP.md) | Planned work. |

Extended docs (runbooks, data model, TUI): [docs/](docs/).

---

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) for workflow, commit conventions, and code requirements.

---

## Security

For security-sensitive issues, see [SECURITY.md](SECURITY.md). Do not report vulnerabilities in public issues.

---

## License

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) and [LICENSE.md](LICENSE.md).
