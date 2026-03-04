import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { HostsService } from '../hosts/hosts.service';
import { IngestService } from './ingest.service';

describe('IngestService', () => {
  let service: IngestService;
  let prisma: PrismaService;
  let hosts: HostsService;

  const validDto = {
    host_id: 'host-1',
    ts: '2025-02-27T12:00:00.000Z',
    metrics: {
      cpu_total_pct: 10,
      load1: 1,
      load5: 1,
      load15: 1,
      mem_used_mb: 100,
      mem_total_mb: 500,
      disk_used_pct: 50,
      net_rx_bps: 0,
      net_tx_bps: 0,
    },
    processes: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngestService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: jest.fn().mockImplementation((fn) => {
              const tx = {
                metricsRaw: { create: jest.fn().mockResolvedValue({}) },
                procSnapshot: {
                  createMany: jest.fn().mockResolvedValue({ count: 0 }),
                },
              };
              return typeof fn === 'function' ? fn(tx) : Promise.resolve();
            }),
            metricsRaw: { create: jest.fn() },
            procSnapshot: { create: jest.fn(), createMany: jest.fn() },
          },
        },
        {
          provide: HostsService,
          useValue: { updateLastSeen: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get<IngestService>(IngestService);
    prisma = module.get<PrismaService>(PrismaService);
    hosts = module.get<HostsService>(HostsService);
  });

  it('throws when host_id does not match token', async () => {
    await expect(
      service.ingest('host-1', { ...validDto, host_id: 'other-host' }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.ingest('host-1', { ...validDto, host_id: 'other-host' }),
    ).rejects.toThrow('host_id does not match token');
  });

  it('throws when ts is invalid', async () => {
    await expect(
      service.ingest('host-1', { ...validDto, ts: 'not-a-date' }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.ingest('host-1', { ...validDto, ts: 'not-a-date' }),
    ).rejects.toThrow('Invalid ts');
  });

  it('calls prisma and updateLastSeen when valid', async () => {
    await service.ingest('host-1', validDto);
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(hosts.updateLastSeen).toHaveBeenCalledWith('host-1');
  });
});
