import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt.guard';
import { MetricsService } from './metrics.service';

@ApiTags('metrics')
@Controller('metrics')
@UseGuards(OptionalJwtAuthGuard)
export class MetricsController {
  constructor(private metrics: MetricsService) {}

  @Get()
  @ApiQuery({ name: 'host', required: true })
  @ApiQuery({ name: 'from', required: true })
  @ApiQuery({ name: 'to', required: true })
  @ApiQuery({ name: 'resolution', required: false, enum: ['raw', '1m', '5m'] })
  list(
    @Query('host') hostId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('resolution') resolution?: string,
  ) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const res = (resolution === '5m' ? '5m' : resolution === '1m' ? '1m' : 'raw') as 'raw' | '1m' | '5m';
    return this.metrics.findRange(hostId, fromDate, toDate, res);
  }
}
