import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt.guard';
import { PrismaService } from '../prisma/prisma.service';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

class CreateAlertRuleDto {
  @IsString()
  hostId!: string | null;

  @IsString()
  metric!: string;

  @IsString()
  op!: string;

  @IsNumber()
  @IsOptional()
  threshold?: number | null;

  @IsString()
  @IsOptional()
  window?: string;

  @IsString()
  @IsOptional()
  severity?: string;
}

class UpdateAlertRuleDto {
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsNumber()
  @IsOptional()
  threshold?: number;
}

@ApiTags('alert-rules')
@Controller('alert-rules')
@UseGuards(OptionalJwtAuthGuard)
export class AlertRulesController {
  constructor(private prisma: PrismaService) {}

  @Get()
  list(@Query('host') hostId?: string) {
    return this.prisma.alertRule.findMany({
      where: hostId ? { OR: [{ hostId }, { hostId: null }] } : undefined,
    });
  }

  @Post()
  create(@Body() dto: CreateAlertRuleDto) {
    return this.prisma.alertRule.create({
      data: {
        hostId: dto.hostId ?? undefined,
        metric: dto.metric,
        op: dto.op,
        threshold: dto.threshold ?? undefined,
        window: dto.window ?? '5m',
        severity: dto.severity ?? 'warning',
      },
    });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAlertRuleDto) {
    return this.prisma.alertRule.update({
      where: { id },
      data: {
        ...(dto.enabled !== undefined && { enabled: dto.enabled }),
        ...(dto.threshold !== undefined && { threshold: dto.threshold }),
      },
    });
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.prisma.alertRule.delete({ where: { id } });
  }
}
