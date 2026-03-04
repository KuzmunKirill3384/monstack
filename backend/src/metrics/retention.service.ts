import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);
  private running = false;

  constructor(private prisma: PrismaService) {}

  private get metricsDays(): number {
    return parseInt(process.env.RETENTION_METRICS_DAYS ?? '30', 10) || 30;
  }

  private get procsDays(): number {
    return parseInt(process.env.RETENTION_PROCS_DAYS ?? '14', 10) || 14;
  }

  private get alertsDays(): number {
    return parseInt(process.env.RETENTION_ALERTS_DAYS ?? '90', 10) || 90;
  }

  @Cron('0 3 * * *')
  async runRetention() {
    if (this.running) return;
    this.running = true;
    try {
      await this.cleanup();
    } catch (err) {
      this.logger.error('Retention failed', (err as Error).stack);
    } finally {
      this.running = false;
    }
  }

  async cleanup() {
    const now = Date.now();

    const metricsCutoff = new Date(now - this.metricsDays * 86_400_000);
    const metricsResult = await this.prisma.metricsRaw.deleteMany({
      where: { ts: { lt: metricsCutoff } },
    });
    this.logger.log(
      `Deleted ${metricsResult.count} metrics_raw rows older than ${this.metricsDays}d`,
    );

    const procsCutoff = new Date(now - this.procsDays * 86_400_000);
    const procsResult = await this.prisma.procSnapshot.deleteMany({
      where: { ts: { lt: procsCutoff } },
    });
    this.logger.log(
      `Deleted ${procsResult.count} proc_snapshots rows older than ${this.procsDays}d`,
    );

    const alertsCutoff = new Date(now - this.alertsDays * 86_400_000);
    const alertsResult = await this.prisma.alertEvent.deleteMany({
      where: { ts: { lt: alertsCutoff } },
    });
    this.logger.log(
      `Deleted ${alertsResult.count} alert_events rows older than ${this.alertsDays}d`,
    );
  }
}
