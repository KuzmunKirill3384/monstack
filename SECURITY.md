# Security

Security model, threat considerations, and how to report vulnerabilities.

---

## 1. Threat model (summary)

- **Agents** authenticate to the backend with a **host token** (Bearer). The token is a shared secret; its SHA256 is stored in the DB. Anyone with the token can send data as that host.
- **Users** (when `AUTH_ENABLED=true`) authenticate via **login**; the backend issues a JWT in an HttpOnly cookie. Read API access is gated by this (or optional anonymous).
- **Backend** listens on all interfaces by default; in production it should be behind TLS and access control (e.g. reverse proxy, firewall).
- **Database** holds host identity, metrics, process snapshots, alert rules and events, and user credentials (hashed). Compromise of DB or backend can expose or alter this data.

---

## 2. Authentication and authorization

- **Ingest:** Only host token is checked (no user identity). Do not expose host tokens; rotate if compromised.
- **Read API:** When `AUTH_ENABLED=true`, endpoints require a valid JWT (cookie or Bearer). Optional anonymous mode allows unauthenticated read (suitable only for trusted networks).
- **Passwords:** Stored as salted hashes (e.g. SHA256 + salt). Use strong `JWT_SECRET` and `PASSWORD_SALT` in production.

---

## 3. Known considerations

- **Secrets in env:** `JWT_SECRET`, `PASSWORD_SALT`, `AGENT_COMMAND_SECRET`, and DB credentials must be kept secret and not committed.
- **CORS:** Backend allows credentials; set `CORS_ORIGIN` appropriately in production.
- **Rate limits:** Ingest and read rate limits reduce abuse; tune via env (see [CONFIGURATION.md](CONFIGURATION.md)).
- **Input validation:** Backend uses validation pipes and Prisma; agent payloads are validated before write.
- **Dependencies:** Keep Node and Go deps updated; run `npm audit` and review Go modules.

---

## 4. Reporting vulnerabilities

**Do not report security vulnerabilities in public issues.**

Please report sensitive security issues privately (e.g. via GitHub Security Advisories or a contact method listed in the repository). Include:

- Description of the issue and impact
- Steps to reproduce (if applicable)
- Suggested fix or mitigation (optional)

We will acknowledge and work on a fix; we may coordinate disclosure after a patch is available.

---

## 5. Best practices for deployers

- Use **HTTPS** (reverse proxy with TLS) for backend and web.
- Set **strong secrets** (`JWT_SECRET`, `PASSWORD_SALT`, `AGENT_COMMAND_SECRET`) and do not use defaults in production.
- Enable **AUTH_ENABLED=true** if the API is reachable from untrusted networks.
- Restrict **network access** to the backend and DB (firewall, private network).
- Run containers as **non-root** where possible and keep images updated.
- **Back up** the database and protect backup storage.
