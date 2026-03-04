import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiQuery, ApiTags } from '@nestjs/swagger';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt.guard';
import { HostsService } from './hosts.service';
import { ProcessSignalService } from './process-signal.service';
import { SignalProcessDto } from './signal-process.dto';

@ApiTags('hosts')
@Controller('hosts')
@UseGuards(OptionalJwtAuthGuard)
export class HostsController {
  constructor(
    private hosts: HostsService,
    private processSignal: ProcessSignalService,
  ) {}

  @Get()
  @ApiQuery({ name: 'online', required: false, enum: ['true', 'false'] })
  list(@Query('online') online?: string) {
    const onlineOnly =
      online === 'true' ? true : online === 'false' ? false : undefined;
    return this.hosts.findAll(onlineOnly);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.hosts.findOne(id);
  }

  @Post(':id/processes/:pid/signal')
  @ApiBody({ type: SignalProcessDto })
  async signalProcess(
    @Param('id') id: string,
    @Param('pid', ParseIntPipe) pid: number,
    @Body() dto: SignalProcessDto,
  ) {
    await this.processSignal.sendSignal(id, pid, dto.signal);
    return { ok: true };
  }
}
