"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const platform_fastify_1 = require("@nestjs/platform-fastify");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const rate_limit_1 = __importDefault(require("@fastify/rate-limit"));
const app_module_1 = require("./app.module");
const INGEST_BODY_LIMIT = 1024 * 1024;
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, new platform_fastify_1.FastifyAdapter({ bodyLimit: INGEST_BODY_LIMIT }));
    const rateLimitMax = parseInt(process.env.INGEST_RATE_LIMIT_MAX ?? '120', 10);
    const rateLimitWindowMs = parseInt(process.env.INGEST_RATE_LIMIT_WINDOW_MS ?? '60000', 10);
    if (process.env.INGEST_RATE_LIMIT_DISABLED !== '1' &&
        rateLimitMax > 0 &&
        rateLimitWindowMs > 0) {
        await app.register(rate_limit_1.default, {
            max: rateLimitMax,
            timeWindow: rateLimitWindowMs,
            keyGenerator: (request) => {
                const auth = request.headers.authorization;
                return auth ?? request.ip ?? 'anonymous';
            },
        });
    }
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, transform: true }));
    const config = new swagger_1.DocumentBuilder()
        .setTitle('Monitoring API')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api/docs', app, document);
    const port = process.env.PORT ?? 3000;
    await app.listen(port, '0.0.0.0');
}
bootstrap();
//# sourceMappingURL=main.js.map