import { Injectable } from '@nestjs/common';
import { MetricsRaw } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

const ONLINE_SECONDS = 30;
const HOSTS_CACHE_TTL_MS = 5_000;

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

@Injectable()
export class HostsService {
  private hostsCache: CacheEntry<unknown[]> | null = null;

  constructor(private prisma: PrismaService) {}

  invalidateCache() {
    this.hostsCache = null;
  }

  async findAll(onlineOnly?: boolean) {
    const now = Date.now();
    if (this.hostsCache && this.hostsCache.expiresAt > now && onlineOnly === undefined) {
      return this.hostsCache.data;
    }

    const hosts = await this.prisma.host.findMany({
      orderBy: { lastSeenAt: 'desc' },
    });
    const cutoffDate = new Date(now - ONLINE_SECONDS * 1000);
    const fiveMinAgo = new Date(now - 5 * 60 * 1000);
    const recentMetrics = await this.prisma.metricsRaw.findMany({
      where: { ts: { gte: fiveMinAgo } },
      distinct: ['hostId'],
      orderBy: [{ hostId: 'asc' }, { ts: 'desc' }],
      take: 1000,
    });
    const lastMetricByHost = new Map<string, MetricsRaw>();
    for (const m of recentMetrics) {
      if (!lastMetricByHost.has(m.hostId)) lastMetricByHost.set(m.hostId, m);
    }
    const result = hosts
      .map((h) => {
        const last: MetricsRaw | undefined = lastMetricByHost.get(h.id);
        return {
          ...h,
          online: h.lastSeenAt ? h.lastSeenAt >= cutoffDate : false,
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
      .filter((h) =>
        onlineOnly === undefined ? true : onlineOnly ? h.online : !h.online,
      );

    if (onlineOnly === undefined) {
      this.hostsCache = { data: result, expiresAt: now + HOSTS_CACHE_TTL_MS };
    }
    return result;
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

  async create(data: {
    name: string;
    token: string;
    os?: string;
    arch?: string;
  }) {
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
