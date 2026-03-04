# Contributing to Monstack

Thank you for considering contributing. This document covers workflow, commit conventions, and code expectations.

---

## 1. Code of conduct

By participating, you agree to uphold our [Code of Conduct](CODE_OF_CONDUCT.md).

---

## 2. How to contribute

### Reporting bugs

Open an issue with:

- Monstack version (or commit)
- OS and environment (Docker, Node, Go versions)
- Steps to reproduce
- Expected vs actual behavior
- Relevant logs or screenshots

### Suggesting features

Open an issue describing the use case and proposed behavior. For large changes, discuss in the issue before a big PR.

### Pull requests

1. **Fork** the repository and clone your fork.
2. **Create a branch** from `main`: `git checkout -b feat/short-description`.
3. **Make changes**; follow code style and add tests where appropriate.
4. **Run checks** (see below).
5. **Commit** with clear messages (prefer Conventional Commits).
6. **Push** to your fork and open a **Pull Request** against `main`.
7. Fill in the PR template (if any) and link related issues.

---

## 3. Requirements

- Node.js 20+
- Go 1.22+ (for agent and CLI)
- Docker and docker compose
- macOS or Linux for full stack (agent is Linux-oriented)

---

## 4. Development workflow

```bash
git clone https://github.com/YOUR_USER/monstack.git
cd monstack
make install
make up
make check
```

- Backend: `cd backend && npm run start:dev`
- Web: `cd web && npm run dev`
- TUI: `make term` or `make term-c`

---

## 5. Before submitting a PR

Run the full test and lint suite:

```bash
# Backend
cd backend && npm run lint && npm run build && npm test && npm run test:e2e

# Web
cd web && npm run lint && npm run build && npm test

# Agent
cd agent && go build ./cmd/agent && go test ./...

# Node TUI
cd tools/term && npm test && make term-check
```

Or from root: `make test`.

Ensure new code is covered by unit or E2E tests where reasonable.

---

## 6. Commit conventions

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation only
- `test:` tests only
- `chore:` build, tooling, deps
- `refactor:` code change without changing behavior

Example: `feat(web): add skeleton loading for hosts page`.

---

## 7. Code and documentation standards

- **Backend:** ESLint + Prettier; async/await; avoid business logic in controllers (use services).
- **Web:** ESLint; functional components; no business logic in UI (use hooks/services).
- **Go:** `gofmt`; idiomatic Go; handle errors explicitly.
- **Docs:** Markdown in `docs/` and root; consistent headings and tables; technical tone.

---

## 8. License

By contributing, you agree that your contributions will be licensed under the Apache License, Version 2.0.
