# monstack-cli

CLI to install and manage a Monstack deployment. Detects OS/arch, generates a secure `.env`, and runs Docker Compose.

## Build

From repo root:

```bash
make cli-build
```

Or from this directory:

```bash
go build -o monstack-cli .
```

## Commands

| Command     | Description |
|------------|-------------|
| `install`  | Check Docker (and optionally Node), generate `.env` with random JWT/agent secrets and optional admin password. Requires `docker-compose.yml` in `--dir`. |
| `start`    | Run `docker compose up -d` (optionally `--build`, `--with-agent`). |
| `stop`     | Run `docker compose down`. |
| `status`   | Run `docker compose ps`. |
| `upgrade`  | Pull images and recreate containers. |
| `uninstall`| Down containers; use `--volumes` to remove data. |
| `version`  | Print version and OS/arch. |

## Usage (from repo root)

```bash
# Generate .env and optionally start with agent
./monstack-cli install --dir .
./monstack-cli start --dir . --build --with-agent

# Override secrets
./monstack-cli install --dir . --jwt-secret=xxx --agent-secret=yyy --admin-password=zzz

# Stop / status
./monstack-cli stop --dir .
./monstack-cli status --dir .
```

## Requirements

- **Docker** and **Docker Compose** (plugin or standalone). If missing, the CLI prints the install link.
- **Node.js** is only required for local TUI (`make localterm`); not required for the CLI or for running the stack in Docker.

## Environment

Generated `.env` (in `--dir`) includes:

- `JWT_SECRET` — random if not provided.
- `AGENT_COMMAND_SECRET` — random if not provided.
- `ADMIN_PASSWORD` — optional; if set, use it when the backend seed supports it.
- `AUTH_ENABLED`, `DATABASE_URL` — defaults.

Use `--overwrite-env` to regenerate existing secrets.
