/**
 * Per-request context store using Node's AsyncLocalStorage.
 *
 * Lets downstream services (e.g. SandboxRuntimeService) read the current
 * request's correlation ID without every controller having to thread it
 * through as a parameter.
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import type { Request, Response, NextFunction } from 'express';

export interface RequestContext {
  correlationId: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

/**
 * Returns the current request's correlation ID, or undefined if called
 * outside of a request scope.
 */
export function getCorrelationId(): string | undefined {
  return storage.getStore()?.correlationId;
}

/**
 * Express middleware: wraps the rest of the request lifecycle in a context
 * with the correlation ID set by `correlationIdMiddleware` (which must run first).
 */
export function requestContextMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const correlationId = (req.headers['x-correlation-id'] as string) || 'unknown';
  storage.run({ correlationId }, () => next());
}

/**
 * Run a callback inside an explicit context — useful from background tasks
 * (e.g. queue workers) that aren't tied to an Express request.
 */
export function withRequestContext<T>(ctx: RequestContext, fn: () => T): T {
  return storage.run(ctx, fn);
}
