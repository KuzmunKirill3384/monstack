import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AlertsService {
  constructor(private prisma: PrismaService) {}

  async findEvents(hostId?: string, from?: Date, to?: Date, status?: string) {
    const where: { hostId?: string; ts?: { gte?: Date; lte?: Date }; status?: string } = {};
    if (hostId) where.hostId = hostId;
    if (from || to) {
      where.ts = {};
      if (from) where.ts.gte = from;
      if (to) where.ts.lte = to;
    }
    if (status) where.status = status;
    return this.prisma.alertEvent.findMany({
      where,
      orderBy: { ts: 'desc' },
      take: 200,
      include: { rule: true },
    });
  }

  async findRules(hostId?: string) {
    return this.prisma.alertRule.findMany({
      where: hostId ? { OR: [{ hostId }, { hostId: null }] } : undefined,
    });
  }
}
