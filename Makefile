# Monitoring Stack — удобный запуск и установка
# make install  — установить все зависимости
# make up      — поднять стек в Docker
# make down    — остановить
# make term    — запустить Node TUI
# make term-c  — собрать и запустить C TUI (если есть ncurses и curl)

.PHONY: install install-backend install-web install-term install-term-c link \
        up down logs term term-c clean help diagrams

SHELL := /bin/bash

help:
	@echo "Monitoring Stack"
	@echo ""
	@echo "  make install     — установить зависимости + npm link (localterm, webterm)"
	@echo "  make up          — запустить всё в Docker (postgres, backend, web, agent)"
	@echo "  make down        — остановить контейнеры"
	@echo "  make logs        — логи docker compose"
	@echo "  localterm        — терминальный TUI (баннер + htop-like), после make install"
	@echo "  webterm          — поднять Docker и открыть веб-интерфейс в браузере"
	@echo "  make term        — то же что localterm (из каталога репо)"
	@echo "  make term-c      — быстрый TUI на C (500 ms)"
	@echo "  make clean       — удалить node_modules и сборки"
	@echo "  make diagrams    — сгенерировать PNG из docs/diagrams/*.puml (Docker)"
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
	@cd backend && npx prisma generate
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

term-c:
	@if [ ! -f tools/term-c/monterm ]; then $(MAKE) install-term-c; fi
	@cd tools/term-c && ./monterm

clean:
	rm -rf backend/node_modules web/node_modules tools/term/node_modules
	rm -f tools/term-c/monterm
	@echo "clean OK"
