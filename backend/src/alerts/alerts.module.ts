import { Module } from '@nestjs/common';
import { AlertsController } from './alerts.controller';
import { AlertRulesController } from './alert-rules.controller';
import { AlertsService } from './alerts.service';
import { AlertsCronService } from './alerts-cron.service';
import { HostsModule } from '../hosts/hosts.module';

@Module({
  imports: [HostsModule],
  controllers: [AlertsController, AlertRulesController],
  providers: [AlertsService, AlertsCronService],
})
export class AlertsModule {}
