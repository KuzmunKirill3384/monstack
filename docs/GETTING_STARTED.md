# Getting Started: мониторинг нескольких серверов

Пошаговая инструкция: развёртывание Monstack на одном управляющем сервере и подключение агентов на удалённых машинах.

---

## Архитектура

```
┌──────────┐    ┌──────────┐    ┌──────────┐
│ Server A │    │ Server B │    │ Server C │
│  agent   │    │  agent   │    │  agent   │
└────┬─────┘    └────┬─────┘    └────┬─────┘
     │               │               │
     │  POST /v1/ingest (gzip)       │
     └───────────┐   │   ┌───────────┘
                 ▼   ▼   ▼
           ┌─────────────────┐
           │  Control Node   │
           │  backend :3000  │
           │  web     :3001  │
           │  postgres :5432 │
           └─────────────────┘
```

---

## Требования

| Компонент | Где | Что нужно |
|-----------|-----|-----------|
| Control node | Один сервер | Docker, docker compose, 2 GB RAM, порты 3000/3001 |
| Каждый целевой сервер | Linux | Go 1.22+ (для сборки агента) или готовый бинарник |

---

## Шаг 1. Разверните стек на управляющем сервере

```bash
git clone https://github.com/KuzmunKirill3384/monstack.git ~/monstack
cd ~/monstack
make up-one
```

Проверка готовности:

```bash
curl -s http://localhost:3000/ready
# {"status":"ok"}
```

Веб-интерфейс: http://<control-node-ip>:3001

---

## Шаг 2. Зарегистрируйте хосты в БД

Для каждого сервера создайте запись с уникальным именем и токеном:

```bash
# Server A
docker compose exec postgres psql -U postgres -d monitoring -c "
  INSERT INTO \"Host\" (id, name, token_hash, \"created_at\")
  VALUES (gen_random_uuid(), 'server-a',
    encode(sha256('token-server-a'), 'hex'), NOW());
"

# Server B
docker compose exec postgres psql -U postgres -d monitoring -c "
  INSERT INTO \"Host\" (id, name, token_hash, \"created_at\")
  VALUES (gen_random_uuid(), 'server-b',
    encode(sha256('token-server-b'), 'hex'), NOW());
"

# Server C
docker compose exec postgres psql -U postgres -d monitoring -c "
  INSERT INTO \"Host\" (id, name, token_hash, \"created_at\")
  VALUES (gen_random_uuid(), 'server-c',
    encode(sha256('token-server-c'), 'hex'), NOW());
"
```

Запомните id каждого хоста:

```bash
docker compose exec postgres psql -U postgres -d monitoring -c \
  "SELECT id, name FROM \"Host\";"
```

---

## Шаг 3. Установите и запустите агент на каждом сервере

На каждой Linux-машине:

```bash
# Сборка агента (нужен Go 1.22+)
git clone https://github.com/KuzmunKirill3384/monstack.git ~/monstack
cd ~/monstack/agent
go build -o /usr/local/bin/monagent ./cmd/agent
```

Создайте конфиг `/etc/monagent/config.yaml`:

```yaml
server_url: "http://<control-node-ip>:3000"
host_id: "<uuid из шага 2>"
host_token: "token-server-a"   # тот же токен, что в sha256 при INSERT

interval_sec: 10
process_interval_sec: 30
process_top_n: 15
log_level: "info"

disk_paths:
  - "/"

http_timeout_sec: 30
http_retries: 3
```

Запуск:

```bash
monagent -config /etc/monagent/config.yaml
```

Для продакшена — через systemd (пример в [deploy/README.md](../deploy/README.md)):

```ini
[Unit]
Description=Monstack Agent
After=network-online.target

[Service]
ExecStart=/usr/local/bin/monagent -config /etc/monagent/config.yaml
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

---

## Шаг 4. Проверьте, что хосты появились

Через 10-30 секунд после запуска агентов:

```bash
curl -s http://<control-node-ip>:3000/hosts | python3 -m json.tool
```

Все три сервера должны быть в списке с `"online": true`.

В веб-интерфейсе (http://<control-node-ip>:3001) хосты отображаются с индикатором зелёный = online.

---

## Шаг 5. Создайте правила алертов

CPU > 90% на всех хостах:

```bash
curl -X POST http://localhost:3000/alert-rules \
  -H "Content-Type: application/json" \
  -d '{
    "metric": "cpu_total_pct",
    "op": ">",
    "threshold": 90,
    "severity": "critical",
    "enabled": true
  }'
```

Память > 80% на конкретном хосте:

```bash
curl -X POST http://localhost:3000/alert-rules \
  -H "Content-Type: application/json" \
  -d '{
    "hostId": "<uuid server-a>",
    "metric": "mem_used_pct",
    "op": ">",
    "threshold": 80,
    "severity": "warning",
    "enabled": true
  }'
```

Диск > 95%:

```bash
curl -X POST http://localhost:3000/alert-rules \
  -H "Content-Type: application/json" \
  -d '{
    "metric": "disk_used_pct",
    "op": ">",
    "threshold": 95,
    "severity": "critical",
    "enabled": true
  }'
```

Host down (агент перестал слать данные):

```bash
curl -X POST http://localhost:3000/alert-rules \
  -H "Content-Type: application/json" \
  -d '{
    "hostId": "<uuid server-a>",
    "metric": "host_down",
    "op": ">",
    "threshold": 0,
    "severity": "critical",
    "enabled": true
  }'
```

Cron проверяет правила каждые 2 минуты. События алертов: `GET /alerts?status=firing`.

---

## Что дальше

- Мониторинг через TUI: `make localterm` (из корня репо на управляющем сервере)
- Swagger документация API: http://<control-node-ip>:3000/api/docs
- Диагностика проблем: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- Полная документация: [docs/README.md](README.md)
