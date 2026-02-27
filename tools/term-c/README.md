# Fast TUI (C)

Минимальный терминальный клиент на C (ncurses + libcurl, без внешней JSON-библиотеки). Обновление каждые **500 ms**.

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

## Клавиши

- **s** — сменить столбец сортировки (CPU → MEM → NAME → PID)
- **S** — сменить направление сортировки
- **r** — обновить сейчас
- **q** / **Esc** — выход

Внизу экрана — подсказка по клавишам и интервал обновления.
