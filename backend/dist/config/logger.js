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
const index_1 = __importDefault(require("./index"));
// Ensure log directory exists
const logDir = index_1.default.logging.filePath;
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
    level: index_1.default.logging.level,
    format: jsonFormat,
    defaultMeta: { service: 'forensics-platform' },
    transports: [
        // File transport for all logs
        new winston_1.default.transports.File({
            filename: path_1.default.join(logDir, 'error.log'),
            level: 'error',
            maxsize: parseSize(index_1.default.logging.maxSize),
            maxFiles: index_1.default.logging.maxFiles,
        }),
        new winston_1.default.transports.File({
            filename: path_1.default.join(logDir, 'combined.log'),
            maxsize: parseSize(index_1.default.logging.maxSize),
            maxFiles: index_1.default.logging.maxFiles,
        }),
    ],
});
// Add console transport for non-production
if (index_1.default.server.nodeEnv !== 'production') {
    logger.add(new winston_1.default.transports.Console({
        format: consoleFormat,
    }));
}
// Specialized loggers for different concerns
exports.auditLogger = winston_1.default.createLogger({
    level: 'info',
    format: jsonFormat,
    defaultMeta: { service: 'forensics-platform', type: 'audit' },
    transports: [
        new winston_1.default.transports.File({
            filename: path_1.default.join(logDir, 'audit.log'),
            maxsize: parseSize(index_1.default.logging.maxSize),
            maxFiles: index_1.default.logging.maxFiles * 2, // Keep audit logs longer
        }),
    ],
});
exports.securityLogger = winston_1.default.createLogger({
    level: 'warn',
    format: jsonFormat,
    defaultMeta: { service: 'forensics-platform', type: 'security' },
    transports: [
        new winston_1.default.transports.File({
            filename: path_1.default.join(logDir, 'security.log'),
            maxsize: parseSize(index_1.default.logging.maxSize),
            maxFiles: index_1.default.logging.maxFiles * 2,
        }),
    ],
});
exports.apiLogger = winston_1.default.createLogger({
    level: 'info',
    format: jsonFormat,
    defaultMeta: { service: 'forensics-platform', type: 'api' },
    transports: [
        new winston_1.default.transports.File({
            filename: path_1.default.join(logDir, 'api.log'),
            maxsize: parseSize(index_1.default.logging.maxSize),
            maxFiles: index_1.default.logging.maxFiles,
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