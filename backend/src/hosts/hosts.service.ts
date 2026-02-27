import { Injectable } from '@nestjs/common';
import { MetricsRaw } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

const ONLINE_SECONDS = 30;

@Injectable()
export class HostsService {
  constructor(private prisma: PrismaService) {}

  async findAll(onlineOnly?: boolean) {
    const hosts = await this.prisma.host.findMany({
      orderBy: { lastSeenAt: 'desc' },
    });
    const now = new Date();
    const cutoff = new Date(now.getTime() - ONLINE_SECONDS * 1000);
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const recentMetrics = await this.prisma.metricsRaw.findMany({
      where: { ts: { gte: fiveMinAgo } },
      orderBy: { ts: 'desc' },
    });
    const lastMetricByHost = new Map<string, MetricsRaw>();
    for (const m of recentMetrics) {
      if (!lastMetricByHost.has(m.hostId)) lastMetricByHost.set(m.hostId, m);
    }
    return hosts
      .map((h) => {
        const last: MetricsRaw | undefined = lastMetricByHost.get(h.id);
        return {
          ...h,
          online: h.lastSeenAt ? h.lastSeenAt >= cutoff : false,
          lastMetric: last
            ? {
                cpu_total_pct: last.cpuTotalPct,
                mem_used_mb: last.memUsedMb,
                mem_total_mb: last.memTotalMb,
                load1: last.load1,
                load5: last.load5,
                load15: last.load15,
              }
            : null,
        };
      })
      .filter((h) => (onlineOnly === undefined ? true : onlineOnly ? h.online : !h.online));
  }

  async findOne(id: string) {
    const host = await this.prisma.host.findUnique({ where: { id } });
    if (!host) return null;
    const cutoff = new Date(Date.now() - ONLINE_SECONDS * 1000);
    return {
      ...host,
      online: host.lastSeenAt ? host.lastSeenAt >= cutoff : false,
    };
  }

  async updateLastSeen(hostId: string) {
    await this.prisma.host.update({
      where: { id: hostId },
      data: { lastSeenAt: new Date() },
    });
  }

  async findByTokenHash(tokenHash: string) {
    return this.prisma.host.findUnique({
      where: { tokenHash },
    });
  }

  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async create(data: { name: string; token: string; os?: string; arch?: string }) {
    const tokenHash = this.hashToken(data.token);
    return this.prisma.host.create({
      data: {
        name: data.name,
        tokenHash,
        os: data.os ?? 'linux',
        arch: data.arch,
      },
    });
  }
}
