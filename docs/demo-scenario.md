# Demo-сценарий

Быстрый запуск и проверка системы.

---

## 1. Запуск стека

```bash
make install
make up
```

Миграции и seed применяются при старте backend. Дефолтный хост и пользователь создаются автоматически.

---

## 2. Проверка готовности

```bash
make check
```

Ожидаем: `OK backend`, `OK web`.

---

## 3. Веб и TUI

| Действие | Команда |
|----------|---------|
| Дашборд в браузере | http://localhost:3001 или `webterm` |
| Node TUI | `make term` или `localterm` |
| C TUI | `make term-c` |

---

## 4. Первый хост (если agent в контейнере)

При `make up` agent уже запущен. Через 10–30 с хост появится в списке. Если пусто — проверьте `docker compose logs agent`.

---

## 5. Добавить хост вручную (агент на своей машине)

```bash
# Вставить хост
docker compose exec postgres psql -U postgres -d monitoring -c "
  INSERT INTO \"Host\" (id, name, token_hash, \"created_at\")
  VALUES (gen_random_uuid(), 'my-server',
    encode(sha256('my-token'), 'hex'), NOW());
"

# Узнать id
docker compose exec postgres psql -U postgres -d monitoring -c "SELECT id, name FROM \"Host\";"
```

На Linux-машине: собрать agent, в конфиге указать `host_id`, `host_token`, запустить.

---

## 6. Правило алерта

Через веб: Alerts → Rules → Create. Или API:

```bash
curl -X POST http://localhost:3000/alert-rules \
  -H "Content-Type: application/json" \
  -d '{"hostId":null,"metric":"cpu_total_pct","op":">","threshold":90}'
```

Cron проверяет правила каждые 2 минуты.
