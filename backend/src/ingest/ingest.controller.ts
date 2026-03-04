import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IngestBatchDto } from './ingest.dto';
import { IngestService } from './ingest.service';
import { HostTokenGuard } from './host-token.guard';
import { FastifyRequest } from 'fastify';

@ApiTags('ingest')
@Controller('v1')
export class IngestController {
  constructor(private ingestService: IngestService) {}

  @Post('ingest')
  @UseGuards(HostTokenGuard)
  async postIngest(
    @Req() req: FastifyRequest & { host: { id: string } },
    @Body() dto: IngestBatchDto,
  ) {
    const agentUrl =
      (req.headers['x-agent-url'] as string | undefined) ?? undefined;
    await this.ingestService.ingest(req.host.id, dto, agentUrl);
  }
}
