/**
 * Enterprise Logging Configuration
 * Provides centralized logging with Winston
 */

import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Read logging config directly from env to avoid circular dependency with config/index.ts
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_FILE_PATH = process.env.LOG_FILE_PATH || './logs';
const LOG_MAX_SIZE = process.env.LOG_MAX_SIZE || '10m';
const LOG_MAX_FILES = parseInt(process.env.LOG_MAX_FILES || '30', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';

// Ensure log directory exists
const logDir = LOG_FILE_PATH;
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Custom format for JSON logs
const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// Create loggers
const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: jsonFormat,
  defaultMeta: { service: 'nyxtrace' },
  transports: [
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: parseSize(LOG_MAX_SIZE),
      maxFiles: LOG_MAX_FILES,
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: parseSize(LOG_MAX_SIZE),
      maxFiles: LOG_MAX_FILES,
    }),
  ],
});

// Add console transport for non-production
if (NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
  }));
}

// Specialized loggers for different concerns
export const auditLogger = winston.createLogger({
  level: 'info',
  format: jsonFormat,
  defaultMeta: { service: 'nyxtrace', type: 'audit' },
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'audit.log'),
      maxsize: parseSize(LOG_MAX_SIZE),
      maxFiles: LOG_MAX_FILES * 2, // Keep audit logs longer
    }),
  ],
});

export const securityLogger = winston.createLogger({
  level: 'warn',
  format: jsonFormat,
  defaultMeta: { service: 'nyxtrace', type: 'security' },
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'security.log'),
      maxsize: parseSize(LOG_MAX_SIZE),
      maxFiles: LOG_MAX_FILES * 2,
    }),
  ],
});

export const apiLogger = winston.createLogger({
  level: 'info',
  format: jsonFormat,
  defaultMeta: { service: 'nyxtrace', type: 'api' },
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'api.log'),
      maxsize: parseSize(LOG_MAX_SIZE),
      maxFiles: LOG_MAX_FILES,
    }),
  ],
});

// Helper function to parse size strings like '10m', '1g'
function parseSize(size: string): number {
  const units: Record<string, number> = {
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

export default logger;