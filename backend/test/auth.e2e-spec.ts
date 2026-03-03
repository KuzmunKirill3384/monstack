import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import fastifyCookie from '@fastify/cookie';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import * as crypto from 'crypto';

const SALT = process.env.PASSWORD_SALT ?? 'e2e-salt';
const SEED_EMAIL = 'demo@test.com';
const SEED_PASSWORD = 'demo';

const seedUser = {
  id: 'user-e2e-1',
  email: SEED_EMAIL,
  passwordHash: crypto.createHash('sha256').update(SEED_PASSWORD + SALT).digest('hex'),
  role: 'admin',
  createdAt: new Date(),
};

function createPrismaMock() {
  return {
    $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    user: {
      findUnique: jest.fn().mockImplementation((args: { where: { email?: string; id?: string } }) => {
        const w = args?.where ?? {};
        if (w.email === seedUser.email || w.id === seedUser.id) {
          return Promise.resolve(seedUser);
        }
        return Promise.resolve(null);
      }),
    },
    host: { findMany: jest.fn().mockResolvedValue([]) },
    metricsRaw: { findMany: jest.fn().mockResolvedValue([]) },
    procSnapshot: { findMany: jest.fn().mockResolvedValue([]) },
    alertEvent: { findMany: jest.fn().mockResolvedValue([]) },
    alertRule: { findMany: jest.fn().mockResolvedValue([]) },
  };
}

describe('Auth (e2e)', () => {
  let app: NestFastifyApplication;
  const prismaMock = createPrismaMock();

  beforeAll(() => {
    process.env.AUTH_ENABLED = 'true';
  });

  afterAll(() => {
    delete process.env.AUTH_ENABLED;
  });

  beforeEach(async () => {
    (prismaMock.user.findUnique as jest.Mock).mockImplementation(
      (args: { where?: { email?: string; id?: string } }) => {
        const w = args?.where ?? {};
        if (w.email === seedUser.email || w.id === seedUser.id) {
          return Promise.resolve(seedUser);
        }
        return Promise.resolve(null);
      },
    );
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    await app.register(fastifyCookie, { secret: 'e2e-cookie-secret' });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterEach(async () => {
    await app?.close();
  });

  it('POST /auth/login returns 200 and access_token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: SEED_EMAIL, password: SEED_PASSWORD },
    });
    expect(res.statusCode).toBeGreaterThanOrEqual(200);
    expect(res.statusCode).toBeLessThan(300);
    const body = JSON.parse(res.payload);
    expect(body).toHaveProperty('access_token');
    expect(typeof body.access_token).toBe('string');
  });

  it('POST /auth/login returns 401 for invalid credentials', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: SEED_EMAIL, password: 'wrong' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('GET /auth/me with cookie returns user', async () => {
    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: SEED_EMAIL, password: SEED_PASSWORD },
    });
    expect(loginRes.statusCode).toBeGreaterThanOrEqual(200);
    expect(loginRes.statusCode).toBeLessThan(300);
    const body = JSON.parse(loginRes.payload);
    const token = body.access_token;
    expect(token).toBeDefined();

    const meRes = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { cookie: `access_token=${token}` },
    });
    expect(meRes.statusCode).toBe(200);
    const meBody = JSON.parse(meRes.payload);
    expect(meBody.email).toBe(SEED_EMAIL);
    expect(meBody.id).toBe(seedUser.id);
  });

  it('GET /auth/me without cookie returns 401 when AUTH_ENABLED', async () => {
    const res = await app.inject({ method: 'GET', url: '/auth/me' });
    expect(res.statusCode).toBe(401);
  });

  it('GET /hosts without token returns 401 when AUTH_ENABLED', async () => {
    const res = await app.inject({ method: 'GET', url: '/hosts' });
    expect(res.statusCode).toBe(401);
  });

  it('GET /hosts with Bearer token returns 200', async () => {
    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: SEED_EMAIL, password: SEED_PASSWORD },
    });
    const { access_token } = JSON.parse(loginRes.payload);

    const res = await app.inject({
      method: 'GET',
      url: '/hosts',
      headers: { authorization: `Bearer ${access_token}` },
    });
    expect(res.statusCode).toBe(200);
  });
});
