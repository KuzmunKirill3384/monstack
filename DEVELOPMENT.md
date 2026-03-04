# Разработка

Руководство для разработчиков: структура проекта, стиль кода, тесты и сборка.

---

## 1. Структура проекта

```
monstack/
├── agent/                 # Агент на Go (метрики и процессы → бэкенд)
│   ├── cmd/agent/         # main.go
│   └── ...
├── backend/               # API на NestJS (Fastify, Prisma)
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── auth/          # login, logout, me, change-password
│   │   ├── ingest/        # POST /v1/ingest
│   │   ├── hosts/         # GET hosts, signal
│   │   ├── metrics/       # GET metrics
│   │   ├── processes/     # GET processes
│   │   ├── alerts/        # события, правила, cron, stream
│   │   ├── prisma/        # PrismaModule
│   │   └── common/        # guards, logger
│   └── prisma/            # schema.prisma, migrations
├── web/                   # Next.js (App Router)
│   └── src/
│       ├── app/           # страницы, layout, providers
│       ├── components/
│       ├── lib/           # api, auth, utils
│       ├── hooks/
│       └── contexts/
├── monstack-cli/          # CLI на Go (команда up)
├── tools/
│   ├── term/              # Node TUI (blessed)
│   └── term-c/            # C TUI (ncurses, curl)
├── scripts/               # bootstrap, install, check, timescale
├── docs/                  # расширенная документация
├── tests/                 # k6 load, chaos
├── docker-compose.yml
├── Makefile
└── package.json           # корень; bins: localterm, webterm
```

---

## 2. Требования

- Node.js 20+
- Go 1.22+ (для агента и CLI)
- Docker и docker compose
- macOS или Linux (агент читает `/proc`, в продакшене — Linux)

---

## 3. Локальный запуск

```bash
make install
make up
```

Бэкенд (с watch):

```bash
cd backend && npm run start:dev
```

Веб (режим разработки):

```bash
cd web && npm run dev
```

Бэкенд: http://localhost:3000. Веб: http://localhost:3001. В `.env` указать `DATABASE_URL` на вашу postgres (например из compose).

---

## 4. База данных (Prisma)

- Генерация клиента: `cd backend && npx prisma generate`
- Применение миграций: `npx prisma migrate deploy` (или `migrate dev` в разработке)
- Seed: `npx prisma db seed`
- Studio: `npx prisma studio`

---

## 5. Стиль кода

- **Бэкенд:** ESLint + Prettier. Запуск: `npm run lint`, `npm run format`.
- **Веб:** ESLint (конфиг Next.js). Запуск: `npm run lint`.
- **Go:** gofmt; следовать стандартному стилю Go.
- **Коммиты:** желательно Conventional Commits (feat:, fix:, docs:, test:, chore:).

---

## 6. Тесты

| Компонент | Команда |
|-----------|---------|
| Unit бэкенда | `cd backend && npm test` |
| E2E бэкенда | `cd backend && npm run test:e2e` |
| Веб | `cd web && npm test` |
| Сборка веба | `cd web && npm run build` |
| Агент | `cd agent && go test ./...` |
| Node TUI | `cd tools/term && npm test` |
| Smoke TUI | `make term-check` |

Полный прогон (как в CI):

```bash
make test
```

---

## 7. Линтеры и сборка

- Бэкенд: `cd backend && npm run lint && npm run build`
- Веб: `cd web && npm run lint && npm run build`
- Агент: `cd agent && go build ./cmd/agent`

---

## 8. Отладка

- Бэкенд: запуск через `npm run start:dev`; точки останова в IDE (Node inspector).
- Веб: dev-сервер Next.js; React DevTools и вкладка Network.
- Агент: запуск бинарника с путём к конфигу; логи в stdout (или настроенный логгер).
- БД: Prisma Studio или прямой psql.

---

## 9. Диаграммы

Генерация PNG из PlantUML:

```bash
make diagrams
```

Требуется Docker и образ `plantuml/plantuml`. Результат: `docs/diagrams/*.png`.
