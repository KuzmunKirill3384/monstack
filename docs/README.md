# Документация

Центральный индекс документации Monitoring Stack.

---

## Обзор

| Документ | Описание |
|----------|----------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Внутренняя архитектура: компоненты, потоки данных, зависимости |
| [design.md](design.md) | Частоты сбора, retention, резолюции метрик |
| [data-model.md](data-model.md) | ER-схема, таблицы БД, индексы |
| [api-contracts.md](api-contracts.md) | API: ingest, hosts, metrics, processes, alerts |
| [TUI.md](TUI.md) | Терминальный интерфейс: Node TUI, C TUI, переменные окружения |
| [roles.md](roles.md) | Роли пользователей, аутентификация |
| [os-metrics.md](os-metrics.md) | Привязка метрик к Linux (/proc, statvfs) |
| [demo-scenario.md](demo-scenario.md) | Сценарий демо: запуск, seed, первый хост |
| [diagrams/README.md](diagrams/README.md) | PlantUML: как генерировать диаграммы |
| [plans/terminal-and-repo.md](plans/terminal-and-repo.md) | План доработки терминала и репо |

---

## Быстрый старт (из корня репо)

```bash
make install-all   # полная установка (Node, Docker, ncurses, npm) — Ubuntu/macOS
# или make install — только npm-пакеты, если всё уже есть
make up            # стек в Docker
make check         # проверка готовности
make term          # Node TUI
```

---

## Структура проекта

```
agent/         Go-агент: сбор метрик, ingest
backend/       NestJS + Fastify + Prisma
web/           Next.js дашборд
tools/term/    Node TUI (blessed)
tools/term-c/  C TUI (ncurses)
scripts/       install-all.sh, install.sh, check-stack.sh, check-deps.sh
docs/          документация
```
