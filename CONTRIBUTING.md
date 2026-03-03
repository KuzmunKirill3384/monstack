# Contributing

Рекомендации по разработке и внесению изменений в Monitoring Stack.

---

## Требования

- **Node.js** 20+
- **Go** 1.22+ (для agent)
- **Docker** (для postgres, backend, web, agent)
- **macOS / Linux** (агент читает `/proc`, работает только на Linux; в Docker — Linux-контейнер)

---

## Локальная разработка

```bash
make install
make up
make check
```

### Backend

```bash
cd backend
npm run start:dev    # watch mode
```

Миграции: `npx prisma migrate dev` при изменении schema. Seed: `npx prisma db seed`.

### Web

```bash
cd web
npm run dev
```

### TUI

```bash
make term         # Node TUI
make term-c       # C TUI (нужны ncurses, curl)
```

---

## Тесты

Полный прогон как в CI — см. [docs/runbook.md](docs/runbook.md) (раздел «Как запускать тесты» и «CI тесты падают»).

По компонентам:

| Команда | Описание |
|---------|----------|
| `cd backend && npm test` | Unit-тесты (Jest): сервисы, контроллеры |
| `cd backend && npm run test:e2e` | E2E: health, ready, auth (моки Prisma) |
| `cd web && npm test` | Vitest + RTL: api, useAuth, Sparkline, StatPanel, login |
| `cd web && npm run lint` | ESLint |
| `cd web && npm run build` | Проверка сборки Next.js |
| `cd agent && go test ./...` | Тесты Go: config, encoder, transport |
| `cd tools/term && npm test` | Node TUI: utils, config, api |
| `make term-check` | TUI smoke (ожидается exit 1 при недоступном API) |

---

## Стиль

- **Backend:** ESLint + Prettier. `npm run lint`, `npm run format`.
- **Web:** ESLint (конфиг Next.js).
- **Документация:** Markdown в `docs/`, единый стиль заголовков и таблиц.

---

## Перед PR

1. Backend: `cd backend && npm run lint && npm run build && npm test && npm run test:e2e`
2. Web: `cd web && npm run lint && npm run build && npm test`
3. Agent: `cd agent && go build ./cmd/agent && go test ./...`
4. Term: `cd tools/term && npm test && make term-check`

---

## Коммиты

Желательно префиксы: `feat:`, `fix:`, `docs:`, `test:`, `chore:` (Conventional Commits).
