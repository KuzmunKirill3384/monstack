import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AlertRule, Host, MetricsRaw } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HostsService } from '../hosts/hosts.service';

type AlertRuleWithHost = AlertRule & { host: Host | null };

const ONLINE_THRESHOLD_MS = 60_000;

@Injectable()
export class AlertsCronService {
  private readonly logger = new Logger(AlertsCronService.name);
  private isRunning = false;

  constructor(
    private prisma: PrismaService,
    private hosts: HostsService,
  ) {}

  @Cron('*/2 * * * *')
  async checkAlerts() {
    if (this.isRunning) return;
    this.isRunning = true;
    try {
      await this.checkAlertsImpl();
    } catch (err) {
      this.logger.error('Alert check failed', (err as Error).stack);
    } finally {
      this.isRunning = false;
    }
  }

  private async checkAlertsImpl() {
    const rules: AlertRuleWithHost[] = await this.prisma.alertRule.findMany({
      where: { enabled: true },
      include: { host: true },
    });

    const thresholdRules = rules.filter(
      (r) => r.metric !== 'host_down' && r.threshold != null,
    );
    const latestByHost = thresholdRules.length
      ? await this.fetchLatestMetricsByHost()
      : new Map<string, MetricsRaw>();

    const ruleIds = rules.map((r) => r.id);
    const latestEvents = ruleIds.length
      ? await this.fetchLatestEvents(ruleIds)
      : new Map<string, string>();

    for (const rule of rules) {
      if (rule.metric === 'host_down') {
        await this.checkHostDown(rule, latestEvents);
      } else {
        await this.checkThreshold(rule, latestByHost, latestEvents);
      }
    }
  }

  private async fetchLatestMetricsByHost(): Promise<Map<string, MetricsRaw>> {
    const rows = await this.prisma.$queryRaw<MetricsRaw[]>(
      Prisma.sql`
        SELECT DISTINCT ON (host_id)
          id, ts, host_id AS "hostId",
          cpu_total_pct AS "cpuTotalPct",
          load1, load5, load15,
          mem_used_mb AS "memUsedMb", mem_total_mb AS "memTotalMb",
          disk_used_pct AS "diskUsedPct",
          net_rx_bps AS "netRxBps", net_tx_bps AS "netTxBps"
        FROM metrics_raw
        ORDER BY host_id, ts DESC
      `,
    );
    const map = new Map<string, MetricsRaw>();
    for (const row of rows) {
      map.set(row.hostId, row);
    }
    return map;
  }

  private async fetchLatestEvents(
    ruleIds: string[],
  ): Promise<Map<string, string>> {
    const events = await this.prisma.$queryRaw<
      { rule_id: string; host_id: string; status: string }[]
    >(
      Prisma.sql`
        SELECT DISTINCT ON (rule_id, host_id)
          rule_id, host_id, status
        FROM alert_events
        WHERE rule_id = ANY(${ruleIds}::uuid[])
        ORDER BY rule_id, host_id, ts DESC
      `,
    );
    const map = new Map<string, string>();
    for (const e of events) {
      map.set(`${e.rule_id}:${e.host_id}`, e.status);
    }
    return map;
  }

  private async checkHostDown(
    rule: AlertRuleWithHost,
    latestEvents: Map<string, string>,
  ) {
    if (!rule.hostId) return;
    const host = await this.hosts.findOne(rule.hostId);
    if (!host) return;
    const lastSeen = host.lastSeenAt ? new Date(host.lastSeenAt).getTime() : 0;
    const isDown = Date.now() - lastSeen > ONLINE_THRESHOLD_MS;
    const currentFiring =
      latestEvents.get(`${rule.id}:${rule.hostId}`) === 'firing';
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

  private async checkThreshold(
    rule: AlertRuleWithHost,
    latestByHost: Map<string, MetricsRaw>,
    latestEvents: Map<string, string>,
  ) {
    if (rule.threshold == null) return;
    const hostIds = rule.hostId
      ? [rule.hostId]
      : [...latestByHost.keys()];

    for (const hostId of hostIds) {
      const latest = latestByHost.get(hostId);
      if (!latest) continue;

      let value: number;
      switch (rule.metric) {
        case 'cpu_total_pct':
          value = latest.cpuTotalPct;
          break;
        case 'mem_used_pct':
          value =
            latest.memTotalMb > 0
              ? (latest.memUsedMb / latest.memTotalMb) * 100
              : 0;
          break;
        case 'disk_used_pct':
          value = latest.diskUsedPct;
          break;
        default:
          continue;
      }

      const firing =
        rule.op === '>'
          ? value > rule.threshold
          : rule.op === '<'
            ? value < rule.threshold
            : rule.op === '=='
              ? value === rule.threshold
              : false;

      const currentFiring =
        latestEvents.get(`${rule.id}:${hostId}`) === 'firing';

      if (firing && !currentFiring) {
        await this.prisma.alertEvent.create({
          data: {
            hostId,
            ruleId: rule.id,
            ts: new Date(),
            status: 'firing',
            message: `${rule.metric} ${rule.op} ${rule.threshold} (current: ${value.toFixed(1)})`,
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
