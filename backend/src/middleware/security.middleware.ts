/**
 * Enterprise Security Middleware
 * Advanced defensive security hardening
 */

import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { auditLogger, securityLogger } from '../config/logger';
import { v4 as uuidv4 } from 'uuid';

// Correlation ID middleware for request tracing
export const correlationIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();
  req.headers['x-correlation-id'] = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);
  next();
};

// SQL/NoSQL injection detection patterns — contextual to reduce false positives
const SQL_INJECTION_PATTERNS = [
  // Actual attack vectors: tautologies, UNION-based, stacked queries
  /('\s*(OR|AND)\s+['"]?\d+['"]?\s*=\s*['"]?\d+)/i,
  /(\bUNION\b\s+(ALL\s+)?SELECT\b)/i,
  /(;\s*(DROP|ALTER|CREATE|TRUNCATE|INSERT|UPDATE|DELETE)\b)/i,
  /(\bEXEC(UTE)?\s+(xp_|sp_))/i,
  /(--\s*$|\/\*[\s\S]*?\*\/)/,
];

const NOSQL_INJECTION_PATTERNS = [
  /\$where\s*:/i,
  /\$gt\s*:|\ \$lt\s*:|\ \$ne\s*:|\ \$regex\s*:/i,
  /\$expr\s*:/i,
  /\{\s*"\$[a-z]+"/i,
];

// XSS detection patterns — focused on executable contexts
const XSS_PATTERNS = [
  /<script[\s>]/gi,
  /<iframe[\s>]/gi,
  /\bon\w+\s*=\s*["'`]/gi,
  /javascript\s*:/gi,
  /<svg[\s>].*\bon\w+\s*=/gi,
  /<img[^>]+\bonerror\b/gi,
];

// Path traversal patterns
const PATH_TRAVERSAL_PATTERNS = [
  /(\.\.[\/\\])/,
  /(\.\.%2f)/i,
  /(%2e%2e)/gi,
  /(boot\.ini|etc\/passwd|windows\/system)/i,
];

export interface SecurityValidationResult {
  valid: boolean;
  threat?: string;
  pattern?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Validate input for injection attacks
export function validateInput(
  input: string,
  type: 'query' | 'body' | 'path' | 'header'
): SecurityValidationResult {
  if (!input) {
    return { valid: true, severity: 'low' };
  }

  const checks: Array<{
    patterns: RegExp[];
    threat: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }> = [
    {
      patterns: SQL_INJECTION_PATTERNS,
      threat: 'SQL_INJECTION',
      severity: 'critical',
    },
    {
      patterns: NOSQL_INJECTION_PATTERNS,
      threat: 'NOSQL_INJECTION',
      severity: 'critical',
    },
    {
      patterns: XSS_PATTERNS,
      threat: 'XSS',
      severity: 'high',
    },
    {
      patterns: PATH_TRAVERSAL_PATTERNS,
      threat: 'PATH_TRAVERSAL',
      severity: 'high',
    },
  ];

  for (const check of checks) {
    for (const pattern of check.patterns) {
      if (pattern.test(input)) {
        return {
          valid: false,
          threat: check.threat,
          pattern: pattern.source,
          severity: check.severity,
        };
      }
    }
  }

  return { valid: true, severity: 'low' };
}

// Security audit logging
export function logSecurityEvent(
  req: Request,
  event: string,
  details: {
    threat?: string;
    severity?: string;
    resource?: string;
    userId?: string;
    ip?: string;
  }
): void {
  const correlationId = req.headers['x-correlation-id'] || 'unknown';

  securityLogger.warn('Security event detected', {
    correlationId,
    event,
    ...details,
    timestamp: new Date().toISOString(),
    userAgent: req.headers['user-agent'],
  });

  auditLogger.info('Security audit', {
    correlationId,
    event,
    ...details,
    timestamp: new Date().toISOString(),
  });
}

// Input sanitization
export function sanitizeInput(input: string): string {
  if (!input) return '';

  return input
    .replace(/[<>'"]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
}

// Strict rate limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later',
    errors: [{ code: 'RATE_LIMIT', message: 'Account temporarily locked due to too many failed attempts' }],
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    success: false,
    message: 'Too many requests, please slow down',
    errors: [{ code: 'RATE_LIMIT', message: 'Rate limit exceeded' }],
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limiter for sensitive operations
export const sensitiveOpsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 operations per minute
  message: {
    success: false,
    message: 'Too many operations',
    errors: [{ code: 'RATE_LIMIT', message: 'Operation limit exceeded' }],
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Request sanitization middleware
export function sanitizeRequest(req: Request, res: Response, next: Function) {
  // Remove potentially dangerous headers
  delete req.headers['x-forwarded-host'];
  delete req.headers['x-forwarded-proto'];

  // Sanitize query parameters
  if (req.query) {
    for (const key in req.query) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = (req.query[key] as string)
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .trim();
      }
    }
  }

  next();
}

// Request size limits by endpoint type
export const ENDPOINT_LIMITS = {
  '/api/v1/evidence/upload': 50 * 1024 * 1024, // 50MB
  '/api/v1/evidence/package': 100 * 1024 * 1024, // 100MB
  '/api/v1/investigations': 1 * 1024 * 1024, // 1MB
  default: 10 * 1024 * 1024, // 10MB
};

// Get size limit for endpoint
export function getEndpointSizeLimit(path: string): number {
  for (const [endpoint, limit] of Object.entries(ENDPOINT_LIMITS)) {
    if (path.startsWith(endpoint)) {
      return limit;
    }
  }
  return ENDPOINT_LIMITS.default;
}

// Content type validation
export const ALLOWED_CONTENT_TYPES = [
  'application/json',
  'multipart/form-data',
  'application/x-www-form-urlencoded',
];

// Suspicious request pattern detection
export interface SuspiciousPattern {
  pattern: RegExp;
  name: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export const SUSPICIOUS_PATTERNS: SuspiciousPattern[] = [
  { pattern: /\.\.\//g, name: 'DIRECTORY_TRAVERSAL', severity: 'high' },
  { pattern: /\x00/g, name: 'NULL_BYTE_INJECTION', severity: 'critical' },
  { pattern: /[\x00-\x08]/g, name: 'NON_PRINTABLE_CHARS', severity: 'medium' },
  { pattern: /(\r\n|\r|\n){3,}/g, name: 'HEADER_INJECTION', severity: 'high' },
];

// Validate request integrity
export function validateRequestIntegrity(req: Request): {
  valid: boolean;
  threats: string[];
} {
  const threats: string[] = [];

  // Check body
  if (req.body && typeof req.body === 'object') {
    for (const [key, value] of Object.entries(req.body)) {
      if (typeof value === 'string') {
        for (const susPattern of SUSPICIOUS_PATTERNS) {
          if (susPattern.pattern.test(value)) {
            threats.push(susPattern.name);
          }
        }
      }
    }
  }

  // Check query parameters
  if (req.query) {
    for (const value of Object.values(req.query)) {
      if (typeof value === 'string') {
        for (const susPattern of SUSPICIOUS_PATTERNS) {
          if (susPattern.pattern.test(value)) {
            threats.push(susPattern.name);
          }
        }
      }
    }
  }

  return {
    valid: threats.length === 0,
    threats,
  };
}

// Secure headers configuration
export const SECURE_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Pragma': 'no-cache',
};

// Brute force protection state
const failedAttempts: Map<string, { count: number; lastAttempt: number }> = new Map();
const BRUTE_FORCE_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_FAILED_ATTEMPTS = 5;

export function checkBruteForce(ip: string): {
  blocked: boolean;
  attemptsRemaining: number;
  lockoutRemaining: number;
} {
  const now = Date.now();
  const record = failedAttempts.get(ip);

  if (!record) {
    return { blocked: false, attemptsRemaining: MAX_FAILED_ATTEMPTS, lockoutRemaining: 0 };
  }

  // Reset if window expired
  if (now - record.lastAttempt > BRUTE_FORCE_WINDOW) {
    failedAttempts.delete(ip);
    return { blocked: false, attemptsRemaining: MAX_FAILED_ATTEMPTS, lockoutRemaining: 0 };
  }

  // Still in lockout period
  if (record.count >= MAX_FAILED_ATTEMPTS) {
    const lockoutRemaining = Math.ceil((BRUTE_FORCE_WINDOW - (now - record.lastAttempt)) / 1000);
    return { blocked: true, attemptsRemaining: 0, lockoutRemaining };
  }

  return {
    blocked: false,
    attemptsRemaining: MAX_FAILED_ATTEMPTS - record.count,
    lockoutRemaining: 0,
  };
}

export function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  const record = failedAttempts.get(ip);

  if (record) {
    record.count++;
    record.lastAttempt = now;
  } else {
    failedAttempts.set(ip, { count: 1, lastAttempt: now });
  }
}

export function clearFailedAttempts(ip: string): void {
  failedAttempts.delete(ip);
}

// Rate limit per endpoint customization
export const ENDPOINT_RATE_LIMITS: Record<string, { windowMs: number; maxRequests: number }> = {
  '/api/v1/auth/login': { windowMs: 15 * 60 * 1000, maxRequests: 5 },
  '/api/v1/auth/register': { windowMs: 60 * 60 * 1000, maxRequests: 3 },
  '/api/v1/evidence/upload': { windowMs: 60 * 60 * 1000, maxRequests: 20 },
  '/api/v1/blockchain/evidence/verify': { windowMs: 60 * 1000, maxRequests: 100 },
};

export function getEndpointRateLimit(path: string): { windowMs: number; maxRequests: number } {
  for (const [endpoint, config] of Object.entries(ENDPOINT_RATE_LIMITS)) {
    if (path.startsWith(endpoint)) {
      return config;
    }
  }
  // Default rate limit
  return { windowMs: 15 * 60 * 1000, maxRequests: 100 };
}
