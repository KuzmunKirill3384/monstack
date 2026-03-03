import { AsyncLocalStorage } from 'async_hooks';

export const requestContext = new AsyncLocalStorage<{ traceId: string }>();

export function getTraceId(): string | undefined {
  return requestContext.getStore()?.traceId;
}
