# Документация TUI (терминальный интерфейс)

Содержательное описание терминальной части Monitoring Stack: Node TUI, C TUI, обёртки localterm/webterm.

---

## Обзор

Система предоставляет два TUI-клиента:

| Клиент | Технологии | Экраны | Обновление |
|--------|------------|--------|------------|
| **Node TUI** | Node.js, blessed | 5 (Hosts, Processes, Metrics, Alerts, Rules) | 5 с (по умолчанию) |
| **C TUI** | C, ncurses, libcurl | 4 (Hosts, Processes, Metrics, Alerts) | 500 мс |

Оба проверяют доступность backend (`GET /ready`) при старте и выходят с кодом 1, если backend недоступен.

---

## Node TUI

### Структура

```
tools/term/
├── tui.js       # Точка входа
├── config.js    # Конфиг из env (API_URL, TUI_REFRESH_MS, тема)
├── theme.js     # Цветовые схемы (dark/light), подсказки футера
├── api.js       # API-клиент: apiGet, getMetrics, getProcesses, getAlerts, getAlertRules, checkBackend
└── utils.js     # sortProcs, formatProcRow, sparkline
```

### Экраны

1. **Hosts** — список хостов с CPU, Mem, Last seen. Поиск по имени/ID (`/`). Enter по строке — выбрать хост и перейти к Processes.
2. **Processes** — таблица PID, NAME, CPU%, RSS, STATE. Сортировка (s/S), фильтр (f), смена хоста (h), kill (k).
3. **Metrics** — текущие значения и sparklines по CPU и памяти.
4. **Alerts** — события алертов. Фильтр по status (f).
5. **Rules** — правила алертов. Enter по строке — toggle enabled (PATCH).

### API и надёжность

- **Таймаут:** 10 с (TUI_API_TIMEOUT_MS).
- **Retry:** 3 попытки с паузой 1–2 с при сетевой ошибке.
- **Проверка при старте:** `GET /ready` до входа в blessed.screen(); при ошибке — stderr + exit 1.
- **Graceful exit:** Ctrl+C очищает интервалы, выводит «Bye», exit 0.

### Темы

`TUI_THEME=dark` (по умолчанию) или `TUI_THEME=light`. Цвета заданы в `theme.js`.

---

## C TUI

### Сборка

Требуются: gcc, ncurses, libcurl.

```bash
cd tools/term-c && make
```

### Экраны

1. **Hosts** — имя и online. Стрелки ↑/↓ — выбор, Enter — выбрать хост.
2. **Processes** — PID, NAME, CPU%, RSS, STATE. Сортировка s/S.
3. **Metrics** — CPU %, Load, Mem, Disk.
4. **Alerts** — время, хост, status, message. firing — красный, resolved — зелёный (если терминал поддерживает цвета).

### Проверка backend

Перед `initscr()` выполняется `GET /ready`. При ошибке: `fprintf(stderr, ...)` и exit 1.

---

## Обёртки

После **`make install`** или **`make term-global`** команды **`localterm`** и **`webterm`** доступны из любой папки (через `npm link`). Иначе — из корня репо: `make localterm`, `make webterm`.

### localterm

Показывает баннер, проверяет `/ready`, через `LOCALTERM_DELAY` мс (по умолчанию 1000) запускает Node TUI.

`LOCALTERM_DELAY=0` — запуск без задержки (для отладки).

### webterm

Выполняет `docker compose up -d --build`. После успешного завершения опрашивает `GET /ready` до 60 с, затем открывает браузер. Если таймаут — всё равно открывает (страница может быть ещё не готова).

---

## Переменные окружения

| Переменная | По умолчанию | Описание |
|------------|--------------|----------|
| API_URL | http://localhost:3000 | URL backend |
| TUI_REFRESH_MS | 2000 | Интервал обновления (Node TUI) |
| TUI_ALERTS_REFRESH_MS | 5000 | Интервал обновления алертов |
| TUI_THEME | dark | Тема: dark / light |
| TUI_PROCESS_LIMIT | 200 | Лимит процессов в запросе |
| TUI_API_TIMEOUT_MS | 10000 | Таймаут fetch (мс) |
| TUI_API_RETRIES | 3 | Число повторов при ошибке |
| LOCALTERM_DELAY | 1000 | Задержка localterm перед TUI (мс) |

---

## Проверка стека

```bash
make check    # scripts/check-stack.sh: curl /ready и web
make term-check   # Node TUI с API_URL=http://127.0.0.1:9999; ожидается exit 1
```

---

## CI

- **term:** npm ci в tools/term, проверка наличия tui.js, `make term-check`.
- **term-c:** установка ncurses/curl, make, smoke с недоступным API (ожидается exit 1).
