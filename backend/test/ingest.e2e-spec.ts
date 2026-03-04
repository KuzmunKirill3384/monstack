import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { Readable } from 'stream';
import { gzipSync, gunzipSync } from 'zlib';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import * as crypto from 'crypto';

const E2E_TOKEN = 'e2e-ingest-token';
const TOKEN_HASH = crypto.createHash('sha256').update(E2E_TOKEN).digest('hex');
const HOST_ID = 'host-e2e-ingest-1';

const mockHost = {
  id: HOST_ID,
  name: 'e2e-host',
  tokenHash: TOKEN_HASH,
  agentUrl: null,
  os: 'linux',
  arch: null,
  tags: {},
  createdAt: new Date(),
  lastSeenAt: null,
};

function createPrismaMock() {
  const metricsRawCreate = jest.fn().mockResolvedValue({ id: 'm1' });
  const procSnapshotCreate = jest.fn().mockResolvedValue({ id: 'p1' });
  const hostUpdate = jest.fn().mockResolvedValue(mockHost);

  return {
    $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $transaction: jest.fn().mockImplementation(async (arg: unknown) => {
      const ops = Array.isArray(arg) ? arg : [arg];
      const results = [];
      for (const op of ops) {
        const result = await op;
        results.push(result);
      }
      return results;
    }),
    host: {
      findUnique: jest.fn().mockImplementation((args: { where: { tokenHash?: string } }) => {
        if (args?.where?.tokenHash === TOKEN_HASH) {
          return Promise.resolve(mockHost);
        }
        return Promise.resolve(null);
      }),
      update: hostUpdate,
    },
    metricsRaw: { create: metricsRawCreate },
    procSnapshot: { create: procSnapshotCreate },
    user: { findUnique: jest.fn().mockResolvedValue(null) },
    alertEvent: { findMany: jest.fn().mockResolvedValue([]) },
    alertRule: { findMany: jest.fn().mockResolvedValue([]) },
  };
}

describe('Ingest (e2e)', () => {
  let app: NestFastifyApplication;
  const prismaMock = createPrismaMock();

  beforeAll(() => {
    process.env.INGEST_RATE_LIMIT_DISABLED = '1';
  });

  afterAll(() => {
    delete process.env.INGEST_RATE_LIMIT_DISABLED;
  });

  beforeEach(async () => {
    prismaMock.host.findUnique.mockImplementation((args: { where: { tokenHash?: string } }) => {
      if (args?.where?.tokenHash === TOKEN_HASH) {
        return Promise.resolve(mockHost);
      }
      return Promise.resolve(null);
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter({ bodyLimit: 1024 * 1024 }),
    );

    const fastify = app.getHttpAdapter().getInstance();
    fastify.addHook('preParsing', async (request, _reply, payload) => {
      const encoding = (request.headers['content-encoding'] ?? '') as string;
      if (encoding.toLowerCase() !== 'gzip') return payload;
      const chunks: Buffer[] = [];
      for await (const chunk of payload) {
        chunks.push(Buffer.from(chunk));
      }
      const decompressed = gunzipSync(Buffer.concat(chunks));
      request.headers['content-length'] = String(decompressed.length);
      delete request.headers['content-encoding'];
      return Readable.from(decompressed);
    });

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

  it('POST /v1/ingest with gzip body, Bearer token returns 200 and writes to metrics_raw and proc_snapshots', async () => {
    const payload = {
      host_id: HOST_ID,
      ts: new Date().toISOString(),
      metrics: {
        cpu_total_pct: 10,
        load1: 1,
        load5: 2,
        load15: 3,
        mem_used_mb: 100,
        mem_total_mb: 1024,
        disk_used_pct: 50,
        net_rx_bps: 0,
        net_tx_bps: 0,
      },
      processes: [
        { pid: 1, name: 'init', cmd: '/sbin/init', cpu_pct: 0.1, rss_mb: 1 },
        { pid: 2, name: 'bash', cmd: 'bash -i', cpu_pct: 0.5, rss_mb: 2, io_read_bps: 1000, io_write_bps: 500 },
      ],
    };
    const jsonStr = JSON.stringify(payload);
    const gzipBody = gzipSync(Buffer.from(jsonStr));

    const res = await app.inject({
      method: 'POST',
      url: '/v1/ingest',
      headers: {
        authorization: `Bearer ${E2E_TOKEN}`,
        'content-type': 'application/json',
        'content-encoding': 'gzip',
      },
      payload: gzipBody,
    });

    expect(res.statusCode).toBeGreaterThanOrEqual(200);
    expect(res.statusCode).toBeLessThan(300);
    expect(prismaMock.metricsRaw.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.procSnapshot.create).toHaveBeenCalledTimes(2);
    expect(prismaMock.host.update).toHaveBeenCalledWith({
      where: { id: HOST_ID },
      data: expect.objectContaining({ lastSeenAt: expect.any(Date) }),
    });
  });

  it('POST /v1/ingest with plain JSON (no gzip) returns 200 and writes to metrics_raw', async () => {
    const payload = {
      host_id: HOST_ID,
      ts: new Date().toISOString(),
      metrics: {
        cpu_total_pct: 5,
        load1: 0.5,
        load5: 1,
        load15: 1.5,
        mem_used_mb: 200,
        mem_total_mb: 2048,
        disk_used_pct: 30,
        net_rx_bps: 100,
        net_tx_bps: 200,
      },
    };

    const res = await app.inject({
      method: 'POST',
      url: '/v1/ingest',
      headers: {
        authorization: `Bearer ${E2E_TOKEN}`,
        'content-type': 'application/json',
      },
      payload,
    });

    expect(res.statusCode).toBeGreaterThanOrEqual(200);
    expect(res.statusCode).toBeLessThan(300);
    expect(prismaMock.metricsRaw.create).toHaveBeenCalledTimes(1);
  });

  it('POST /v1/ingest without Bearer token returns 401', async () => {
    const payload = {
      host_id: HOST_ID,
      ts: new Date().toISOString(),
      metrics: {
        cpu_total_pct: 0,
        load1: 0,
        load5: 0,
        load15: 0,
        mem_used_mb: 0,
        mem_total_mb: 0,
        disk_used_pct: 0,
        net_rx_bps: 0,
        net_tx_bps: 0,
      },
    };
    const gzipBody = gzipSync(Buffer.from(JSON.stringify(payload)));

    const res = await app.inject({
      method: 'POST',
      url: '/v1/ingest',
      headers: {
        'content-type': 'application/json',
        'content-encoding': 'gzip',
      },
      payload: gzipBody,
    });

    expect(res.statusCode).toBe(401);
    expect(prismaMock.metricsRaw.create).not.toHaveBeenCalled();
  });
});
