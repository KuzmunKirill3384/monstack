#!/usr/bin/env bash
set -euo pipefail

DB_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/monitoring}"

echo "==> Enabling TimescaleDB extension..."
psql "$DB_URL" -c "CREATE EXTENSION IF NOT EXISTS timescaledb;"

echo "==> Converting metrics_raw to hypertable..."
psql "$DB_URL" -c "
  SELECT create_hypertable('metrics_raw', 'ts',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE,
    migrate_data => TRUE
  );
"

echo "==> Converting proc_snapshots to hypertable..."
psql "$DB_URL" -c "
  SELECT create_hypertable('proc_snapshots', 'ts',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE,
    migrate_data => TRUE
  );
"

echo "==> Adding retention policies..."
psql "$DB_URL" -c "
  SELECT add_retention_policy('metrics_raw', INTERVAL '30 days', if_not_exists => TRUE);
  SELECT add_retention_policy('proc_snapshots', INTERVAL '14 days', if_not_exists => TRUE);
"

echo "==> Creating continuous aggregate: metrics_1m..."
psql "$DB_URL" <<'SQL'
CREATE MATERIALIZED VIEW IF NOT EXISTS metrics_1m
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 minute', ts) AS bucket,
  host_id,
  AVG(cpu_total_pct) AS cpu_total_pct,
  AVG(load1) AS load1,
  AVG(load5) AS load5,
  AVG(load15) AS load15,
  AVG(mem_used_mb) AS mem_used_mb,
  AVG(mem_total_mb) AS mem_total_mb,
  AVG(disk_used_pct) AS disk_used_pct,
  AVG(net_rx_bps) AS net_rx_bps,
  AVG(net_tx_bps) AS net_tx_bps
FROM metrics_raw
GROUP BY bucket, host_id
WITH NO DATA;

SELECT add_continuous_aggregate_policy('metrics_1m',
  start_offset => INTERVAL '2 hours',
  end_offset => INTERVAL '1 minute',
  schedule_interval => INTERVAL '1 minute',
  if_not_exists => TRUE
);
SQL

echo "==> Creating continuous aggregate: metrics_5m..."
psql "$DB_URL" <<'SQL'
CREATE MATERIALIZED VIEW IF NOT EXISTS metrics_5m
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('5 minutes', ts) AS bucket,
  host_id,
  AVG(cpu_total_pct) AS cpu_total_pct,
  AVG(load1) AS load1,
  AVG(load5) AS load5,
  AVG(load15) AS load15,
  AVG(mem_used_mb) AS mem_used_mb,
  AVG(mem_total_mb) AS mem_total_mb,
  AVG(disk_used_pct) AS disk_used_pct,
  AVG(net_rx_bps) AS net_rx_bps,
  AVG(net_tx_bps) AS net_tx_bps
FROM metrics_raw
GROUP BY bucket, host_id
WITH NO DATA;

SELECT add_continuous_aggregate_policy('metrics_5m',
  start_offset => INTERVAL '12 hours',
  end_offset => INTERVAL '5 minutes',
  schedule_interval => INTERVAL '5 minutes',
  if_not_exists => TRUE
);
SQL

echo "==> TimescaleDB setup complete."
echo "    Retention: metrics_raw 30d, proc_snapshots 14d"
echo "    Aggregates: metrics_1m (1 min), metrics_5m (5 min)"
