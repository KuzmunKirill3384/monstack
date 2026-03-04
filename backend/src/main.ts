import { NestFactory } from '@nestjs/core';
import { JsonLogger } from './common/logger';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import fastifyCookie from '@fastify/cookie';
import fastifyRateLimit from '@fastify/rate-limit';
import { Readable } from 'stream';
import { gunzipSync } from 'zlib';
import { AppModule } from './app.module';

const INGEST_BODY_LIMIT = 1024 * 1024; // 1 MB

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ bodyLimit: INGEST_BODY_LIMIT }),
    { bufferLogs: true },
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
  await app.register(fastifyCookie, {
    secret: process.env.COOKIE_SECRET ?? 'monstack-cookie-secret',
  });
  if (process.env.LOG_JSON === 'true') {
    app.useLogger(new JsonLogger());
  }
  const rateLimitMax = parseInt(process.env.INGEST_RATE_LIMIT_MAX ?? '120', 10);
  const rateLimitWindowMs = parseInt(
    process.env.INGEST_RATE_LIMIT_WINDOW_MS ?? '60000',
    10,
  );
  if (
    process.env.INGEST_RATE_LIMIT_DISABLED !== '1' &&
    rateLimitMax > 0 &&
    rateLimitWindowMs > 0
  ) {
    const fastify = app.getHttpAdapter().getInstance();
    await fastify.register(
      async (scope) => {
        await scope.register(fastifyRateLimit, {
          max: rateLimitMax,
          timeWindow: rateLimitWindowMs,
          keyGenerator: (request) => {
            const auth = request.headers.authorization;
            return auth ?? request.ip ?? 'anonymous';
          },
        });
      },
      { prefix: '/v1' },
    );
  }
  const readRateLimitMax = parseInt(
    process.env.READ_RATE_LIMIT_MAX ?? '300',
    10,
  );
  const readRateLimitWindowMs = parseInt(
    process.env.READ_RATE_LIMIT_WINDOW_MS ?? '60000',
    10,
  );
  if (readRateLimitMax > 0 && readRateLimitWindowMs > 0) {
    const fastifyInstance = app.getHttpAdapter().getInstance();
    await fastifyInstance.register(fastifyRateLimit, {
      max: readRateLimitMax,
      timeWindow: readRateLimitWindowMs,
      keyGenerator: (request) => request.ip ?? 'anonymous',
      skipOnError: true,
    });
  }
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const config = new DocumentBuilder()
    .setTitle('Monitoring API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? true,
    credentials: true,
  });
  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
