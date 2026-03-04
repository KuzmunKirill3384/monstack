import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt.guard';
import { MetricsService } from './metrics.service';

function parseDate(param: string, name: string): Date {
  const d = new Date(param);
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestException(
      `Invalid or missing ${name}: expected ISO 8601 date`,
    );
  }
  return d;
}

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
  @ApiQuery({ name: 'limit', required: false, description: 'Max rows (1-10000, default 5000)' })
  @ApiQuery({ name: 'cursor', required: false, description: 'Cursor (last seen id) for pagination' })
  list(
    @Query('host') hostId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('resolution') resolution?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    if (!hostId?.trim()) {
      throw new BadRequestException('Query "host" is required');
    }
    if (!from?.trim()) {
      throw new BadRequestException('Query "from" is required (ISO 8601 date)');
    }
    if (!to?.trim()) {
      throw new BadRequestException('Query "to" is required (ISO 8601 date)');
    }
    const fromDate = parseDate(from, 'from');
    const toDate = parseDate(to, 'to');
    if (fromDate.getTime() > toDate.getTime()) {
      throw new BadRequestException('"from" must be before or equal to "to"');
    }
    const res = resolution === '5m' ? '5m' : resolution === '1m' ? '1m' : 'raw';
    const limitNum = limit != null ? parseInt(limit, 10) : undefined;
    const cursorId = cursor?.trim() || undefined;
    return this.metrics.findRange(hostId, fromDate, toDate, res, limitNum, cursorId);
  }
}
