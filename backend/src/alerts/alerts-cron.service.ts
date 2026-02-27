import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { HostsService } from '../hosts/hosts.service';

const ONLINE_THRESHOLD_MS = 60_000;

@Injectable()
export class AlertsCronService {
  constructor(
    private prisma: PrismaService,
    private hosts: HostsService,
  ) {}

  @Cron('*/2 * * * *')
  async checkAlerts() {
    const rules = await this.prisma.alertRule.findMany({
      where: { enabled: true },
      include: { host: true },
    });

    for (const rule of rules) {
      if (rule.metric === 'host_down') {
        await this.checkHostDown(rule);
      } else {
        await this.checkThreshold(rule);
      }
    }
  }

  private async checkHostDown(rule: { id: string; hostId: string | null }) {
    if (!rule.hostId) return;
    const host = await this.hosts.findOne(rule.hostId);
    if (!host) return;
    const lastSeen = host.lastSeenAt ? new Date(host.lastSeenAt).getTime() : 0;
    const isDown = Date.now() - lastSeen > ONLINE_THRESHOLD_MS;
    const existing = await this.prisma.alertEvent.findFirst({
      where: { ruleId: rule.id, hostId: rule.hostId },
      orderBy: { ts: 'desc' },
    });
    const currentFiring = existing?.status === 'firing';
    if (isDown && !currentFiring) {
      await this.prisma.alertEvent.create({
        data: {
          hostId: rule.hostId,
          ruleId: rule.id,
          ts: new Date(),
          status: 'firing',
          message: 'Host has not sent metrics within threshold',
        },
      });
    } else if (!isDown && currentFiring) {
      await this.prisma.alertEvent.create({
        data: {
          hostId: rule.hostId,
          ruleId: rule.id,
          ts: new Date(),
          status: 'resolved',
          message: 'Host is back online',
        },
      });
    }
  }

  private async checkThreshold(rule: {
    id: string;
    hostId: string | null;
    metric: string;
    op: string;
    threshold: number | null;
  }) {
    if (rule.threshold == null) return;
    const hostIds = rule.hostId
      ? [rule.hostId]
      : (await this.prisma.host.findMany({ select: { id: true } })).map((h) => h.id);

    for (const hostId of hostIds) {
      const latest = await this.prisma.metricsRaw.findFirst({
        where: { hostId },
        orderBy: { ts: 'desc' },
      });
      if (!latest) continue;

      let value: number;
      switch (rule.metric) {
        case 'cpu_total_pct':
          value = latest.cpuTotalPct;
          break;
        case 'mem_used_pct':
          value = latest.memTotalMb > 0 ? (latest.memUsedMb / latest.memTotalMb) * 100 : 0;
          break;
        case 'disk_used_pct':
          value = latest.diskUsedPct;
          break;
        default:
          continue;
      }

      const firing =
        rule.op === '>' ? value > rule.threshold
        : rule.op === '<' ? value < rule.threshold
        : rule.op === '==' ? value === rule.threshold
        : false;

      const existing = await this.prisma.alertEvent.findFirst({
        where: { ruleId: rule.id, hostId },
        orderBy: { ts: 'desc' },
      });
      const currentFiring = existing?.status === 'firing';

      if (firing && !currentFiring) {
        await this.prisma.alertEvent.create({
          data: {
            hostId,
            ruleId: rule.id,
            ts: new Date(),
            status: 'firing',
            message: `${rule.metric} ${rule.op} ${rule.threshold} (current: ${value})`,
          },
        });
      } else if (!firing && currentFiring) {
        await this.prisma.alertEvent.create({
          data: {
            hostId,
            ruleId: rule.id,
            ts: new Date(),
            status: 'resolved',
            message: `${rule.metric} back to normal`,
          },
        });
      }
    }
  }
}
