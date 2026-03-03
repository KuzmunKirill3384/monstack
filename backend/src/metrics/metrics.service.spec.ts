import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;
  let prisma: PrismaService;

  const mockRow = {
    id: 'm1',
    hostId: 'host-1',
    ts: new Date('2025-01-15T12:00:00Z'),
    cpuTotalPct: 25.5,
    load1: 1.2,
    load5: 1.1,
    load15: 1,
    memUsedMb: 512,
    memTotalMb: 1024,
    diskUsedPct: 60,
    netRxBps: BigInt(1000),
    netTxBps: BigInt(500),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsService,
        {
          provide: PrismaService,
          useValue: {
            metricsRaw: { findMany: jest.fn() },
          },
        },
      ],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('findRange calls prisma with hostId and date range', async () => {
    (prisma.metricsRaw.findMany as jest.Mock).mockResolvedValue([]);
    const from = new Date('2025-01-15T10:00:00Z');
    const to = new Date('2025-01-15T12:00:00Z');
    await service.findRange('host-1', from, to, 'raw');
    expect(prisma.metricsRaw.findMany).toHaveBeenCalledWith({
      where: {
        hostId: 'host-1',
        ts: { gte: from, lte: to },
      },
      orderBy: { ts: 'asc' },
    });
  });

  it('findRange maps rows to API format', async () => {
    (prisma.metricsRaw.findMany as jest.Mock).mockResolvedValue([mockRow]);
    const from = new Date('2025-01-15T10:00:00Z');
    const to = new Date('2025-01-15T12:00:00Z');
    const result = await service.findRange('host-1', from, to, '1m');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      ts: mockRow.ts.toISOString(),
      cpu_total_pct: 25.5,
      load1: 1.2,
      load5: 1.1,
      load15: 1,
      mem_used_mb: 512,
      mem_total_mb: 1024,
      disk_used_pct: 60,
      net_rx_bps: 1000,
      net_tx_bps: 500,
    });
  });

  it('findRange returns empty array when no data', async () => {
    (prisma.metricsRaw.findMany as jest.Mock).mockResolvedValue([]);
    const from = new Date();
    const to = new Date();
    const result = await service.findRange('host-1', from, to, 'raw');
    expect(result).toEqual([]);
  });
});
