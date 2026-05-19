"use strict";
/**
 * Global Error Handling Middleware
 * Centralized error processing and response formatting
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConflictError = exports.ForbiddenError = exports.UnauthorizedError = exports.NotFoundError = exports.ValidationError = exports.AppError = void 0;
exports.errorHandler = errorHandler;
exports.asyncHandler = asyncHandler;
exports.notFoundHandler = notFoundHandler;
const logger_1 = __importDefault(require("../config/logger"));
class AppError extends Error {
    statusCode;
    code;
    isOperational;
    constructor(message, statusCode, code) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
class ValidationError extends AppError {
    errors;
    constructor(message, errors) {
        super(message, 400, 'VALIDATION_ERROR');
        this.errors = errors;
    }
}
exports.ValidationError = ValidationError;
class NotFoundError extends AppError {
    constructor(resource) {
        super(`${resource} not found`, 404, 'NOT_FOUND');
    }
}
exports.NotFoundError = NotFoundError;
class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super(message, 401, 'UNAUTHORIZED');
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends AppError {
    constructor(message = 'Forbidden') {
        super(message, 403, 'FORBIDDEN');
    }
}
exports.ForbiddenError = ForbiddenError;
class ConflictError extends AppError {
    constructor(message) {
        super(message, 409, 'CONFLICT');
    }
}
exports.ConflictError = ConflictError;
function errorHandler(err, req, res, _next) {
    // Log error details
    if (err instanceof AppError) {
        logger_1.default.warn({
            message: err.message,
            code: err.code,
            statusCode: err.statusCode,
            path: req.path,
            method: req.method,
            userId: req.user?.id,
        });
    }
    else {
        logger_1.default.error(`Unhandled error: ${err.message}\nStack: ${err.stack}\nPath: ${req.path}\nMethod: ${req.method}`);
    }
    // Handle specific error types
    if (err instanceof ValidationError) {
        const response = {
            success: false,
            message: err.message,
            errors: err.errors.map(e => ({
                code: 'VALIDATION',
                field: e.field,
                message: e.message,
            })),
        };
        res.status(err.statusCode).json(response);
        return;
    }
    if (err instanceof AppError) {
        const response = {
            success: false,
            message: err.message,
            errors: [{ code: err.code, message: err.message }],
        };
        res.status(err.statusCode).json(response);
        return;
    }
    // Handle unknown errors
    const response = {
        success: false,
        message: 'Internal server error',
        errors: [
            {
                code: 'INTERNAL_ERROR',
                message: process.env.NODE_ENV === 'production'
                    ? 'An unexpected error occurred'
                    : err.message,
            },
        ],
    };
    res.status(500).json(response);
}
// Async handler wrapper to catch errors from async route handlers
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
// 404 handler for unmatched routes
function notFoundHandler(req, res) {
    res.status(404).json({
        success: false,
        message: 'Resource not found',
        errors: [
            {
                code: 'NOT_FOUND',
                message: `Cannot ${req.method} ${req.path}`,
            },
        ],
    });
}
//# sourceMappingURL=error.middleware.js.map