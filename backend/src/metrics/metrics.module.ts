import { Module } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { RetentionService } from './retention.service';
import { DbMonitorService } from './db-monitor.service';

@Module({
  controllers: [MetricsController],
  providers: [MetricsService, RetentionService, DbMonitorService],
})
export class MetricsModule {}
