/**
 * Request Tracing Middleware
 * Enterprise observability with correlation IDs
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { apiLogger } from '../config/logger';

export interface TraceContext {
  correlationId: string;
  traceId: string;
  parentId?: string;
  spanId: string;
  userId?: string;
  sessionId?: string;
  requestPath: string;
  method: string;
  timestamp: string;
  duration?: number;
  statusCode?: number;
}

// Trace context storage
const traceContext = new Map<string, TraceContext>();

// Get trace context for a correlation ID
export function getTraceContext(correlationId: string): TraceContext | undefined {
  return traceContext.get(correlationId);
}

// Create trace context for a request
export function createTraceContext(req: Request): TraceContext {
  const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();
  const traceId = (req.headers['x-trace-id'] as string) || uuidv4();
  const spanId = uuidv4().substring(0, 8);

  return {
    correlationId,
    traceId,
    spanId,
    userId: (req as any).user?.id,
    sessionId: (req as any).session?.id,
    requestPath: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  };
}

// Store trace context
export function storeTraceContext(correlationId: string, context: TraceContext): void {
  traceContext.set(correlationId, context);

  // Cleanup after 1 hour
  setTimeout(() => {
    traceContext.delete(correlationId);
  }, 60 * 60 * 1000);
}

// Update trace context with response data
export function updateTraceContext(
  correlationId: string,
  updates: Partial<TraceContext>
): void {
  const context = traceContext.get(correlationId);
  if (context) {
    Object.assign(context, updates);
  }
}

// Request tracing middleware
export function tracingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const startTime = Date.now();
  const context = createTraceContext(req);

  // Store context
  storeTraceContext(context.correlationId, context);

  // Set headers
  res.setHeader('X-Correlation-ID', context.correlationId);
  res.setHeader('X-Trace-ID', context.traceId);
  res.setHeader('X-Span-ID', context.spanId);

  // Capture response
  const originalEnd = res.end;
  res.end = function(...args: any[]): Response {
    const duration = Date.now() - startTime;

    // Update context
    updateTraceContext(context.correlationId, {
      duration,
      statusCode: res.statusCode,
    });

    // Log API call
    apiLogger.info('API request completed', {
      correlationId: context.correlationId,
      traceId: context.traceId,
      spanId: context.spanId,
      method: context.method,
      path: context.requestPath,
      statusCode: res.statusCode,
      duration,
      userId: context.userId,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });

    return originalEnd.apply(this, args as any);
  };

  // Attach to request
  (req as any).traceContext = context;

  next();
}

// Performance measurement
export interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

const performanceMetrics: PerformanceMetric[] = [];

export function recordPerformanceMetric(metric: PerformanceMetric): void {
  performanceMetrics.push(metric);

  // Keep last 1000 metrics
  if (performanceMetrics.length > 1000) {
    performanceMetrics.shift();
  }

  // Log slow operations
  if (metric.duration > 1000) {
    apiLogger.warn('Slow operation detected', {
      operation: metric.operation,
      duration: metric.duration,
      metadata: metric.metadata,
    });
  }
}

export function getPerformanceMetrics(): PerformanceMetric[] {
  return [...performanceMetrics];
}

export function getAverageOperationDuration(operation: string): number {
  const metrics = performanceMetrics.filter(m => m.operation === operation);
  if (metrics.length === 0) return 0;

  const total = metrics.reduce((sum, m) => sum + m.duration, 0);
  return total / metrics.length;
}

// Trace decorator for services
export function tracedOperation(operationName: string) {
  return function(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args: any[]) {
      const correlationId = (args.find(arg => arg?.correlationId))?.correlationId || uuidv4();
      const startTime = Date.now();

      apiLogger.debug(`Starting operation: ${operationName}`, {
        correlationId,
        operation: operationName,
      });

      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;

        recordPerformanceMetric({
          operation: operationName,
          duration,
          timestamp: new Date().toISOString(),
        });

        apiLogger.debug(`Completed operation: ${operationName}`, {
          correlationId,
          operation: operationName,
          duration,
        });

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;

        apiLogger.error(`Failed operation: ${operationName}`, {
          correlationId,
          operation: operationName,
          duration,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        throw error;
      }
    };

    return descriptor;
  };
}

// Service health tracking
export interface ServiceHealth {
  serviceName: string;
  status: 'healthy' | 'degraded' | 'down';
  lastCheck: string;
  averageResponseTime: number;
  errorRate: number;
  requestCount: number;
}

const serviceHealth: Map<string, ServiceHealth> = new Map();

export function updateServiceHealth(
  serviceName: string,
  status: 'healthy' | 'degraded' | 'down',
  responseTime: number,
  error: boolean
): void {
  const existing = serviceHealth.get(serviceName);

  if (existing) {
    const totalResponseTime = existing.averageResponseTime * existing.requestCount + responseTime;
    const totalErrors = existing.errorRate * existing.requestCount + (error ? 1 : 0);

    serviceHealth.set(serviceName, {
      serviceName,
      status,
      lastCheck: new Date().toISOString(),
      averageResponseTime: totalResponseTime / (existing.requestCount + 1),
      errorRate: totalErrors / (existing.requestCount + 1),
      requestCount: existing.requestCount + 1,
    });
  } else {
    serviceHealth.set(serviceName, {
      serviceName,
      status,
      lastCheck: new Date().toISOString(),
      averageResponseTime: responseTime,
      errorRate: error ? 1 : 0,
      requestCount: 1,
    });
  }
}

export function getServiceHealth(serviceName?: string): ServiceHealth | ServiceHealth[] {
  if (serviceName) {
    return serviceHealth.get(serviceName) || {
      serviceName,
      status: 'down',
      lastCheck: new Date().toISOString(),
      averageResponseTime: 0,
      errorRate: 0,
      requestCount: 0,
    };
  }
  return Array.from(serviceHealth.values());
}
