# Monstack modernization plan

Incremental work items for packaging, security, observability and deployment. Each major component is implemented with clean commits; open a PR per component linking to this plan.

---

## Phase 1: CLI (monstack-cli) — DONE

- **Created:** Go CLI in `monstack-cli/` with commands: `install`, `start`, `stop`, `status`, `upgrade`, `uninstall`.
- **Behaviour:** Detects OS/arch; generates `.env` with secure defaults (random JWT, agent secret, optional admin password); uses Docker Compose in `--dir`; checks Docker availability and prints hints if missing.
- **Backend:** Seed reads `ADMIN_PASSWORD` and `ADMIN_EMAIL` from env (CLI can set them in `.env`).
- **Build:** `make cli-build` from repo root; see `monstack-cli/README.md`.

---

## Phase 2: Repository refactor — TODO

- Extract Go agent into a separate importable module (e.g. `pkg/agent` or keep `agent/` as a standalone module with `go.work`).
- Adopt a monorepo tool: **Nx** or **Turborepo** for backend + web (deps, cache, lint, test).
- Standardize formatting: **Prettier** for TS/JS (already in backend/web); **gofmt** for Go; **.editorconfig** added.

---

## Phase 3: TimescaleDB — TODO

- Migrate `metrics_raw` and `proc_snapshots` to Timescale hypertables.
- Add continuous aggregates: 1 min, 5 min, 1 hour.
- Retention: 30 days raw, 90 days (1 min), 180 days (5 min / 1 hour).
- Expose retention and aggregates via Prisma migrations or SQL migrations in repo.

---

## Phase 4: Security — TODO

- JWT auth behind `AUTH_ENABLED` (already present; verify and document).
- Rate limiting for ingest per host token + body size checks (extend existing rate-limit).
- HTTPS: nginx reverse proxy with optional Let's Encrypt (e.g. certbot or Traefik).

---

## Phase 5: Extend functionality — TODO

- Endpoints to send OS signals to processes on hosts + agent handlers (partially present; complete and document).
- Extra metrics: per-CPU, disk I/O, temperatures.
- User dashboards: configurable widgets and default time ranges.
- Alert notifications: email, Slack, Telegram, webhooks.

---

## Phase 6: Observability — TODO

- Backend logging: JSON format; correlation IDs along the request path.
- Prometheus endpoint: request count, latency, error rate.
- Unit and e2e tests for ingest, alerting, web UI; CI/CD pipelines.

---

## Phase 7: Documentation and deployment — TODO

- Update README and docs for new installation (CLI, optional registry images).
- Provide: systemd unit files, Ansible role(s), Helm chart.
- Runbook: troubleshooting and curl examples for all API endpoints.
