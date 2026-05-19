"use strict";
/**
 * Enterprise Security Middleware
 * Advanced defensive security hardening
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENDPOINT_RATE_LIMITS = exports.SECURE_HEADERS = exports.SUSPICIOUS_PATTERNS = exports.ALLOWED_CONTENT_TYPES = exports.ENDPOINT_LIMITS = exports.sensitiveOpsLimiter = exports.apiLimiter = exports.authLimiter = exports.correlationIdMiddleware = void 0;
exports.validateInput = validateInput;
exports.logSecurityEvent = logSecurityEvent;
exports.sanitizeInput = sanitizeInput;
exports.sanitizeRequest = sanitizeRequest;
exports.getEndpointSizeLimit = getEndpointSizeLimit;
exports.validateRequestIntegrity = validateRequestIntegrity;
exports.checkBruteForce = checkBruteForce;
exports.recordFailedAttempt = recordFailedAttempt;
exports.clearFailedAttempts = clearFailedAttempts;
exports.getEndpointRateLimit = getEndpointRateLimit;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const logger_1 = require("../config/logger");
const uuid_1 = require("uuid");
// Correlation ID middleware for request tracing
const correlationIdMiddleware = (req, res, next) => {
    const correlationId = req.headers['x-correlation-id'] || (0, uuid_1.v4)();
    req.headers['x-correlation-id'] = correlationId;
    res.setHeader('X-Correlation-ID', correlationId);
    next();
};
exports.correlationIdMiddleware = correlationIdMiddleware;
// SQL/NoSQL injection detection patterns
const SQL_INJECTION_PATTERNS = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION)\b)/i,
    /(--|;|\/\*|\*\/|@@|@)/,
    /(\bOR\b\s+\d+=\d+|\bAND\b\s+\d+=\d+)/i,
    /('|").*(\bOR\b|\bAND\b).*=.*/i,
];
const NOSQL_INJECTION_PATTERNS = [
    /\$where/i,
    /\$eval/i,
    /\$func/i,
    /\btrue\b.*\btrue\b/,
    /\/\$.*\$/,
];
// XSS detection patterns
const XSS_PATTERNS = [
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /on\w+\s*=/gi,
    /javascript:/gi,
    /<[^>]*onerror\s*=/gi,
];
// Path traversal patterns
const PATH_TRAVERSAL_PATTERNS = [
    /(\.\.[\/\\])/,
    /(\.\.%2f)/i,
    /(%2e%2e)/gi,
    /(boot\.ini|etc\/passwd|windows\/system)/i,
];
// Validate input for injection attacks
function validateInput(input, type) {
    if (!input) {
        return { valid: true, severity: 'low' };
    }
    const checks = [
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
function logSecurityEvent(req, event, details) {
    const correlationId = req.headers['x-correlation-id'] || 'unknown';
    logger_1.securityLogger.warn('Security event detected', {
        correlationId,
        event,
        ...details,
        timestamp: new Date().toISOString(),
        userAgent: req.headers['user-agent'],
    });
    logger_1.auditLogger.info('Security audit', {
        correlationId,
        event,
        ...details,
        timestamp: new Date().toISOString(),
    });
}
// Input sanitization
function sanitizeInput(input) {
    if (!input)
        return '';
    return input
        .replace(/[<>'"]/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '')
        .trim();
}
// Strict rate limiter for authentication endpoints
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts per window
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
exports.apiLimiter = (0, express_rate_limit_1.default)({
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
exports.sensitiveOpsLimiter = (0, express_rate_limit_1.default)({
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
function sanitizeRequest(req, res, next) {
    // Remove potentially dangerous headers
    delete req.headers['x-forwarded-host'];
    delete req.headers['x-forwarded-proto'];
    // Sanitize query parameters
    if (req.query) {
        for (const key in req.query) {
            if (typeof req.query[key] === 'string') {
                req.query[key] = req.query[key]
                    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                    .trim();
            }
        }
    }
    next();
}
// Request size limits by endpoint type
exports.ENDPOINT_LIMITS = {
    '/api/v1/evidence/upload': 50 * 1024 * 1024, // 50MB
    '/api/v1/evidence/package': 100 * 1024 * 1024, // 100MB
    '/api/v1/investigations': 1 * 1024 * 1024, // 1MB
    default: 10 * 1024 * 1024, // 10MB
};
// Get size limit for endpoint
function getEndpointSizeLimit(path) {
    for (const [endpoint, limit] of Object.entries(exports.ENDPOINT_LIMITS)) {
        if (path.startsWith(endpoint)) {
            return limit;
        }
    }
    return exports.ENDPOINT_LIMITS.default;
}
// Content type validation
exports.ALLOWED_CONTENT_TYPES = [
    'application/json',
    'multipart/form-data',
    'application/x-www-form-urlencoded',
];
exports.SUSPICIOUS_PATTERNS = [
    { pattern: /\.\.\//g, name: 'DIRECTORY_TRAVERSAL', severity: 'high' },
    { pattern: /\x00/g, name: 'NULL_BYTE_INJECTION', severity: 'critical' },
    { pattern: /[\x00-\x08]/g, name: 'NON_PRINTABLE_CHARS', severity: 'medium' },
    { pattern: /(\r\n|\r|\n){3,}/g, name: 'HEADER_INJECTION', severity: 'high' },
];
// Validate request integrity
function validateRequestIntegrity(req) {
    const threats = [];
    // Check body
    if (req.body && typeof req.body === 'object') {
        for (const [key, value] of Object.entries(req.body)) {
            if (typeof value === 'string') {
                for (const susPattern of exports.SUSPICIOUS_PATTERNS) {
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
                for (const susPattern of exports.SUSPICIOUS_PATTERNS) {
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
exports.SECURE_HEADERS = {
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
const failedAttempts = new Map();
const BRUTE_FORCE_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_FAILED_ATTEMPTS = 5;
function checkBruteForce(ip) {
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
function recordFailedAttempt(ip) {
    const now = Date.now();
    const record = failedAttempts.get(ip);
    if (record) {
        record.count++;
        record.lastAttempt = now;
    }
    else {
        failedAttempts.set(ip, { count: 1, lastAttempt: now });
    }
}
function clearFailedAttempts(ip) {
    failedAttempts.delete(ip);
}
// Rate limit per endpoint customization
exports.ENDPOINT_RATE_LIMITS = {
    '/api/v1/auth/login': { windowMs: 15 * 60 * 1000, maxRequests: 5 },
    '/api/v1/auth/register': { windowMs: 60 * 60 * 1000, maxRequests: 3 },
    '/api/v1/evidence/upload': { windowMs: 60 * 60 * 1000, maxRequests: 20 },
    '/api/v1/blockchain/evidence/verify': { windowMs: 60 * 1000, maxRequests: 100 },
};
function getEndpointRateLimit(path) {
    for (const [endpoint, config] of Object.entries(exports.ENDPOINT_RATE_LIMITS)) {
        if (path.startsWith(endpoint)) {
            return config;
        }
    }
    // Default rate limit
    return { windowMs: 15 * 60 * 1000, maxRequests: 100 };
}
//# sourceMappingURL=security.middleware.js.map