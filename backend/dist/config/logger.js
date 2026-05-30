"use strict";
/**
 * Enterprise Logging Configuration
 * Provides centralized logging with Winston
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiLogger = exports.securityLogger = exports.auditLogger = void 0;
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Read logging config directly from env to avoid circular dependency with config/index.ts
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_FILE_PATH = process.env.LOG_FILE_PATH || './logs';
const LOG_MAX_SIZE = process.env.LOG_MAX_SIZE || '10m';
const LOG_MAX_FILES = parseInt(process.env.LOG_MAX_FILES || '30', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';
// Ensure log directory exists
const logDir = LOG_FILE_PATH;
if (!fs_1.default.existsSync(logDir)) {
    fs_1.default.mkdirSync(logDir, { recursive: true });
}
// Custom format for JSON logs
const jsonFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json());
// Console format for development
const consoleFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.colorize(), winston_1.default.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
}));
// Create loggers
const logger = winston_1.default.createLogger({
    level: LOG_LEVEL,
    format: jsonFormat,
    defaultMeta: { service: 'nyxtrace' },
    transports: [
        // File transport for all logs
        new winston_1.default.transports.File({
            filename: path_1.default.join(logDir, 'error.log'),
            level: 'error',
            maxsize: parseSize(LOG_MAX_SIZE),
            maxFiles: LOG_MAX_FILES,
        }),
        new winston_1.default.transports.File({
            filename: path_1.default.join(logDir, 'combined.log'),
            maxsize: parseSize(LOG_MAX_SIZE),
            maxFiles: LOG_MAX_FILES,
        }),
    ],
});
// Add console transport for non-production
if (NODE_ENV !== 'production') {
    logger.add(new winston_1.default.transports.Console({
        format: consoleFormat,
    }));
}
// Specialized loggers for different concerns
exports.auditLogger = winston_1.default.createLogger({
    level: 'info',
    format: jsonFormat,
    defaultMeta: { service: 'nyxtrace', type: 'audit' },
    transports: [
        new winston_1.default.transports.File({
            filename: path_1.default.join(logDir, 'audit.log'),
            maxsize: parseSize(LOG_MAX_SIZE),
            maxFiles: LOG_MAX_FILES * 2, // Keep audit logs longer
        }),
    ],
});
exports.securityLogger = winston_1.default.createLogger({
    level: 'warn',
    format: jsonFormat,
    defaultMeta: { service: 'nyxtrace', type: 'security' },
    transports: [
        new winston_1.default.transports.File({
            filename: path_1.default.join(logDir, 'security.log'),
            maxsize: parseSize(LOG_MAX_SIZE),
            maxFiles: LOG_MAX_FILES * 2,
        }),
    ],
});
exports.apiLogger = winston_1.default.createLogger({
    level: 'info',
    format: jsonFormat,
    defaultMeta: { service: 'nyxtrace', type: 'api' },
    transports: [
        new winston_1.default.transports.File({
            filename: path_1.default.join(logDir, 'api.log'),
            maxsize: parseSize(LOG_MAX_SIZE),
            maxFiles: LOG_MAX_FILES,
        }),
    ],
});
// Helper function to parse size strings like '10m', '1g'
function parseSize(size) {
    const units = {
        b: 1,
        kb: 1024,
        mb: 1024 * 1024,
        gb: 1024 * 1024 * 1024,
    };
    const match = size.toLowerCase().match(/^(\d+)([bkmg]+)$/);
    if (match) {
        return parseInt(match[1]) * units[match[2]];
    }
    return 10 * 1024 * 1024; // Default 10MB
}
exports.default = logger;
//# sourceMappingURL=logger.js.map