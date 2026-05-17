/**
 * Enterprise Logging Configuration
 * Provides centralized logging with Winston
 */

import winston from 'winston';
import path from 'path';
import fs from 'fs';
import config from './index';

// Ensure log directory exists
const logDir = config.logging.filePath;
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
  level: config.logging.level,
  format: jsonFormat,
  defaultMeta: { service: 'forensics-platform' },
  transports: [
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: parseSize(config.logging.maxSize),
      maxFiles: config.logging.maxFiles,
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: parseSize(config.logging.maxSize),
      maxFiles: config.logging.maxFiles,
    }),
  ],
});

// Add console transport for non-production
if (config.server.nodeEnv !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
  }));
}

// Specialized loggers for different concerns
export const auditLogger = winston.createLogger({
  level: 'info',
  format: jsonFormat,
  defaultMeta: { service: 'forensics-platform', type: 'audit' },
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'audit.log'),
      maxsize: parseSize(config.logging.maxSize),
      maxFiles: config.logging.maxFiles * 2, // Keep audit logs longer
    }),
  ],
});

export const securityLogger = winston.createLogger({
  level: 'warn',
  format: jsonFormat,
  defaultMeta: { service: 'forensics-platform', type: 'security' },
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'security.log'),
      maxsize: parseSize(config.logging.maxSize),
      maxFiles: config.logging.maxFiles * 2,
    }),
  ],
});

export const apiLogger = winston.createLogger({
  level: 'info',
  format: jsonFormat,
  defaultMeta: { service: 'forensics-platform', type: 'api' },
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'api.log'),
      maxsize: parseSize(config.logging.maxSize),
      maxFiles: config.logging.maxFiles,
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