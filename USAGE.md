# Использование

В документе описаны запуск и использование Monstack: цели Make, CLI, TUI и веб-интерфейс.

---

## 1. Цели Make

Из корня репозитория:

| Цель | Описание |
|------|-----------|
| `make up` | Запуск стека (postgres, backend, web, agent). |
| `make down` | Остановка контейнеров. |
| `make check` | Проверка готовности backend и web. |
| `make logs` | Просмотр логов docker compose. |
| `make install` | Установка зависимостей backend, web, term; npm link для localterm/webterm. |
| `make install-docker-only` | Только запуск стека (без локальной установки Node/Go). |
| `make localterm` | Запуск Node TUI (баннер + TUI). |
| `make webterm` | Поднять стек и открыть веб в браузере. |
| `make term` | Запуск Node TUI из `tools/term` (без баннера). |
| `make term-c` | Сборка при необходимости и запуск C TUI. |
| `make term-global` | Установка term и link, чтобы localterm/webterm были в PATH. |
| `make up-one` | Сборка CLI, создание .env при отсутствии, запуск `./bin/monstack-cli up`. |
| `make cli-build` | Сборка `./bin/monstack-cli`. |
| `make test` | Запуск тестов backend, web и term. |
| `make clean` | Удаление node_modules и бинарника C TUI. |
| `make diagrams` | Генерация PNG из `docs/diagrams/*.puml` (нужен образ Docker plantuml). |

---

## 2. CLI (monstack-cli)

Сборка: `make cli-build`; бинарник: `./bin/monstack-cli`.

### up

```bash
./bin/monstack-cli up --dir .
```

Создаёт `.env` при отсутствии, запускает `docker compose up -d --build` в указанной директории. Используется в `make up-one`.

---

## 3. Node TUI

- **Запуск:** `make localterm` или `make term` (или `localterm` / `npm run localterm` при наличии link).
- **Экраны:** 1–5 или F1–F5: хосты, процессы, метрики, алерты, правила алертов.
- **Клавиши:** Enter (выбор), s (сортировка), f (фильтр), r (обновить), q (выход).
- **Переменные:** `API_URL` (по умолчанию http://localhost:3000), `TUI_REFRESH_MS`, `TUI_THEME`, `TUI_PROCESS_LIMIT`.

Подробнее: `docs/TUI.md`.

---

## 4. C TUI

- **Сборка и запуск:** `make term-c` (собирает `tools/term-c/monterm` при необходимости).
- **Требования:** gcc, ncurses, libcurl.
- **Экраны:** 4; обновление около 500 ms.

---

## 5. Веб-интерфейс

- **URL:** http://localhost:3001 (после `make up` или `make up-one`).
- **Страницы:** Хосты, детализация хоста (метрики и процессы), Дашборды, Алерты, Правила алертов, Настройки.
- **Авторизация:** при `AUTH_ENABLED=true` вход на `/login` (пользователь из seed: demo@test.com / demo).
- **API:** базовый URL задаётся через `NEXT_PUBLIC_API_URL` (по умолчанию http://localhost:3000).

---

## 6. Типовые сценарии

### Первый запуск (полный стек)

```bash
make up-one
make check
# Открыть http://localhost:3001 или выполнить make webterm
```

### Разработка (бэкенд и веб локально)

```bash
make up          # postgres и при необходимости agent; или запуск backend/web в контейнерах
cd backend && npm run start:dev
cd web    && npm run dev
# Backend :3000, Web :3001
```

### Добавление нового хоста (удалённый сервер)

1. Создать хост в БД и задать `token_hash` = SHA256(host_token). Либо использовать существующий хост и заменить токен.
2. На сервере: собрать агент (`cd agent && go build -o monagent ./cmd/agent`), настроить server_url, host_id, host_token.
3. Запустить агент (systemd или вручную). Хост появится в UI после первого успешного ingest.

### Алерты

1. Открыть «Правила алертов» в вебе или TUI.
2. Создать правило: метрика (например cpu_total_pct), оператор (например gt), порог (например 90), окно (например 5m).
3. События появятся в «Алерты» при срабатывании; опционально SSE-поток для обновлений в реальном времени.
