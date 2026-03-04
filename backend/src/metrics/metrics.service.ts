import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface AggregatedRow {
  bucket: Date;
  cpu_total_pct: number;
  load1: number;
  load5: number;
  load15: number;
  mem_used_mb: number;
  mem_total_mb: number;
  disk_used_pct: number;
  net_rx_bps: bigint;
  net_tx_bps: bigint;
}

@Injectable()
export class MetricsService {
  constructor(private prisma: PrismaService) {}

  static readonly DEFAULT_LIMIT = 5000;

  async findRange(
    hostId: string,
    from: Date,
    to: Date,
    resolution: 'raw' | '1m' | '5m',
    limit = MetricsService.DEFAULT_LIMIT,
    cursor?: string,
  ) {
    const take = Math.min(Math.max(1, limit), 10000);

    if (resolution === '1m' || resolution === '5m') {
      return this.findAggregated(hostId, from, to, resolution, take);
    }

    const findArgs: Parameters<typeof this.prisma.metricsRaw.findMany>[0] = {
      where: {
        hostId,
        ts: { gte: from, lte: to },
      },
      orderBy: { ts: 'asc' as const },
      take: take + 1,
    };
    if (cursor) {
      findArgs.cursor = { id: cursor };
      findArgs.skip = 1;
    }
    const rows = await this.prisma.metricsRaw.findMany(findArgs);
    const hasMore = rows.length > take;
    const page = hasMore ? rows.slice(0, take) : rows;
    const nextCursor = hasMore ? page[page.length - 1].id : null;

    return {
      data: page.map((r) => ({
        id: r.id,
        ts: r.ts.toISOString(),
        cpu_total_pct: r.cpuTotalPct,
        load1: r.load1,
        load5: r.load5,
        load15: r.load15,
        mem_used_mb: r.memUsedMb,
        mem_total_mb: r.memTotalMb,
        disk_used_pct: r.diskUsedPct,
        net_rx_bps: Number(r.netRxBps),
        net_tx_bps: Number(r.netTxBps),
      })),
      nextCursor,
    };
  }

  private async findAggregated(
    hostId: string,
    from: Date,
    to: Date,
    resolution: '1m' | '5m',
    limit: number,
  ) {
    const intervalSec = resolution === '1m' ? 60 : 300;
    const rows = await this.prisma.$queryRaw<AggregatedRow[]>(
      Prisma.sql`
        SELECT
          date_trunc('minute', ts) - (EXTRACT(MINUTE FROM ts)::int % ${intervalSec / 60}) * INTERVAL '1 minute' AS bucket,
          AVG(cpu_total_pct)::float8 AS cpu_total_pct,
          AVG(load1)::float8 AS load1,
          AVG(load5)::float8 AS load5,
          AVG(load15)::float8 AS load15,
          AVG(mem_used_mb)::float8 AS mem_used_mb,
          AVG(mem_total_mb)::float8 AS mem_total_mb,
          AVG(disk_used_pct)::float8 AS disk_used_pct,
          AVG(net_rx_bps)::bigint AS net_rx_bps,
          AVG(net_tx_bps)::bigint AS net_tx_bps
        FROM metrics_raw
        WHERE host_id = ${hostId} AND ts >= ${from} AND ts <= ${to}
        GROUP BY bucket
        ORDER BY bucket ASC
        LIMIT ${limit}
      `,
    );
    return rows.map((r) => ({
      ts: new Date(r.bucket).toISOString(),
      cpu_total_pct: r.cpu_total_pct,
      load1: r.load1,
      load5: r.load5,
      load15: r.load15,
      mem_used_mb: r.mem_used_mb,
      mem_total_mb: r.mem_total_mb,
      disk_used_pct: r.disk_used_pct,
      net_rx_bps: Number(r.net_rx_bps),
      net_tx_bps: Number(r.net_tx_bps),
    }));
  }
}
