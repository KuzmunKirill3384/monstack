# Справочник API

Бэкенд Monstack предоставляет REST API. Интерактивная документация: **http://localhost:3000/api/docs** (Swagger) при запущенном бэкенде.

Базовый URL: `http://localhost:3000` (или хост вашего бэкенда). Ingest использует префикс пути `/v1`; остальные маршруты без глобального префикса.

---

## 1. Health

| Метод | Путь | Авторизация | Описание |
|-------|------|-------------|----------|
| GET | /health | Нет | Liveness; возвращает `{ "status": "ok" }`. |
| GET | /ready | Нет | Readiness (проверка БД); возвращает `{ "status": "ok" }`. |

---

## 2. Авторизация (при AUTH_ENABLED=true)

| Метод | Путь | Тело | Ответ |
|-------|------|------|--------|
| POST | /auth/login | `{ "email", "password" }` | 200 + access_token + Set-Cookie (HttpOnly). 401 при неверных данных. |
| POST | /auth/logout | — | Очистка cookie. |
| GET | /auth/me | — | 200 + `{ id, email }` или anonymous. Опциональный JWT. |
| POST | /auth/change-password | `{ "currentPassword", "newPassword" }` | 200 или 401 (неверный пароль). Требуется JWT. |

Пример входа (сохранить cookie для последующих запросов):

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@test.com","password":"demo"}' \
  -c cookies.txt -b cookies.txt
```

---

## 3. Ingest (агент)

| Метод | Путь | Заголовки | Тело |
|-------|------|-----------|------|
| POST | /v1/ingest | Authorization: Bearer \<host_token\>, Content-Type: application/json, опционально Content-Encoding: gzip | IngestBatchDTO |

**IngestBatchDTO:** host_id (UUID), ts (ISO8601), metrics (объект с cpu_total_pct, load1, load5, load15, mem_used_mb, mem_total_mb, disk_used_pct, net_rx_bps, net_tx_bps), processes (массив объектов с pid, name, cpu_pct, rss_mb, io_read_bps, io_write_bps, state, cmd).

Ответы: 204 No Content (успех), 400 (невалидное тело/host_id), 401 (неверный или отсутствующий токен).

---

## 4. Хосты

| Метод | Путь | Query | Ответ |
|-------|------|-------|--------|
| GET | /hosts | опционально `online=true|false` | Массив Host (id, name, os, arch, tags, createdAt, lastSeenAt, online, lastMetric). |
| GET | /hosts/:id | — | Один Host или 404. |

---

## 5. Метрики

| Метод | Путь | Query | Ответ |
|-------|------|-------|--------|
| GET | /metrics | host (обяз.), from (ISO8601), to (ISO8601), resolution (опц.: raw, 1m, 5m) | Массив точек (ts, cpu_total_pct, load1, load5, load15, mem_used_mb, mem_total_mb, disk_used_pct, net_rx_bps, net_tx_bps). |

Пример:

```bash
curl -s "http://localhost:3000/metrics?host=HOST_ID&from=2025-01-01T00:00:00Z&to=2025-01-01T01:00:00Z&resolution=1m"
```

---

## 6. Процессы

| Метод | Путь | Query | Ответ |
|-------|------|-------|--------|
| GET | /processes | host (обяз.), from, to (ISO8601), limit | Массив ProcSnapshot (ts, pid, name, cmd, cpu_pct, rss_mb, io_read_bps, io_write_bps, state). |

---

## 7. Сигнал процессу на хосте

| Метод | Путь | Тело | Ответ |
|-------|------|------|--------|
| POST | /hosts/:id/processes/:pid/signal | `{ "signal": "SIGTERM" \| "SIGKILL" }` | 200 или 4xx. Требуется agent_url у хоста и общий AGENT_COMMAND_SECRET. |

---

## 8. Алерты

| Метод | Путь | Query | Ответ |
|-------|------|-------|--------|
| GET | /alerts | host, status (firing|ok), from, to | Массив событий алертов. |
| GET | /alerts/stream | — | SSE-поток событий. |

---

## 9. Правила алертов

| Метод | Путь | Тело | Ответ |
|-------|------|------|--------|
| GET | /alert-rules | опционально host (UUID) | Массив правил. |
| POST | /alert-rules | hostId?, metric, op, threshold?, window?, severity?, enabled? | 201 + объект правила. |
| PATCH | /alert-rules/:id | Частичный объект { enabled?, threshold?, ... } | Обновлённое правило. |
| DELETE | /alert-rules/:id | — | 204. |

Операторы: gt, lt, gte, lte, eq. Метрики: например cpu_total_pct, load1, mem_used_mb, disk_used_pct.

Пример:

```bash
curl -X POST http://localhost:3000/alert-rules \
  -H "Content-Type: application/json" \
  -d '{"metric":"cpu_total_pct","op":"gt","threshold":90,"severity":"critical","enabled":true}'
```

---

## 10. Rate limit и ошибки

- **Ingest:** rate limit по Authorization (или IP) на `/v1/ingest` (настраивается; по умолчанию например 120/мин). При превышении — 429.
- **Чтение:** общий лимит GET-запросов с одного IP (настраивается). При превышении — 429.
- **Ошибки:** 400 (валидация), 401 (не авторизован), 403 (доступ запрещён), 404 (не найдено), 429 (rate limit), 5xx (ошибка сервера). В теле может быть message или детали валидации.

Полные схемы запросов и ответов и возможность «попробовать» — в **http://localhost:3000/api/docs**.
