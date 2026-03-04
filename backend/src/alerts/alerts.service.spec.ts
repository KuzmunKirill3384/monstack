import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { AlertsService } from './alerts.service';

describe('AlertsService', () => {
  let service: AlertsService;
  let prisma: PrismaService;

  const mockEvent = {
    id: 'e1',
    hostId: 'host-1',
    ruleId: 'r1',
    ts: new Date(),
    status: 'firing',
    message: 'CPU high',
    rule: { id: 'r1', metric: 'cpu_total_pct', threshold: 90, op: 'gt' },
  };

  const mockRule = {
    id: 'r1',
    hostId: 'host-1',
    metric: 'cpu_total_pct',
    op: 'gt',
    threshold: 90,
    window: '5m',
    severity: 'warning',
    enabled: true,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsService,
        {
          provide: PrismaService,
          useValue: {
            alertEvent: { findMany: jest.fn() },
            alertRule: { findMany: jest.fn() },
          },
        },
      ],
    }).compile();

    service = module.get<AlertsService>(AlertsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('findEvents calls prisma with where and take 200', async () => {
    (prisma.alertEvent.findMany as jest.Mock).mockResolvedValue([]);
    await service.findEvents();
    expect(prisma.alertEvent.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { ts: 'desc' },
      take: 200,
      include: { rule: true },
    });
  });

  it('findEvents filters by hostId, from, to, status', async () => {
    (prisma.alertEvent.findMany as jest.Mock).mockResolvedValue([]);
    const from = new Date();
    const to = new Date();
    await service.findEvents('host-1', from, to, 'firing');
    expect(prisma.alertEvent.findMany).toHaveBeenCalledWith({
      where: {
        hostId: 'host-1',
        ts: { gte: from, lte: to },
        status: 'firing',
      },
      orderBy: { ts: 'desc' },
      take: 200,
      include: { rule: true },
    });
  });

  it('findEvents returns events with rule', async () => {
    (prisma.alertEvent.findMany as jest.Mock).mockResolvedValue([mockEvent]);
    const result = await service.findEvents();
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      status: 'firing',
      rule: { metric: 'cpu_total_pct' },
    });
  });

  it('findRules returns all when no hostId', async () => {
    (prisma.alertRule.findMany as jest.Mock).mockResolvedValue([mockRule]);
    const result = await service.findRules();
    expect(result).toHaveLength(1);
    expect(prisma.alertRule.findMany).toHaveBeenCalledWith({
      where: undefined,
    });
  });

  it('findRules filters by hostId or null', async () => {
    (prisma.alertRule.findMany as jest.Mock).mockResolvedValue([]);
    await service.findRules('host-1');
    expect(prisma.alertRule.findMany).toHaveBeenCalledWith({
      where: { OR: [{ hostId: 'host-1' }, { hostId: null }] },
    });
  });
});
