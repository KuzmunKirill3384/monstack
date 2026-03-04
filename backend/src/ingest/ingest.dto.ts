import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class IngestMetricsDto {
  @ApiProperty()
  @IsNumber()
  cpu_total_pct!: number;

  @ApiProperty()
  @IsNumber()
  load1!: number;

  @ApiProperty()
  @IsNumber()
  load5!: number;

  @ApiProperty()
  @IsNumber()
  load15!: number;

  @ApiProperty()
  @IsNumber()
  mem_used_mb!: number;

  @ApiProperty()
  @IsNumber()
  mem_total_mb!: number;

  @ApiProperty()
  @IsNumber()
  disk_used_pct!: number;

  @ApiProperty()
  @IsNumber()
  net_rx_bps!: number;

  @ApiProperty()
  @IsNumber()
  net_tx_bps!: number;
}

export class IngestProcessDto {
  @ApiProperty()
  @IsNumber()
  pid!: number;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsNumber()
  cpu_pct!: number;

  @ApiProperty()
  @IsNumber()
  rss_mb!: number;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  io_read_bps?: number;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  io_write_bps?: number;

  @ApiProperty()
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  cmd?: string;
}

export class IngestBatchDto {
  @ApiProperty()
  @IsString()
  host_id!: string;

  @ApiProperty()
  @IsString()
  ts!: string;

  @ApiProperty({ type: IngestMetricsDto })
  @ValidateNested()
  @Type(() => IngestMetricsDto)
  metrics!: IngestMetricsDto;

  @ApiProperty({ type: [IngestProcessDto], required: false })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => IngestProcessDto)
  processes?: IngestProcessDto[];
}
