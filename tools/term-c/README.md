# Fast TUI (C)

Терминальный клиент на C (ncurses + libcurl). Паритет с Node TUI по экранам. Обновление каждые **500 ms**.

## Сборка

**Linux (Debian/Ubuntu):**
```bash
sudo apt install build-essential libncurses-dev libcurl4-openssl-dev
make
```

**macOS:**
```bash
brew install ncurses curl
make
```

## Запуск

```bash
./monterm
# или с другим URL бэкенда:
./monterm http://localhost:3000
```

При старте проверяется доступность backend (`GET /ready`). При ошибке — сообщение в stderr и exit 1.

## Экраны и клавиши

| Клавиша | Экран |
|---------|-------|
| **1** | Hosts — список хостов (online/offline) |
| **2** | Processes — таблица процессов с сортировкой |
| **3** | Metrics — CPU, Load, Mem, Disk |
| **4** | Alerts — события алертов (firing — красный, resolved — зелёный) |

**Hosts:** ↑/↓ — выбор хоста, **Enter** — выбрать и перейти к Processes.

**Processes:** **s** — сменить столбец сортировки (CPU → MEM → NAME → PID), **S** — направление.

**Все экраны:** **r** — обновить, **q** / **Esc** — выход.
