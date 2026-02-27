import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt.guard';
import { ProcessesService } from './processes.service';

@ApiTags('processes')
@Controller('processes')
@UseGuards(OptionalJwtAuthGuard)
export class ProcessesController {
  constructor(private processes: ProcessesService) {}

  @Get()
  @ApiQuery({ name: 'host', required: true })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'limit', required: false })
  list(
    @Query('host') hostId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    const lim = limit ? parseInt(limit, 10) : 500;
    return this.processes.findRange(hostId, fromDate, toDate, lim);
  }
}
