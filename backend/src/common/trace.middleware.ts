import { Injectable, NestMiddleware } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'crypto';
import { requestContext } from './request-context';

const HEADER = 'x-request-id';

@Injectable()
export class TraceMiddleware implements NestMiddleware {
  use(req: FastifyRequest, res: FastifyReply, next: () => void) {
    const traceId =
      (req.headers[HEADER] as string) ?? randomUUID();
    (req as FastifyRequest & { traceId?: string }).traceId = traceId;
    const setHeader = (res as { header?: (k: string, v: string) => void }).header;
    if (typeof setHeader === 'function') {
      setHeader.call(res, HEADER, traceId);
    }
    requestContext.run({ traceId }, () => next());
  }
}
