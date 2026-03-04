import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProcessesService {
  constructor(private prisma: PrismaService) {}

  async findRange(
    hostId: string,
    from?: Date,
    to?: Date,
    limit = 500,
    cursor?: string,
  ) {
    const where: { hostId: string; ts?: { gte?: Date; lte?: Date } } = {
      hostId,
    };
    if (from) where.ts = { ...where.ts, gte: from };
    if (to) where.ts = { ...where.ts, lte: to };

    const findArgs: Parameters<typeof this.prisma.procSnapshot.findMany>[0] = {
      where,
      orderBy: { ts: 'desc' as const },
      take: limit + 1,
    };
    if (cursor) {
      findArgs.cursor = { id: cursor };
      findArgs.skip = 1;
    }

    let rows = await this.prisma.procSnapshot.findMany(findArgs);

    if (rows.length === 0 && (from || to) && !cursor) {
      rows = await this.prisma.procSnapshot.findMany({
        where: { hostId },
        orderBy: { ts: 'desc' },
        take: limit + 1,
      });
    }

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? page[page.length - 1].id : null;

    return {
      data: page.map((r) => ({
        id: r.id,
        ts: r.ts.toISOString(),
        pid: r.pid,
        name: r.name,
        cmd: r.cmd ?? null,
        cpu_pct: r.cpuPct,
        rss_mb: r.rssMb,
        io_read_bps: r.ioReadBps != null ? Number(r.ioReadBps) : null,
        io_write_bps: r.ioWriteBps != null ? Number(r.ioWriteBps) : null,
        state: r.state,
      })),
      nextCursor,
    };
  }
}
