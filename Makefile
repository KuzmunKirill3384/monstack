# Monitoring Stack — удобный запуск и установка
# make install  — установить все зависимости
# make up      — поднять стек в Docker
# make down    — остановить
# make term    — запустить Node TUI
# make term-c  — собрать и запустить C TUI (если есть ncurses и curl)

.PHONY: install install-all install-backend install-web install-term install-term-c link \
        up down logs term term-c check term-check test clean help diagrams

SHELL := /bin/bash

install-all:
	@./scripts/install-all.sh

help:
	@echo "Monitoring Stack"
	@echo ""
	@echo "  make install-all — полная установка (Node, Docker, Make, ncurses, npm) — Ubuntu/macOS"
	@echo "  make install     — установить зависимости + npm link (localterm, webterm)"
	@echo "  make up          — запустить всё в Docker (postgres, backend, web, agent)"
	@echo "  make down        — остановить контейнеры"
	@echo "  make check       — проверить готовность стека (backend, web)"
	@echo "  make logs        — логи docker compose"
	@echo "  localterm        — терминальный TUI (баннер + htop-like), после make install"
	@echo "  webterm          — поднять Docker и открыть веб в браузере"
	@echo "  make term        — запустить Node TUI (1-5|F1-F5 экраны, Enter, s, f, r, q)"
	@echo "  make term-check  — smoke-тест Node TUI (запуск 3 сек с недоступным API)"
	@echo "  make term-c      — быстрый TUI на C (1-4 экраны, 500 ms)"
	@echo "  make test        — все тесты (backend, web, term)"
	@echo "  make clean       — удалить node_modules и сборки"
	@echo "  make diagrams    — сгенерировать PNG из docs/diagrams/*.puml (Docker)"
	@echo ""
	@echo "Клавиши TUI: 1-5|F1-F5 экраны  Enter выбор  s сортировка  f фильтр  r обновить  q выход"
	@echo ""
	@echo "После make install: make up, затем localterm или webterm."

diagrams:
	@docker run --rm -v "$$(pwd)/docs/diagrams:/data" plantuml/plantuml -tpng /data/architecture.puml /data/data-flow.puml /data/docker.puml /data/lifecycle.puml /data/repo.puml
	@echo "Готово: docs/diagrams/*.png"

install: install-backend install-web install-term link
	@echo "Готово. Запуск: make up  или  localterm / webterm"

link:
	@cd tools/term && npm install --no-save 2>/dev/null || true
	@npm link 2>/dev/null && echo "Команды localterm и webterm доступны в PATH" || echo "Для localterm/webterm выполните из корня репо: npm link"

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

up:
	docker compose up -d --build
	@echo "Backend: http://localhost:3000  Web: http://localhost:3001"

down:
	docker compose down

logs:
	docker compose logs -f

term:
	@cd tools/term && npm start

term-check:
	@cd tools/term && API_URL=http://127.0.0.1:9999 node tui.js 2>/dev/null; r=$$?; \
	if [ $$r -ne 0 ]; then echo "term-check OK"; else echo "term-check FAIL: TUI should exit when backend unavailable"; exit 1; fi

check:
	@bash scripts/check-stack.sh

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
	@cd tools/term-c && ./monterm

clean:
	rm -rf backend/node_modules web/node_modules tools/term/node_modules
	rm -f tools/term-c/monterm
	@echo "clean OK"
