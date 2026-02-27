import { NestFactory } from '@nestjs/core';
import { JsonLogger } from './common/logger';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import fastifyRateLimit from '@fastify/rate-limit';
import { AppModule } from './app.module';

const INGEST_BODY_LIMIT = 1024 * 1024; // 1 MB

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ bodyLimit: INGEST_BODY_LIMIT }),
    { bufferLogs: true },
  );
  if (process.env.LOG_JSON === 'true') {
    app.useLogger(new JsonLogger());
  }
  const rateLimitMax = parseInt(
    process.env.INGEST_RATE_LIMIT_MAX ?? '120',
    10,
  );
  const rateLimitWindowMs = parseInt(
    process.env.INGEST_RATE_LIMIT_WINDOW_MS ?? '60000',
    10,
  );
  if (
    process.env.INGEST_RATE_LIMIT_DISABLED !== '1' &&
    rateLimitMax > 0 &&
    rateLimitWindowMs > 0
  ) {
    await app.register(fastifyRateLimit, {
      max: rateLimitMax,
      timeWindow: rateLimitWindowMs,
      keyGenerator: (request) => {
        const auth = request.headers.authorization;
        return auth ?? request.ip ?? 'anonymous';
      },
    });
  }
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );
  const config = new DocumentBuilder()
    .setTitle('Monitoring API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
}

bootstrap();
