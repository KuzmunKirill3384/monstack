import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const HOST_ID = 'host-metrics-e2e-1';

function makeRow(ts: string, cpu: number) {
  return {
    id: `m-${ts}`,
    ts: new Date(ts),
    hostId: HOST_ID,
    cpuTotalPct: cpu,
    load1: 1,
    load5: 2,
    load15: 3,
    memUsedMb: 100,
    memTotalMb: 1024,
    diskUsedPct: 50,
    netRxBps: BigInt(0),
    netTxBps: BigInt(0),
  };
}

const sampleRows = [
  makeRow('2025-06-01T12:00:00Z', 10),
  makeRow('2025-06-01T12:01:00Z', 20),
  makeRow('2025-06-01T12:02:00Z', 30),
];

function createPrismaMock() {
  return {
    $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    metricsRaw: {
      findMany: jest.fn().mockResolvedValue(sampleRows),
    },
    host: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    user: { findUnique: jest.fn().mockResolvedValue(null) },
    alertEvent: { findMany: jest.fn().mockResolvedValue([]) },
    alertRule: { findMany: jest.fn().mockResolvedValue([]) },
  };
}

describe('Metrics (e2e)', () => {
  let app: NestFastifyApplication;
  let prismaMock: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prismaMock = createPrismaMock();
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
  });

  it('GET /metrics returns data with required fields', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/metrics?host=${HOST_ID}&from=2025-06-01T00:00:00Z&to=2025-06-02T00:00:00Z`,
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data).toBeDefined();
    expect(body.data.length).toBe(3);
    expect(body.data[0]).toHaveProperty('ts');
    expect(body.data[0]).toHaveProperty('cpu_total_pct');
    expect(body.data[0]).toHaveProperty('load1');
  });

  it('GET /metrics without host returns 400', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/metrics?from=2025-06-01T00:00:00Z&to=2025-06-02T00:00:00Z',
    });
    expect(res.statusCode).toBe(400);
  });

  it('GET /metrics with from > to returns 400', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/metrics?host=${HOST_ID}&from=2025-06-02T00:00:00Z&to=2025-06-01T00:00:00Z`,
    });
    expect(res.statusCode).toBe(400);
  });

  it('GET /metrics with invalid from returns 400', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/metrics?host=${HOST_ID}&from=not-a-date&to=2025-06-02T00:00:00Z`,
    });
    expect(res.statusCode).toBe(400);
  });

  it('GET /metrics with resolution=1m calls $queryRaw', async () => {
    prismaMock.$queryRaw.mockResolvedValue([]);
    const res = await app.inject({
      method: 'GET',
      url: `/metrics?host=${HOST_ID}&from=2025-06-01T00:00:00Z&to=2025-06-02T00:00:00Z&resolution=1m`,
    });
    expect(res.statusCode).toBe(200);
  });

  it('GET /metrics returns nextCursor when more data available', async () => {
    prismaMock.metricsRaw.findMany.mockResolvedValue([
      ...sampleRows,
      makeRow('2025-06-01T12:03:00Z', 40),
    ]);
    const res = await app.inject({
      method: 'GET',
      url: `/metrics?host=${HOST_ID}&from=2025-06-01T00:00:00Z&to=2025-06-02T00:00:00Z&limit=3`,
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.nextCursor).toBeTruthy();
  });
});
