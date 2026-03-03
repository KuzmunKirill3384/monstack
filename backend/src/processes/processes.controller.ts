import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt.guard';
import { ProcessesService } from './processes.service';

const MAX_LIMIT = 1000;

function parseDate(param: string, name: string): Date {
  const d = new Date(param);
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestException(`Invalid ${name}: expected ISO 8601 date`);
  }
  return d;
}

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
    if (!hostId?.trim()) {
      throw new BadRequestException('Query "host" is required');
    }
    const fromDate = from?.trim() ? parseDate(from, 'from') : undefined;
    const toDate = to?.trim() ? parseDate(to, 'to') : undefined;
    if (fromDate && toDate && fromDate.getTime() > toDate.getTime()) {
      throw new BadRequestException('"from" must be before or equal to "to"');
    }
    const lim = limit !== undefined && limit !== '' ? parseInt(limit, 10) : 500;
    if (Number.isNaN(lim) || lim < 1 || lim > MAX_LIMIT) {
      throw new BadRequestException(`"limit" must be between 1 and ${MAX_LIMIT}`);
    }
    return this.processes.findRange(hostId, fromDate, toDate, lim);
  }
}
