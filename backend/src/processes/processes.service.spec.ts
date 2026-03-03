import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ProcessesService } from './processes.service';

describe('ProcessesService', () => {
  let service: ProcessesService;
  let prisma: PrismaService;

  const mockRow = {
    id: 'p1',
    hostId: 'host-1',
    ts: new Date(),
    pid: 1234,
    name: 'node',
    cpuPct: 5.5,
    rssMb: 100,
    ioReadBps: BigInt(0),
    ioWriteBps: BigInt(0),
    state: 'R',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessesService,
        {
          provide: PrismaService,
          useValue: {
            procSnapshot: { findMany: jest.fn() },
          },
        },
      ],
    }).compile();

    service = module.get<ProcessesService>(ProcessesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('findRange calls prisma with hostId and default limit', async () => {
    (prisma.procSnapshot.findMany as jest.Mock).mockResolvedValue([]);
    await service.findRange('host-1');
    expect(prisma.procSnapshot.findMany).toHaveBeenCalledWith({
      where: { hostId: 'host-1' },
      orderBy: { ts: 'desc' },
      take: 500,
    });
  });

  it('findRange passes from, to and limit', async () => {
    (prisma.procSnapshot.findMany as jest.Mock).mockResolvedValue([]);
    const from = new Date('2025-01-01T00:00:00Z');
    const to = new Date('2025-01-01T01:00:00Z');
    await service.findRange('host-1', from, to, 100);
    expect(prisma.procSnapshot.findMany).toHaveBeenCalledWith({
      where: { hostId: 'host-1', ts: { gte: from, lte: to } },
      orderBy: { ts: 'desc' },
      take: 100,
    });
  });

  it('findRange maps rows to API format', async () => {
    (prisma.procSnapshot.findMany as jest.Mock).mockResolvedValue([mockRow]);
    const result = await service.findRange('host-1');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      ts: mockRow.ts.toISOString(),
      pid: 1234,
      name: 'node',
      cpu_pct: 5.5,
      rss_mb: 100,
      io_read_bps: 0,
      io_write_bps: 0,
      state: 'R',
    });
  });
});
