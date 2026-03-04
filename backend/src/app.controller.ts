import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from './prisma/prisma.service';

const startedAt = Date.now();
const ONLINE_SECONDS = 120;

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private prisma: PrismaService) {}

  @Get('health')
  async health() {
    let dbStatus = 'ok';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'unavailable';
    }

    const cutoff = new Date(Date.now() - ONLINE_SECONDS * 1000);
    let agentsTotal = 0;
    let agentsOnline = 0;
    try {
      const hosts = await this.prisma.host.findMany({
        select: { lastSeenAt: true },
      });
      agentsTotal = hosts.length;
      agentsOnline = hosts.filter(
        (h) => h.lastSeenAt && h.lastSeenAt >= cutoff,
      ).length;
    } catch {
      /* db may be unavailable */
    }

    const uptimeSec = Math.floor((Date.now() - startedAt) / 1000);
    const overall = dbStatus === 'ok' ? 'ok' : 'degraded';

    return {
      status: overall,
      uptime: uptimeSec,
      components: {
        database: dbStatus,
        agents: {
          total: agentsTotal,
          online: agentsOnline,
          offline: agentsTotal - agentsOnline,
        },
      },
    };
  }

  @Get('ready')
  async ready() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok' };
  }
}
