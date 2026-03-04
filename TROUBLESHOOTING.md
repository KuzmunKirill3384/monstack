# Устранение неполадок

Типичные проблемы и решения Monstack. Чеклисты и runbook: [docs/runbook.md](docs/runbook.md).

---

## 1. Установка и зависимости

### Docker или docker compose не найден

- Установите [Docker Engine](https://docs.docker.com/engine/install/) и убедитесь, что доступен Docker Compose v2 (`docker compose version`).
- В Linux при необходимости добавьте пользователя в группу `docker`.

### Устаревшая версия Node или Go

- Node: нужна 20 LTS или новее (`node -v`). Установка с nodejs.org или через nvm.
- Go: 1.22+ (`go version`). Установка с go.dev.

### make: команда не найдена

- В Windows используйте WSL или другое Unix-подобное окружение. В macOS/Linux — Xcode Command Line Tools или build-essential.

---

## 2. Стек и сервисы

### Контейнер backend unhealthy или не стартует

- Логи: `docker compose logs backend`.
- Убедитесь, что postgres в состоянии healthy: `docker compose ps` и `docker compose logs postgres`.
- Проверьте `DATABASE_URL` (например `postgresql://postgres:postgres@postgres:5432/monitoring`).
- При падении миграций: `docker compose down -v` (удалит тома) и снова `make up`. Для сохранения данных — исправить доступ к БД и выполнить миграции вручную.

### Веб не подключается или пустой экран

- Проверьте доступность бэкенда: `curl -s http://localhost:3000/ready`.
- Проверьте `NEXT_PUBLIC_API_URL` (для Next.js задаётся на этапе сборки). В Docker он должен соответствовать тому, как браузер обращается к API (например http://localhost:3000).
- В DevTools браузера проверьте ошибки CORS и сети.

### Нет хостов в интерфейсе

- Хосты появляются только после хотя бы одного успешного ingest. В стандартном compose агент уже в контейнере; подождите 10–30 с после `make up`.
- Логи агента: `docker compose logs agent`. Ищите 401 (неверный токен), 413 (слишком большое тело), ошибки соединения.
- Проверка токена: SHA256 токена из конфига агента должен совпадать с `token_hash` в таблице Host для этого хоста.

### Агент: 401 Unauthorized

- Токен в конфиге агента должен соответствовать хосту в БД: `token_hash` = SHA256(host_token). Создайте или обновите запись хоста с правильным `token_hash`.
- Заголовок должен быть `Authorization: Bearer <token>` без лишних пробелов и переносов в токене.

### Агент: 413 Payload Too Large

- Бэкенд ограничивает размер тела ingest (например 1 MB). Уменьшите число процессов в батче в конфиге агента (process_top_n) или увеличьте лимит на бэкенде при возможности.

### 429 Too Many Requests

- Превышен rate limit на ingest или чтение. Увеличьте лимиты через env (INGEST_RATE_LIMIT_MAX, READ_RATE_LIMIT_MAX) или отключите лимит ingest для теста: `INGEST_RATE_LIMIT_DISABLED=1`.

---

## 3. База данных

### Сильный рост БД

- Включите retention: задайте RETENTION_METRICS_DAYS, RETENTION_PROCS_DAYS, RETENTION_ALERTS_DAYS (см. [CONFIGURATION.md](CONFIGURATION.md)).
- Для больших инсталляций рассмотрите TimescaleDB и агрегаты (docs/timescale-retention.md, scripts/enable-timescale.sh).

### Ошибки миграций

- Проверьте `DATABASE_URL` и доступность БД. Выполните `cd backend && npx prisma migrate deploy`.
- При расхождении схемы и БД сделайте бэкап и при необходимости `prisma migrate reset` только в разработке.

---

## 4. Авторизация и вход

### 401 на все запросы к API

- При `AUTH_ENABLED=true` нужен вход. Используйте веб `/login` или POST /auth/login и передавайте cookie (или Bearer) в последующих запросах.
- Пользователь из seed: demo@test.com / demo (после `prisma db seed`).

### Cookie не отправляется / CORS

- В разработке используйте один и тот же origin для веба и API или настройте `CORS_ORIGIN` и передачу credentials. Веб использует `credentials: 'include'`.

---

## 5. TUI

### Node TUI сразу выходит или «backend недоступен»

- Задайте `API_URL` на бэкенд (например http://localhost:3000). При недоступном бэкенде TUI может завершаться — это ожидаемо для `make term-check`.
- Проверьте бэкенд: `curl -s http://localhost:3000/ready`.

### C TUI не собирается

- Установите пакеты разработки ncurses и libcurl (Ubuntu: `libncurses-dev libcurl4-openssl-dev`; macOS: `ncurses` и `curl` через Homebrew). Затем `make term-c` или `cd tools/term-c && make`.

---

## 6. Алерты

### Алерты не срабатывают

- Убедитесь, что правила созданы и включены: раздел «Правила алертов» в UI или GET /alert-rules.
- Проверьте порог и имя метрики (например cpu_total_pct). Крон бэкенда проверяет периодически; учтите окно (например 5m) и интервал проверки.
- В логах бэкенда проверьте ошибки крона алертов.

---

## 7. Дополнительная помощь

- **Логи:** `docker compose logs -f [сервис]`.
- **Health:** `curl -s http://localhost:3000/health` и `curl -s http://localhost:3000/ready`.
- **Документация:** [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md), [docs/runbook.md](docs/runbook.md), [INSTALLATION.md](INSTALLATION.md).

При обнаружении бага создайте issue с версией, шагами и логами (без секретов).
