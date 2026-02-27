import { Module } from '@nestjs/common';
import { HostsController } from './hosts.controller';
import { HostsService } from './hosts.service';
import { ProcessSignalService } from './process-signal.service';

@Module({
  controllers: [HostsController],
  providers: [HostsService, ProcessSignalService],
  exports: [HostsService],
})
export class HostsModule {}
