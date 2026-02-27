CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "Host" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "os" TEXT DEFAULT 'linux',
    "arch" TEXT,
    "tags" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3),

    CONSTRAINT "Host_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Host_token_hash_key" ON "Host"("token_hash");

CREATE TABLE "metrics_raw" (
    "id" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL,
    "host_id" TEXT NOT NULL,
    "cpu_total_pct" DOUBLE PRECISION NOT NULL,
    "load1" DOUBLE PRECISION NOT NULL,
    "load5" DOUBLE PRECISION NOT NULL,
    "load15" DOUBLE PRECISION NOT NULL,
    "mem_used_mb" DOUBLE PRECISION NOT NULL,
    "mem_total_mb" DOUBLE PRECISION NOT NULL,
    "disk_used_pct" DOUBLE PRECISION NOT NULL,
    "net_rx_bps" BIGINT NOT NULL,
    "net_tx_bps" BIGINT NOT NULL,

    CONSTRAINT "metrics_raw_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "metrics_raw_host_id_ts_idx" ON "metrics_raw"("host_id", "ts");

ALTER TABLE "metrics_raw" ADD CONSTRAINT "metrics_raw_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "Host"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "proc_snapshots" (
    "id" TEXT NOT NULL,
    "host_id" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL,
    "pid" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "cpu_pct" DOUBLE PRECISION NOT NULL,
    "rss_mb" DOUBLE PRECISION NOT NULL,
    "io_read_bps" BIGINT,
    "io_write_bps" BIGINT,
    "state" TEXT,

    CONSTRAINT "proc_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "proc_snapshots_host_id_ts_idx" ON "proc_snapshots"("host_id", "ts");

ALTER TABLE "proc_snapshots" ADD CONSTRAINT "proc_snapshots_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "Host"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "alert_rules" (
    "id" TEXT NOT NULL,
    "host_id" TEXT,
    "metric" TEXT NOT NULL,
    "op" TEXT NOT NULL,
    "threshold" DOUBLE PRECISION,
    "window" TEXT NOT NULL DEFAULT '5m',
    "severity" TEXT NOT NULL DEFAULT 'warning',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_rules_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "Host"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "alert_events" (
    "id" TEXT NOT NULL,
    "host_id" TEXT NOT NULL,
    "rule_id" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,

    CONSTRAINT "alert_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "alert_events_host_id_ts_idx" ON "alert_events"("host_id", "ts");

ALTER TABLE "alert_events" ADD CONSTRAINT "alert_events_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "Host"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "alert_events" ADD CONSTRAINT "alert_events_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "alert_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
