import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const mockEvents = [
  {
    id: 'evt-1',
    hostId: 'host-1',
    ruleId: 'rule-1',
    ts: new Date(),
    status: 'firing',
    message: 'cpu_total_pct > 90 (current: 95)',
    rule: { id: 'rule-1', metric: 'cpu_total_pct', op: '>', threshold: 90 },
  },
  {
    id: 'evt-2',
    hostId: 'host-1',
    ruleId: 'rule-1',
    ts: new Date(),
    status: 'resolved',
    message: 'cpu_total_pct back to normal',
    rule: { id: 'rule-1', metric: 'cpu_total_pct', op: '>', threshold: 90 },
  },
];

function createPrismaMock() {
  return {
    $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    alertEvent: {
      findMany: jest.fn().mockResolvedValue(mockEvents),
    },
    alertRule: { findMany: jest.fn().mockResolvedValue([]) },
    host: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
    },
    metricsRaw: { findMany: jest.fn().mockResolvedValue([]) },
    user: { findUnique: jest.fn().mockResolvedValue(null) },
  };
}

describe('AlertEvents (e2e)', () => {
  let app: NestFastifyApplication;

  beforeEach(async () => {
    const prismaMock = createPrismaMock();
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

  it('GET /alerts returns list of alert events', async () => {
    const res = await app.inject({ method: 'GET', url: '/alerts' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(2);
    expect(body[0]).toHaveProperty('status');
    expect(body[0]).toHaveProperty('message');
  });

  it('GET /alerts?status=firing filters by status', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/alerts?status=firing',
    });
    expect(res.statusCode).toBe(200);
  });
});
