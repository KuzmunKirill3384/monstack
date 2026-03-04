import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const RULE_ID = 'rule-e2e-1';

const mockRule = {
  id: RULE_ID,
  hostId: null,
  metric: 'cpu_total_pct',
  op: '>',
  threshold: 90,
  window: '5m',
  severity: 'critical',
  enabled: true,
  createdAt: new Date(),
};

function createPrismaMock() {
  return {
    $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    alertRule: {
      findMany: jest.fn().mockResolvedValue([mockRule]),
      findUnique: jest.fn().mockImplementation(({ where }: { where: { id: string } }) =>
        Promise.resolve(where.id === RULE_ID ? mockRule : null),
      ),
      create: jest.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ ...mockRule, ...data, id: 'new-rule-id' }),
      ),
      update: jest.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ ...mockRule, ...data }),
      ),
      delete: jest.fn().mockResolvedValue(mockRule),
    },
    host: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
    },
    metricsRaw: { findMany: jest.fn().mockResolvedValue([]) },
    user: { findUnique: jest.fn().mockResolvedValue(null) },
    alertEvent: { findMany: jest.fn().mockResolvedValue([]) },
  };
}

describe('AlertRules (e2e)', () => {
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

  it('GET /alert-rules returns list of rules', async () => {
    const res = await app.inject({ method: 'GET', url: '/alert-rules' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(Array.isArray(body)).toBe(true);
    expect(body[0]).toHaveProperty('metric');
    expect(body[0]).toHaveProperty('threshold');
  });

  it('POST /alert-rules creates a rule', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/alert-rules',
      headers: { 'content-type': 'application/json' },
      payload: {
        metric: 'disk_used_pct',
        op: '>',
        threshold: 95,
        severity: 'critical',
      },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body).toHaveProperty('id');
    expect(prismaMock.alertRule.create).toHaveBeenCalledTimes(1);
  });

  it('PATCH /alert-rules/:id updates a rule', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/alert-rules/${RULE_ID}`,
      headers: { 'content-type': 'application/json' },
      payload: { enabled: false },
    });
    expect(res.statusCode).toBe(200);
    expect(prismaMock.alertRule.update).toHaveBeenCalledTimes(1);
  });

  it('DELETE /alert-rules/:id deletes a rule', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/alert-rules/${RULE_ID}`,
    });
    expect(res.statusCode).toBe(200);
    expect(prismaMock.alertRule.delete).toHaveBeenCalledTimes(1);
  });
});
