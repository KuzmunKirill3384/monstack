import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const HOST_ID = 'host-proc-e2e-1';
const NOW = new Date();
const ONE_MIN_AGO = new Date(NOW.getTime() - 60 * 1000);
const TWO_MIN_AGO = new Date(NOW.getTime() - 2 * 60 * 1000);

const fixtureSnapshots = [
  {
    id: 'p1',
    hostId: HOST_ID,
    ts: ONE_MIN_AGO,
    pid: 100,
    name: 'node',
    cmd: 'node server.js',
    cpuPct: 5.2,
    rssMb: 50,
    ioReadBps: BigInt(1000),
    ioWriteBps: BigInt(500),
    state: 'R',
  },
  {
    id: 'p2',
    hostId: HOST_ID,
    ts: ONE_MIN_AGO,
    pid: 200,
    name: 'bash',
    cmd: null,
    cpuPct: 0.1,
    rssMb: 2,
    ioReadBps: null,
    ioWriteBps: null,
    state: 'S',
  },
];

function createPrismaMock() {
  const findMany = jest.fn().mockResolvedValue([...fixtureSnapshots]);

  return {
    $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    procSnapshot: {
      findMany,
    },
    host: { findMany: jest.fn().mockResolvedValue([]) },
    metricsRaw: { findMany: jest.fn().mockResolvedValue([]) },
    alertEvent: { findMany: jest.fn().mockResolvedValue([]) },
    alertRule: { findMany: jest.fn().mockResolvedValue([]) },
  };
}

describe('Processes (e2e)', () => {
  let app: NestFastifyApplication;
  const prismaMock = createPrismaMock();

  beforeEach(async () => {
    prismaMock.procSnapshot.findMany.mockResolvedValue([...fixtureSnapshots]);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterEach(async () => {
    await app?.close();
    jest.clearAllMocks();
  });

  it('GET /processes?host=...&from=...&to=... returns 200 and processes', async () => {
    const from = TWO_MIN_AGO.toISOString();
    const to = NOW.toISOString();

    const res = await app.inject({
      method: 'GET',
      url: `/processes?host=${HOST_ID}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(2);
    expect(body[0]).toMatchObject({
      pid: 100,
      name: 'node',
      cmd: 'node server.js',
      cpu_pct: 5.2,
      rss_mb: 50,
      io_read_bps: 1000,
      io_write_bps: 500,
      state: 'R',
    });
    expect(prismaMock.procSnapshot.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          hostId: HOST_ID,
          ts: expect.objectContaining({ gte: expect.any(Date), lte: expect.any(Date) }),
        }),
        orderBy: { ts: 'desc' },
        take: 500,
      }),
    );
  });

  it('GET /processes fallback when time window yields no data', async () => {
    prismaMock.procSnapshot.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([...fixtureSnapshots]);

    const from = TWO_MIN_AGO.toISOString();
    const to = NOW.toISOString();

    const res = await app.inject({
      method: 'GET',
      url: `/processes?host=${HOST_ID}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.length).toBe(2);
    expect(prismaMock.procSnapshot.findMany).toHaveBeenCalledTimes(2);
    const firstCall = prismaMock.procSnapshot.findMany.mock.calls[0][0];
    expect(firstCall.where.ts).toBeDefined();
    const secondCall = prismaMock.procSnapshot.findMany.mock.calls[1][0];
    expect(secondCall.where).toEqual({ hostId: HOST_ID });
  });

  it('GET /processes without host returns 400', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/processes',
    });
    expect(res.statusCode).toBe(400);
  });

  it('GET /processes with limit param', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/processes?host=${HOST_ID}&limit=10`,
    });
    expect(res.statusCode).toBe(200);
    expect(prismaMock.procSnapshot.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10 }),
    );
  });
});
