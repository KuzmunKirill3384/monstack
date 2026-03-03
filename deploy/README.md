# Деплой Monitoring Stack

Примеры конфигурации для развёртывания в продакшене.

---

## Обзор

| Файл | Назначение |
|------|------------|
| **nginx.conf.example** | Пример reverse proxy с TLS: проксирование на backend (API, /v1/ingest) и web (Next.js). Терминация SSL на nginx. |
| **agent-systemd.service** | Systemd unit для Go-агента: запуск от пользователя `monagent` с конфигом `/etc/monagent/config.yaml`, перезапуск при сбое, логи в journald. |

---

## Nginx

- Backend: порт 3000 (API, /health, /ready, /v1/ingest, /auth, /hosts, /metrics и т.д.).
- Web: порт 3001 (Next.js).
- Настроить `ssl_certificate` и `ssl_certificate_key`; при необходимости увеличить `client_max_body_size` для ingest (по умолчанию 1 MB на backend).
- Для cookie авторизации убедиться, что домен и SameSite корректны (например SameSite=Lax при одном домене).

---

## Агент (systemd)

1. Собрать бинарник: `cd agent && go build -o monagent ./cmd/agent`.
2. Установить в `/usr/local/bin/monagent` (или путь в `ExecStart`).
3. Создать пользователя и конфиг:
   - `useradd -r monagent`
   - Конфиг в `/etc/monagent/config.yaml` (server_url, host_id, host_token и др.; см. [документацию агента](../docs/TUI.md) и конфиг в репозитории).
4. Скопировать `agent-systemd.service` в `/etc/systemd/system/`, отредактировать пути при необходимости.
5. `systemctl daemon-reload && systemctl enable --now monagent`.

Логи: `journalctl -u monagent -f`.

---

## Рекомендации

- Секреты (JWT_SECRET, PASSWORD_SALT, DATABASE_URL, host_token) хранить через переменные окружения или секрет-менеджер, не в репозитории.
- Healthcheck backend: использовать GET /ready в балансировщиках и оркестраторах.
- Полная документация: [docs/README.md](../docs/README.md), [runbook](../docs/runbook.md).
