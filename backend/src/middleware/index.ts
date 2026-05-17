/**
 * Middleware Index
 * Central export for all middleware
 */

export {
  authenticate,
  authorize,
  requirePermission,
  requireMinRole,
  canAccessResource,
  optionalAuth,
  hasPermission,
  getPermissions,
  authMiddleware,
  roleMiddleware,
  AuthenticatedRequest,
} from './auth.middleware';

export {
  authLimiter,
  apiLimiter,
  sensitiveOpsLimiter,
  sanitizeRequest,
  correlationIdMiddleware,
  validateInput,
  logSecurityEvent,
  sanitizeInput,
  validateRequestIntegrity,
  SECURE_HEADERS,
  checkBruteForce,
  recordFailedAttempt,
  clearFailedAttempts,
  getEndpointRateLimit,
  SecurityValidationResult,
} from './security.middleware';

export {
  validateBody,
  validateQuery,
  validateParams,
  validators,
  RequestValidationError,
} from './validation.middleware';

export {
  tracingMiddleware,
  createTraceContext,
  storeTraceContext,
  updateTraceContext,
  recordPerformanceMetric,
  getPerformanceMetrics,
  getAverageOperationDuration,
  tracedOperation,
  updateServiceHealth,
  getServiceHealth,
  ServiceHealth,
} from './tracing.middleware';

export {
  errorHandler,
  asyncHandler,
  notFoundHandler,
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
} from './error.middleware';
