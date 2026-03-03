import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { HostsService } from './hosts.service';

describe('HostsService', () => {
  let service: HostsService;
  let prisma: PrismaService;

  const mockHost = {
    id: 'host-1',
    name: 'test-host',
    tokenHash: 'hash',
    agentUrl: null,
    os: 'linux',
    arch: null,
    tags: {},
    createdAt: new Date(),
    lastSeenAt: new Date(),
  };

  const mockMetric = {
    id: 'm1',
    hostId: 'host-1',
    ts: new Date(),
    cpuTotalPct: 10,
    load1: 1,
    load5: 1,
    load15: 1,
    memUsedMb: 100,
    memTotalMb: 500,
    diskUsedPct: 50,
    netRxBps: BigInt(0),
    netTxBps: BigInt(0),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HostsService,
        {
          provide: PrismaService,
          useValue: {
            host: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              create: jest.fn(),
            },
            metricsRaw: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<HostsService>(HostsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('findAll returns empty when no hosts', async () => {
    (prisma.host.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.metricsRaw.findMany as jest.Mock).mockResolvedValue([]);
    const result = await service.findAll();
    expect(result).toEqual([]);
    expect(prisma.host.findMany).toHaveBeenCalledWith({
      orderBy: { lastSeenAt: 'desc' },
    });
  });

  it('findAll maps hosts with online and lastMetric', async () => {
    (prisma.host.findMany as jest.Mock).mockResolvedValue([mockHost]);
    (prisma.metricsRaw.findMany as jest.Mock).mockResolvedValue([mockMetric]);
    const result = await service.findAll();
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'host-1',
      name: 'test-host',
      online: true,
      lastMetric: {
        cpu_total_pct: 10,
        mem_used_mb: 100,
        mem_total_mb: 500,
        load1: 1,
      },
    });
  });

  it('findAll filters by onlineOnly', async () => {
    const recentHost = { ...mockHost, lastSeenAt: new Date() };
    const oldHost = { ...mockHost, id: 'h2', lastSeenAt: new Date(Date.now() - 60000) };
    (prisma.host.findMany as jest.Mock).mockResolvedValue([recentHost, oldHost]);
    (prisma.metricsRaw.findMany as jest.Mock).mockResolvedValue([mockMetric]);
    const online = await service.findAll(true);
    const offline = await service.findAll(false);
    expect(online.every((h) => h.online)).toBe(true);
    expect(offline.every((h) => !h.online)).toBe(true);
  });

  it('findOne returns null when host not found', async () => {
    (prisma.host.findUnique as jest.Mock).mockResolvedValue(null);
    const result = await service.findOne('missing');
    expect(result).toBeNull();
  });

  it('findOne returns host with online flag', async () => {
    (prisma.host.findUnique as jest.Mock).mockResolvedValue(mockHost);
    const result = await service.findOne('host-1');
    expect(result).toMatchObject({ id: 'host-1', name: 'test-host', online: true });
  });

  it('updateLastSeen calls prisma.update', async () => {
    (prisma.host.update as jest.Mock).mockResolvedValue(mockHost);
    await service.updateLastSeen('host-1');
    expect(prisma.host.update).toHaveBeenCalledWith({
      where: { id: 'host-1' },
      data: { lastSeenAt: expect.any(Date) },
    });
  });

  it('hashToken returns sha256 hex', () => {
    const hash = service.hashToken('secret');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(service.hashToken('secret')).toBe(hash);
  });

  it('create hashes token and creates host', async () => {
    (prisma.host.create as jest.Mock).mockResolvedValue(mockHost);
    await service.create({ name: 'n', token: 't' });
    expect(prisma.host.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'n',
        tokenHash: expect.any(String),
        os: 'linux',
      }),
    });
  });
});
