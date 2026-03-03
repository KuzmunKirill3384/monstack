import { Controller, Get, Query, Sse, UseGuards } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { Observable, interval, map } from 'rxjs';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt.guard';
import { AlertsService } from './alerts.service';

@ApiTags('alerts')
@Controller('alerts')
@UseGuards(OptionalJwtAuthGuard)
export class AlertsController {
  constructor(private alerts: AlertsService) {}

  @Sse('stream')
  stream(): Observable<{ data: { refresh: boolean } }> {
    return interval(10000).pipe(map(() => ({ data: { refresh: true } })));
  }

  @Get()
  @ApiQuery({ name: 'host', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'status', required: false })
  list(
    @Query('host') hostId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: string,
  ) {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    return this.alerts.findEvents(hostId, fromDate, toDate, status);
  }

  @Get('rules')
  @ApiQuery({ name: 'host', required: false })
  rules(@Query('host') hostId?: string) {
    return this.alerts.findRules(hostId);
  }
}
