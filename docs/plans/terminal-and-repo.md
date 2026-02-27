# План: терминал и репо (статус)

Реализованные пункты отмечены [x]. Оставшиеся — возможные улучшения.

---

## Выполнено

### Node TUI
- [x] Единая цветовая схема, тема dark/light
- [x] Экран 5 Rules, toggle enabled по Enter
- [x] Sparklines в header и Metrics
- [x] Поиск по хостам (/)
- [x] Проверка API до входа, retry, таймауты, graceful exit
- [x] Config из env (TUI_REFRESH_MS и др.)
- [x] Разбивка на модули: config, theme, api, utils

### C TUI
- [x] Экраны 1–4 (Hosts, Processes, Metrics, Alerts)
- [x] Проверка backend при старте
- [x] Цвета firing/resolved в алертах
- [x] README с экранами и клавишами

### localterm / webterm
- [x] LOCALTERM_DELAY (1 с по умолчанию)
- [x] Проверка /ready перед баннером
- [x] webterm ждёт backend до 60 с

### Репо
- [x] scripts/check-stack.sh, make check
- [x] make term-check
- [x] .env.example
- [x] CI: term, term-c jobs
- [x] README: клавиши, env
- [x] docs/ARCHITECTURE.md, docs/README.md
- [x] CONTRIBUTING.md
- [x] make test (backend + web + term)

---

## Опционально (дальше)

- [ ] Адаптивность при маленьком терминале
- [ ] Дебаунс refresh при быстром переключении
- [ ] E2E в CI (compose up → curl → term)
- [ ] pre-commit хуки
