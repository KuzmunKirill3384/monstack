import { Module } from '@nestjs/common';
import { IngestController } from './ingest.controller';
import { IngestService } from './ingest.service';
import { HostsModule } from '../hosts/hosts.module';

@Module({
  imports: [HostsModule],
  controllers: [IngestController],
  providers: [IngestService],
})
export class IngestModule {}
