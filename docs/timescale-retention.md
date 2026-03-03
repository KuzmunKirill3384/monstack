# TimescaleDB и агрегаты метрик

## Цель

Снизить нагрузку на запросах за длительные периоды и настроить retention для сырых данных.

## Варианты

### 1. Текущее состояние

- Таблица `metrics_raw` хранит все снимки (интервал сбора ~10 с).
- API поддерживает параметр `resolution`: `raw`, `1m`, `5m`. Сейчас все разрешения отдают сырые данные; агрегация на лету не реализована.

### 2. Переход на TimescaleDB

- Заменить образ PostgreSQL на TimescaleDB в `docker-compose.yml`.
- Преобразовать `metrics_raw` в hypertable по колонке `ts`.
- Настроить retention (например 30 дней для raw) и compression.
- Continuous aggregates для `1m` и `5m` с автоматическим обновлением.

### 3. Агрегаты без TimescaleDB

- Добавить таблицы `metrics_1m`, `metrics_5m` (поля: host_id, ts_bucket, avg/min/max по метрикам).
- Background-job (cron): раз в минуту/5 минут агрегировать из `metrics_raw` в соответствующие таблицы.
- В `MetricsService.findRange()` при `resolution === '1m'` или `'5m'` читать из агрегатов при больших диапазонах.

### 4. Retention

- Политика удаления: например удалять из `metrics_raw` записи старше 30 дней (cron или pg_cron).
- В TimescaleDB — `add_retention_policy()` на hypertable.

## Рекомендуемый порядок

1. Ввести таблицы агрегатов и миграции Prisma.
2. Реализовать job агрегации (NestJS `@Cron` или отдельный скрипт).
3. В сервисе метрик при запросе за период > N часов использовать агрегаты.
4. При росте объёма данных рассмотреть переход на TimescaleDB и continuous aggregates.
