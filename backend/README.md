# Backend (Monitoring Stack)

NestJS + Fastify + Prisma: приём метрик от агента (POST /v1/ingest), API для хостов, метрик, процессов, алертов и правил, опциональная JWT-авторизация.

## Требования

- Node.js 20+
- PostgreSQL (или Docker: `make up` из корня)

## Установка и запуск

```bash
npm ci
npx prisma generate
npm run start:dev    # разработка с watch
```

Миграции при изменении схемы: `npx prisma migrate dev`. Seed: `npx prisma db seed`.

## Тесты

```bash
npm test             # unit (Jest)
npm run test:e2e     # E2E (health, ready, auth с моками Prisma)
```

Переменные для E2E задаются в `test/env-e2e.js` (JWT_SECRET, PASSWORD_SALT).

## Переменные окружения

| Переменная | Описание |
|------------|----------|
| DATABASE_URL | URL PostgreSQL |
| AUTH_ENABLED | `true` — включить JWT для API |
| JWT_SECRET | Секрет для подписи JWT |
| PASSWORD_SALT | Соль для хеша паролей |
| LOG_JSON | `true` — логи в JSON |
| INGEST_RATE_LIMIT_MAX, INGEST_RATE_LIMIT_WINDOW_MS | Rate limit для ingest |

Полный список: см. корневой `.env.example` и [документацию](../docs/README.md).

## Документация

- [Архитектура backend](../docs/ARCHITECTURE.md)
- [API (контракты и Swagger)](../docs/api-contracts.md) · Swagger: http://localhost:3000/api/docs
- [Runbook](../docs/runbook.md)
