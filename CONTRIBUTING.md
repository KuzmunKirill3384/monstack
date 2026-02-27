# Contributing

Рекомендации по разработке и contribution в Monitoring Stack.

---

## Требования

- **Node.js** 20+
- **Go** 1.22+ (для agent)
- **Docker** (для postgres, backend, web, agent)
- **macOS / Linux** (agent читает `/proc`, работает только на Linux; в Docker — Linux-контейнер)

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

```bash
make test
```

Или по отдельности:

| Команда | Описание |
|---------|----------|
| `cd backend && npm test` | Unit-тесты (Jest) |
| `cd backend && npm run test:e2e` | E2E (health, ready) |
| `cd web && npm run lint` | ESLint |
| `cd web && npm run build` | Проверка сборки |
| `cd tools/term && npm test` | Utils (sparkline, sortProcs) |
| `make term-check` | TUI smoke (выход при недоступном API) |

---

## Стиль

- **Backend:** ESLint + Prettier. `npm run lint`, `npm run format`.
- **Web:** ESLint (Next.js config).
- **Документация:** Markdown в `docs/`, единый стиль заголовков и таблиц.

---

## Перед PR

1. `make test` — проходит
2. `make term-check` — OK
3. Backend: `npm run lint`, `npm run build`
4. Web: `npm run lint`, `npm run build`

---

## Структура коммитов

Желательно: `feat:`, `fix:`, `docs:`, `test:`, `chore:` по Conventional Commits.
