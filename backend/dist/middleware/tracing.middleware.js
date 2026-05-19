"use strict";
/**
 * Request Tracing Middleware
 * Enterprise observability with correlation IDs
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTraceContext = getTraceContext;
exports.createTraceContext = createTraceContext;
exports.storeTraceContext = storeTraceContext;
exports.updateTraceContext = updateTraceContext;
exports.tracingMiddleware = tracingMiddleware;
exports.recordPerformanceMetric = recordPerformanceMetric;
exports.getPerformanceMetrics = getPerformanceMetrics;
exports.getAverageOperationDuration = getAverageOperationDuration;
exports.tracedOperation = tracedOperation;
exports.updateServiceHealth = updateServiceHealth;
exports.getServiceHealth = getServiceHealth;
const uuid_1 = require("uuid");
const logger_1 = require("../config/logger");
// Trace context storage
const traceContext = new Map();
// Get trace context for a correlation ID
function getTraceContext(correlationId) {
    return traceContext.get(correlationId);
}
// Create trace context for a request
function createTraceContext(req) {
    const correlationId = req.headers['x-correlation-id'] || (0, uuid_1.v4)();
    const traceId = req.headers['x-trace-id'] || (0, uuid_1.v4)();
    const spanId = (0, uuid_1.v4)().substring(0, 8);
    return {
        correlationId,
        traceId,
        spanId,
        userId: req.user?.id,
        sessionId: req.session?.id,
        requestPath: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
    };
}
// Store trace context
function storeTraceContext(correlationId, context) {
    traceContext.set(correlationId, context);
    // Cleanup after 1 hour
    setTimeout(() => {
        traceContext.delete(correlationId);
    }, 60 * 60 * 1000);
}
// Update trace context with response data
function updateTraceContext(correlationId, updates) {
    const context = traceContext.get(correlationId);
    if (context) {
        Object.assign(context, updates);
    }
}
// Request tracing middleware
function tracingMiddleware(req, res, next) {
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
    res.end = function (...args) {
        const duration = Date.now() - startTime;
        // Update context
        updateTraceContext(context.correlationId, {
            duration,
            statusCode: res.statusCode,
        });
        // Log API call
        logger_1.apiLogger.info('API request completed', {
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
        return originalEnd.apply(this, args);
    };
    // Attach to request
    req.traceContext = context;
    next();
}
const performanceMetrics = [];
function recordPerformanceMetric(metric) {
    performanceMetrics.push(metric);
    // Keep last 1000 metrics
    if (performanceMetrics.length > 1000) {
        performanceMetrics.shift();
    }
    // Log slow operations
    if (metric.duration > 1000) {
        logger_1.apiLogger.warn('Slow operation detected', {
            operation: metric.operation,
            duration: metric.duration,
            metadata: metric.metadata,
        });
    }
}
function getPerformanceMetrics() {
    return [...performanceMetrics];
}
function getAverageOperationDuration(operation) {
    const metrics = performanceMetrics.filter(m => m.operation === operation);
    if (metrics.length === 0)
        return 0;
    const total = metrics.reduce((sum, m) => sum + m.duration, 0);
    return total / metrics.length;
}
// Trace decorator for services
function tracedOperation(operationName) {
    return function (target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = async function (...args) {
            const correlationId = (args.find(arg => arg?.correlationId))?.correlationId || (0, uuid_1.v4)();
            const startTime = Date.now();
            logger_1.apiLogger.debug(`Starting operation: ${operationName}`, {
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
                logger_1.apiLogger.debug(`Completed operation: ${operationName}`, {
                    correlationId,
                    operation: operationName,
                    duration,
                });
                return result;
            }
            catch (error) {
                const duration = Date.now() - startTime;
                logger_1.apiLogger.error(`Failed operation: ${operationName}`, {
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
const serviceHealth = new Map();
function updateServiceHealth(serviceName, status, responseTime, error) {
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
    }
    else {
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
function getServiceHealth(serviceName) {
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
//# sourceMappingURL=tracing.middleware.js.map