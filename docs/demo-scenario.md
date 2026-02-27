# Demo scenario

1. Start stack: `docker compose up -d postgres backend web`.
2. Apply migrations: `cd backend && npx prisma migrate deploy`.
3. Seed user (optional): insert into User (id, email, password_hash, role) values (gen_random_uuid(), 'admin@test.local', encode(sha256('admin' || 'salt'), 'hex'), 'admin').
4. Create host: insert into Host (id, name, token_hash, os, arch) values (gen_random_uuid(), 'demo-host', encode(sha256('demo-token'), 'hex'), 'linux', 'amd64'). Note the id and use token `demo-token` in agent config.
5. Open http://localhost:3001, login with admin@test.local / admin.
6. Run agent (on Linux or in container with /proc): set config server_url, host_id, host_token to the created host id and demo-token; run agent. Metrics should appear in Hosts and on the host detail page.
7. Create alert rule: POST /alert-rules with { hostId: "<host-id>", metric: "host_down", op: ">", threshold: null } or metric "cpu_total_pct", op: ">", threshold: 90. Wait for cron (2 min) or trigger; check Alerts page.
