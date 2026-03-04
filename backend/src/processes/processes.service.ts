import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProcessesService {
  constructor(private prisma: PrismaService) {}

  async findRange(hostId: string, from?: Date, to?: Date, limit = 500) {
    const where: { hostId: string; ts?: { gte?: Date; lte?: Date } } = {
      hostId,
    };
    if (from) where.ts = { ...where.ts, gte: from };
    if (to) where.ts = { ...where.ts, lte: to };
    let rows = await this.prisma.procSnapshot.findMany({
      where,
      orderBy: { ts: 'desc' },
      take: limit,
    });
    if (rows.length === 0 && (from || to)) {
      rows = await this.prisma.procSnapshot.findMany({
        where: { hostId },
        orderBy: { ts: 'desc' },
        take: limit,
      });
    }
    return rows.map((r) => ({
      ts: r.ts.toISOString(),
      pid: r.pid,
      name: r.name,
      cmd: r.cmd ?? null,
      cpu_pct: r.cpuPct,
      rss_mb: r.rssMb,
      io_read_bps: r.ioReadBps != null ? Number(r.ioReadBps) : null,
      io_write_bps: r.ioWriteBps != null ? Number(r.ioWriteBps) : null,
      state: r.state,
    }));
  }
}
