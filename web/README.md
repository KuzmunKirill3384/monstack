# Web (Monitoring Stack)

Next.js-дашборд: список хостов, страница хоста с графиками метрик и таблицей процессов, алерты и правила. Опциональный вход по логину при `AUTH_ENABLED=true` на backend.

## Требования

- Node.js 20+
- Backend API (например `make up` из корня)

## Установка и запуск

```bash
npm ci
npm run dev     # http://localhost:3001 (порт в next.config при необходимости)
```

Сборка: `npm run build`. Запуск продакшена: `npm run start`.

## Тесты

```bash
npm test        # Vitest + React Testing Library (api, useAuth, Sparkline, StatPanel, login)
npm run lint
```

## Переменные окружения

| Переменная | Описание |
|------------|----------|
| NEXT_PUBLIC_API_URL | URL backend API (по умолчанию http://localhost:3000) |

## Документация

- [Архитектура и TUI](../docs/README.md)
- [API и Runbook](../docs/api-contracts.md), [runbook](../docs/runbook.md)
