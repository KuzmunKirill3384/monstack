import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HostsService } from '../hosts/hosts.service';
import { IngestBatchDto } from './ingest.dto';

@Injectable()
export class IngestService {
  constructor(
    private prisma: PrismaService,
    private hosts: HostsService,
  ) {}

  async ingest(hostId: string, dto: IngestBatchDto) {
    if (dto.host_id !== hostId) {
      throw new BadRequestException('host_id does not match token');
    }
    const ts = new Date(dto.ts);
    if (isNaN(ts.getTime())) {
      throw new BadRequestException('Invalid ts');
    }

    await this.prisma.$transaction([
      this.prisma.metricsRaw.create({
        data: {
          ts,
          hostId,
          cpuTotalPct: dto.metrics.cpu_total_pct,
          load1: dto.metrics.load1,
          load5: dto.metrics.load5,
          load15: dto.metrics.load15,
          memUsedMb: dto.metrics.mem_used_mb,
          memTotalMb: dto.metrics.mem_total_mb,
          diskUsedPct: dto.metrics.disk_used_pct,
          netRxBps: BigInt(dto.metrics.net_rx_bps),
          netTxBps: BigInt(dto.metrics.net_tx_bps),
        },
      }),
      ...(dto.processes?.length
        ? dto.processes.map((p) =>
            this.prisma.procSnapshot.create({
              data: {
                hostId,
                ts,
                pid: p.pid,
                name: p.name,
                cpuPct: p.cpu_pct,
                rssMb: p.rss_mb,
                ioReadBps: p.io_read_bps != null ? BigInt(p.io_read_bps) : null,
                ioWriteBps: p.io_write_bps != null ? BigInt(p.io_write_bps) : null,
                state: p.state ?? null,
              },
            }),
          )
        : []),
    ]);

    await this.hosts.updateLastSeen(hostId);
  }
}
