import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const HOST_ID = 'host-e2e-hosts-1';
const now = new Date();

const mockHosts = [
  {
    id: HOST_ID,
    name: 'test-host',
    tokenHash: 'abc123',
    agentUrl: null,
    os: 'linux',
    arch: 'amd64',
    tags: {},
    createdAt: now,
    lastSeenAt: new Date(now.getTime() - 10_000),
  },
  {
    id: 'host-e2e-hosts-2',
    name: 'offline-host',
    tokenHash: 'def456',
    agentUrl: null,
    os: 'linux',
    arch: null,
    tags: {},
    createdAt: now,
    lastSeenAt: new Date(now.getTime() - 120_000),
  },
];

function createPrismaMock() {
  return {
    $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    host: {
      findMany: jest.fn().mockResolvedValue(mockHosts),
      findUnique: jest.fn().mockImplementation(({ where }: { where: { id?: string } }) => {
        const h = mockHosts.find((host) => host.id === where.id);
        return Promise.resolve(h ?? null);
      }),
    },
    metricsRaw: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    user: { findUnique: jest.fn().mockResolvedValue(null) },
    alertEvent: { findMany: jest.fn().mockResolvedValue([]) },
    alertRule: { findMany: jest.fn().mockResolvedValue([]) },
  };
}

describe('Hosts (e2e)', () => {
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

  it('GET /hosts returns list of hosts with online status', async () => {
    const res = await app.inject({ method: 'GET', url: '/hosts' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(2);
    expect(body[0]).toHaveProperty('id');
    expect(body[0]).toHaveProperty('online');
    expect(body[0]).toHaveProperty('lastMetric');
  });

  it('GET /hosts?online=true filters to online hosts only', async () => {
    const res = await app.inject({ method: 'GET', url: '/hosts?online=true' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    for (const h of body) {
      expect(h.online).toBe(true);
    }
  });

  it('GET /hosts/:id returns single host', async () => {
    const res = await app.inject({ method: 'GET', url: `/hosts/${HOST_ID}` });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.id).toBe(HOST_ID);
    expect(body).toHaveProperty('online');
  });

  it('GET /hosts/:id for nonexistent host returns null', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/hosts/nonexistent-id',
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body).toBeNull();
  });
});
