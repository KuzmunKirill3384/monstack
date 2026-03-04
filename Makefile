# Monitoring Stack — удобный запуск и установка
# make install  — установить все зависимости
# make up      — поднять стек в Docker
# make down    — остановить
# make term    — запустить Node TUI
# make term-c  — собрать и запустить C TUI (если есть ncurses и curl)

.PHONY: install install-all install-backend install-web install-term install-term-c install-console link term-global \
        up up-full down logs term term-c localterm webterm check check-deps term-check test clean help diagrams bootstrap \
        cli-build cli-install up-one

SHELL := /bin/bash
COMPOSE := $(shell docker compose version >/dev/null 2>&1 && echo "docker compose" || echo "docker-compose")

install-all:
	@./scripts/install-all.sh

bootstrap:
	@./scripts/bootstrap.sh

help:
	@echo "Monitoring Stack"
	@echo ""
	@echo "  make bootstrap   — one-shot: зависимости + make up + check (Ubuntu/Debian/Kali/macOS)"
	@echo "  make install-all — полная установка (Node, Docker, Make, ncurses, npm) — Ubuntu/Debian/Kali/macOS"
	@echo "  make install         — установить все зависимости (backend, web, term)"
	@echo "  make install-console — только TUI: term + term-c (без backend/web, стек через Docker)"
	@echo "  make up          — запустить стек (postgres, backend, web)"
	@echo "  make up-full     — + agent (сбор метрик с контейнера)"
	@echo "  make down        — остановить контейнеры"
	@echo "  make check       — проверить готовность стека (backend, web)"
	@echo "  make check-deps  — проверить установленные пакеты (node, docker, npm, etc)"
	@echo "  make logs        — логи docker compose"
	@echo "  make term-global — поставить TUI и добавить localterm/webterm в PATH (одна команда из любой папки)"
	@echo "  make localterm   — терминальный TUI с баннером"
	@echo "  make webterm     — поднять Docker и открыть веб в браузере"
	@echo "  make term        — запустить Node TUI (1-5|F1-F5 экраны, Enter, s, f, r, q)"
	@echo "  make term-check  — smoke-тест Node TUI (запуск 3 сек с недоступным API)"
	@echo "  make term-c      — быстрый TUI на C (1-4 экраны, 500 ms)"
	@echo "  make test        — все тесты (backend, web, term)"
	@echo "  make clean       — удалить node_modules и сборки"
	@echo "  make diagrams    — сгенерировать PNG из docs/diagrams/*.puml (Docker)"
	@echo "  make up-one      — одна команда: собрать CLI + поднять стек с агентом"
	@echo "  make cli-build   — собрать monstack-cli (Go)"
	@echo ""
	@echo "Клавиши TUI: 1-5|F1-F5 экраны  Enter выбор  s сортировка  f фильтр  r обновить  q выход"
	@echo ""
	@echo "После make install: make up, затем make localterm или make webterm."

diagrams:
	@docker run --rm -v "$$(pwd)/docs/diagrams:/data" plantuml/plantuml -tpng /data/architecture.puml /data/data-flow.puml /data/docker.puml /data/lifecycle.puml /data/repo.puml
	@echo "Готово: docs/diagrams/*.png"

install: install-backend install-web install-term
	@npm link 2>/dev/null && echo "Готово. Команды localterm и webterm добавлены в PATH — можно вызывать из любой папки." || true
	@echo "Из корня репо: make up, затем localterm или webterm (или make localterm / make webterm)."

link:
	@npm link 2>/dev/null && echo "localterm и webterm добавлены в PATH. Запуск: localterm  или  webterm" || echo "Не удалось. Используйте из корня: make localterm / make webterm"

install-backend:
	@echo ">> backend: npm install..."
	@cd backend && npm install
	@cd backend && DATABASE_URL="$${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/monitoring}" npx prisma generate
	@echo ">> backend: prisma generate OK"

install-web:
	@echo ">> web: npm install..."
	@cd web && npm install
	@echo ">> web OK"

install-term:
	@echo ">> tools/term: npm install..."
	@cd tools/term && npm install
	@echo ">> tools/term OK"

install-term-c:
	@echo ">> tools/term-c: make..."
	@cd tools/term-c && make 2>/dev/null || (echo "Нужны: gcc, ncurses, libcurl. Ubuntu: sudo apt install build-essential libncurses-dev libcurl4-openssl-dev; macOS: brew install ncurses curl" && exit 1)

# TUI-зависимости + npm link: после этого localterm и webterm доступны из любой папки
term-global: install-term
	@npm link 2>/dev/null && echo "Готово. Запуск из любой папки: localterm  или  webterm" || (echo "Нужен Node.js. Установите: make install-term, затем npm link" && exit 1)

install-console:
	@echo ">> Установка только консольного TUI (без backend/web)..."
	@$(MAKE) install-term-c
	@$(MAKE) install-term
	@echo "Готово. Стек через Docker: make up. Затем: make term-c (C) или make localterm (Node)."

up:
	@command -v docker >/dev/null 2>&1 || (echo "Установите Docker: https://docs.docker.com/engine/install/"; exit 1)
	@$(COMPOSE) version >/dev/null 2>&1 || (echo "Нужен docker compose или docker-compose. Ubuntu/Debian/Kali: sudo apt install docker-compose"; exit 1)
	@$(COMPOSE) up -d --build
	@echo "Backend: http://localhost:3000  Web: http://localhost:3001"
	@echo "Agent опционален: $(COMPOSE) --profile agent up -d"

up-full:
	@$(COMPOSE) --profile agent up -d --build
	@echo "Backend: http://localhost:3000  Web: http://localhost:3001  Agent: включён"

down:
	@$(COMPOSE) down

logs:
	@$(COMPOSE) logs -f

term:
	@cd tools/term && npm start

localterm:
	@node bin/localterm.js

webterm:
	@node bin/webterm.js

term-check:
	@cd tools/term && API_URL=http://127.0.0.1:9999 node tui.js 2>/dev/null; r=$$?; \
	if [ $$r -ne 0 ]; then echo "term-check OK"; else echo "term-check FAIL: TUI should exit when backend unavailable"; exit 1; fi

check:
	@bash scripts/check-stack.sh

check-deps:
	@./scripts/check-deps.sh

test:
	@echo ">> backend: unit + e2e..."
	@cd backend && npm test
	@cd backend && npm run test:e2e
	@echo ">> web: lint + build..."
	@cd web && npm run lint
	@cd web && npm run build
	@echo ">> tools/term: utils..."
	@cd tools/term && npm test
	@echo "test OK"

term-c:
	@if [ ! -f tools/term-c/monterm ]; then $(MAKE) install-term-c; fi
	@cd tools/term-c && (./monterm; r=$$?; [ $$r -eq 126 ] && rm -f monterm && $(MAKE) install-term-c && ./monterm || exit $$r)

clean:
	rm -rf backend/node_modules web/node_modules tools/term/node_modules
	rm -f tools/term-c/monterm
	@echo "clean OK"

cli-build:
	@mkdir -p bin && cd monstack-cli && go build -o ../bin/monstack-cli . && echo "Built ./bin/monstack-cli"

# Одна команда: собрать CLI (если нет), сгенерировать .env при необходимости, поднять стек с агентом
up-one: cli-build
	@./bin/monstack-cli up --dir .

cli-install: cli-build
	@echo "Run: make up-one   or   ./bin/monstack-cli up"
