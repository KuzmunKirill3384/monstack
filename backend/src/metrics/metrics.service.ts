import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
  ) {
    void resolution; // reserved for future 1m/5m aggregates
    const take = Math.min(Math.max(1, limit), 10000);
    const rows = await this.prisma.metricsRaw.findMany({
      where: {
        hostId,
        ts: { gte: from, lte: to },
      },
      orderBy: { ts: 'asc' },
      take,
    });
    return rows.map((r) => ({
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
    }));
  }
}
