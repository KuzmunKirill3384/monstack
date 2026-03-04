# Roadmap

Planned and potential development directions. Priorities may change.

---

## Short term

- **Notifications:** Integrate alert events with channels (email, Slack, Telegram, webhook).
- **Alert rules UX:** More built-in metric presets and validation hints in web and TUI.
- **Documentation:** Expand runbooks and operational playbooks; add more API examples.
- **CI:** Automated tests and lint on PR; optional Docker build and deploy pipeline.

---

## Mid term

- **TimescaleDB and retention:** Default or recommended option for larger deployments; continuous aggregates; configurable retention policies.
- **More metrics:** Per-CPU, disk I/O, temperature (where supported by agent); display in web and TUI.
- **Saved dashboards:** User-defined dashboards and widgets persisted in DB or config.
- **Process actions:** Broader support for process signals and remote commands via agent; audit log for actions.
- **Multi-tenancy:** Optional workspace or organization scope for hosts and alerts; tenant-aware API and UI.

---

## Long term

- **Horizontal scaling:** Backend stateless and multi-instance; shared DB and optional queue for ingest.
- **Federation and HA:** Multiple Monstack instances; aggregation and long-term storage (e.g. object storage for cold metrics).
- **Custom metrics and plugins:** Extensible agent plugins or sidecar for application metrics.
- **Billing and SaaS features:** If offered as a service: usage-based limits, billing integration, and tenant isolation.

---

Contributions and feedback on priorities are welcome via issues and discussions.
