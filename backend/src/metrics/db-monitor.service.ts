import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DbMonitorService {
  private readonly logger = new Logger(DbMonitorService.name);

  constructor(private prisma: PrismaService) {}

  private get thresholdMb(): number {
    return parseInt(process.env.DB_SIZE_WARNING_MB ?? '1024', 10) || 1024;
  }

  @Cron('0 4 * * *')
  async checkDbSize() {
    try {
      const result = await this.prisma.$queryRaw<{ size: bigint }[]>`
        SELECT pg_database_size(current_database()) AS size
      `;
      const sizeBytes = Number(result[0]?.size ?? 0);
      const sizeMb = Math.round(sizeBytes / (1024 * 1024));

      if (sizeMb >= this.thresholdMb) {
        this.logger.warn(
          `Database size ${sizeMb} MB exceeds threshold ${this.thresholdMb} MB. Consider enabling retention or TimescaleDB.`,
        );
      } else {
        this.logger.log(`Database size: ${sizeMb} MB (threshold: ${this.thresholdMb} MB)`);
      }
    } catch (err) {
      this.logger.error('Failed to check database size', (err as Error).stack);
    }
  }
}
