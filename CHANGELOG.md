# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2025-03-03

### Added

- **Agent (Go):** OS metrics collection (CPU, memory, load, network, disk) and process snapshots from Linux `/proc`; batched JSON ingest with gzip; configurable intervals; Bearer token auth.
- **Backend (NestJS):** Ingest endpoint `POST /v1/ingest`; REST API for hosts, metrics, processes, alert rules and events; optional JWT auth (login, logout, me, change-password); Prisma + PostgreSQL; health and ready endpoints; rate limiting (ingest and read); retention cron; optional aggregation (1m, 5m); pagination for metrics and processes; Swagger at `/api/docs`.
- **Web (Next.js):** Dashboard with hosts list, host detail (metrics charts and process table), dashboards (overview), alerts and alert rules, settings (profile and change password); login and returnUrl; onboarding overlay; empty states and loading skeletons; global error boundary and API error handling; responsive layout and mobile sidebar; breadcrumbs and documentation link.
- **TUI:** Node.js (blessed) and C (ncurses) terminal UIs for hosts, processes, metrics, alerts, and rules.
- **CLI:** `monstack-cli up` for one-command stack startup; `.env` generation; integrated in `make up-one`.
- **Docker:** Compose setup for postgres, backend, web, agent; optional TimescaleDB override; healthchecks.
- **Scripts:** Bootstrap, install-all, check-stack, check-deps, enable-timescale.
- **Tests:** Backend unit and E2E; web Vitest and build; agent Go tests; Node TUI tests; k6 load tests; chaos tests.
- **Documentation:** Architecture, installation, usage, configuration, API, development, contributing, security, troubleshooting, changelog, roadmap; extended docs in `docs/`.

### Security

- Optional JWT-based auth for read API; HttpOnly cookie; change-password endpoint.
- Host token auth for ingest; rate limits; configurable secrets via env.

---

## [Unreleased]

- See [ROADMAP.md](ROADMAP.md) for planned work.
