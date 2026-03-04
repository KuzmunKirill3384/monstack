# Development

Guide for developers: project structure, code style, tests, and build.

---

## 1. Project structure

```
monstack/
├── agent/                 # Go agent (metrics + processes → backend)
│   ├── cmd/agent/         # main.go
│   └── ...
├── backend/               # NestJS API (Fastify, Prisma)
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── auth/          # login, logout, me, change-password
│   │   ├── ingest/        # POST /v1/ingest
│   │   ├── hosts/         # GET hosts, signal
│   │   ├── metrics/       # GET metrics
│   │   ├── processes/     # GET processes
│   │   ├── alerts/        # events, rules, cron, stream
│   │   ├── prisma/        # PrismaModule
│   │   └── common/        # guards, logger
│   └── prisma/            # schema.prisma, migrations
├── web/                   # Next.js (App Router)
│   └── src/
│       ├── app/           # pages, layout, providers
│       ├── components/
│       ├── lib/           # api, auth, utils
│       ├── hooks/
│       └── contexts/
├── monstack-cli/          # Go CLI (up command)
├── tools/
│   ├── term/              # Node TUI (blessed)
│   └── term-c/            # C TUI (ncurses, curl)
├── scripts/               # bootstrap, install, check, timescale
├── docs/                  # Extended documentation
├── tests/                 # k6 load, chaos
├── docker-compose.yml
├── Makefile
└── package.json           # root; bins: localterm, webterm
```

---

## 2. Prerequisites

- Node.js 20+
- Go 1.22+ (for agent and CLI)
- Docker and docker compose
- macOS or Linux (agent reads `/proc`, Linux only in production)

---

## 3. Local setup

```bash
make install
make up
```

Backend (watch):

```bash
cd backend && npm run start:dev
```

Web (dev):

```bash
cd web && npm run dev
```

Backend: http://localhost:3000. Web: http://localhost:3001. Use `.env` with `DATABASE_URL` pointing to your postgres (e.g. from compose).

---

## 4. Database (Prisma)

- Generate client: `cd backend && npx prisma generate`
- Apply migrations: `npx prisma migrate deploy` (or `migrate dev` in dev)
- Seed: `npx prisma db seed`
- Studio: `npx prisma studio`

---

## 5. Code style

- **Backend:** ESLint + Prettier. Run: `npm run lint`, `npm run format`.
- **Web:** ESLint (Next.js config). Run: `npm run lint`.
- **Go:** `gofmt`; follow standard Go style.
- **Commits:** Prefer Conventional Commits (feat:, fix:, docs:, test:, chore:).

---

## 6. Tests

| Component | Command |
|-----------|---------|
| Backend unit | `cd backend && npm test` |
| Backend E2E | `cd backend && npm run test:e2e` |
| Web | `cd web && npm test` |
| Web build | `cd web && npm run build` |
| Agent | `cd agent && go test ./...` |
| Node TUI | `cd tools/term && npm test` |
| TUI smoke | `make term-check` |

Full CI-like run:

```bash
make test
```

---

## 7. Linting and build

- Backend: `cd backend && npm run lint && npm run build`
- Web: `cd web && npm run lint && npm run build`
- Agent: `cd agent && go build ./cmd/agent`

---

## 8. Debugging

- Backend: Run with `npm run start:dev`; use breakpoints in IDE (Node inspector).
- Web: Next.js dev server; React DevTools and network tab.
- Agent: Run binary with config path; logs to stdout (or configured logger).
- Database: Use Prisma Studio or direct psql to inspect data.

---

## 9. Diagrams

PNG diagrams from PlantUML sources:

```bash
make diagrams
```

Requires Docker and `plantuml/plantuml` image. Output: `docs/diagrams/*.png`.
