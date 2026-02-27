# Диаграммы (PlantUML)

Исходники: `*.puml`. Картинки: `*.png`.

## Как пересобрать

Из корня репозитория:

```bash
make diagrams
```

Нужен Docker. Используется образ [plantuml/plantuml](https://hub.docker.com/r/plantuml/plantuml).

Без Docker можно сгенерировать вручную, если установлен [PlantUML](https://plantuml.com/):

```bash
cd docs/diagrams
plantuml -tpng *.puml
```

## Файлы

| Файл | Описание |
|------|----------|
| `architecture.puml` | Уровни системы: пользователь → backend → агент и БД |
| `data-flow.puml` | Поток данных: Agent → Backend → PostgreSQL; Web/TUI → Backend |
| `docker.puml` | Docker Compose: контейнеры и зависимости |
| `lifecycle.puml` | Последовательность: хост → агент → backend → БД → клиент |
| `repo.puml` | Структура репозитория (пакеты и компоненты) |
