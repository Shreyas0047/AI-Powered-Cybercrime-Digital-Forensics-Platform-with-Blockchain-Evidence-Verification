/**
 * Logs Service
 * Reads and streams application and forensic logs from the filesystem
 */

import * as fs from 'fs';
import * as path from 'path';
import type { LogEntry, LogLevel, LogCategory } from '../types/reports';

const LOGS_DIR = path.resolve(process.cwd(), 'logs');
const MONITORING_DIR = path.resolve(process.cwd(), 'logs/monitoring');
const BACKEND_LOG = path.resolve(process.cwd(), 'logs/backend.log');

function detectLogLevel(text: string): LogLevel {
  const upper = text.toUpperCase();
  if (upper.includes('[CRITICAL]') || upper.includes('CRITICAL:')) return 'critical';
  if (upper.includes('[ERROR]') || upper.includes('ERROR:') || upper.includes('Error:')) return 'error';
  if (upper.includes('[WARN]') || upper.includes('WARNING:') || upper.includes('Warn:')) return 'warning';
  if (upper.includes('[DEBUG]') || upper.includes('DEBUG:')) return 'debug';
  return 'info';
}

function detectLogCategory(text: string, filename: string): LogCategory {
  const lower = text.toLowerCase() + filename.toLowerCase();
  if (lower.includes('monitor')) return 'monitoring';
  if (lower.includes('simulator')) return 'simulator';
  if (lower.includes('execution') || lower.includes('execute')) return 'execution';
  if (lower.includes('forensic')) return 'forensics';
  if (lower.includes('vm') || lower.includes('virtualbox') || lower.includes('sandbox')) return 'vm';
  if (lower.includes('sandbox')) return 'sandbox';
  if (lower.includes('app')) return 'app';
  return 'system';
}

function parseLogFile(filePath: string, options: {
  level?: LogLevel;
  category?: LogCategory;
  search?: string;
  limit?: number;
  since?: number;
} = {}): LogEntry[] {
  const entries: LogEntry[] = [];

  try {
    if (!fs.existsSync(filePath)) return entries;

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    const now = Date.now();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      const level = options.level || detectLogLevel(line);
      const category = options.category ? options.category as LogCategory : detectLogCategory(line, path.basename(filePath));

      // Apply level filter
      if (options.level) {
        const levelOrder: Record<LogLevel, number> = { debug: 0, info: 1, warning: 2, error: 3, critical: 4 };
        const reqLevel = levelOrder[options.level];
        const lineLevel = levelOrder[level];
        if (lineLevel < reqLevel) continue;
      }

      // Apply search filter
      if (options.search && !line.toLowerCase().includes(options.search.toLowerCase())) continue;

      // Apply time filter (last N seconds)
      if (options.since) {
        const age = options.since * 1000;
        // Try to parse timestamp from line
        const tsMatch = line.match(/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/);
        if (tsMatch) {
          const ts = new Date(tsMatch[0]).getTime();
          if (now - ts > age) continue;
        }
      }

      // Extract timestamp
      let timestamp = new Date().toISOString();
      const tsMatch = line.match(/^(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d{3})?)/);
      if (tsMatch) {
        try { timestamp = new Date(tsMatch[1]).toISOString(); } catch { /* use default */ }
      }

      // Extract source
      let source = path.basename(filePath);
      const sourceMatch = line.match(/\|\s*([\w.]+)\s*\|/);
      if (sourceMatch) source = sourceMatch[1];

      const entry: LogEntry = {
        id: `${path.basename(filePath)}:${i}`,
        timestamp,
        level,
        category: category as LogCategory,
        message: line.replace(/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d{3})?\s*\|?\s*/, '').trim(),
        source,
        details: {},
      };

      entries.push(entry);

      if (options.limit && entries.length >= options.limit) break;
    }
  } catch (error) {
    console.error(`Error reading log file ${filePath}:`, error);
  }

  return entries;
}

export class LogsService {
  async getLogs(options: {
    page?: number;
    limit?: number;
    level?: LogLevel;
    category?: LogCategory;
    search?: string;
    sinceSeconds?: number;
  } = {}): Promise<{ logs: LogEntry[]; total: number }> {
    const limit = Math.min(500, Math.max(1, options.limit || 100));
    const allLogs: LogEntry[] = [];

    const searchDirs = [
      { dir: LOGS_DIR, recursive: false },
      { dir: MONITORING_DIR, recursive: false },
    ];

    for (const { dir, recursive } of searchDirs) {
      if (!fs.existsSync(dir)) continue;

      const readDir = (d: string, rec: boolean) => {
        try {
          const entries = fs.readdirSync(d);
          for (const entry of entries) {
            const fullPath = path.join(d, entry);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory() && rec) {
              readDir(fullPath, rec);
            } else if (stat.isFile() && (entry.endsWith('.log') || entry.endsWith('.json') || entry === 'agent.log')) {
              const entries = parseLogFile(fullPath, {
                level: options.level,
                category: options.category,
                search: options.search,
                limit: 200,
                since: options.sinceSeconds,
              });
              allLogs.push(...entries);
            }
          }
        } catch { /* skip inaccessible dirs */ }
      };

      readDir(dir, recursive);
    }

    // If no real logs found, return empty
    if (allLogs.length === 0) {
      return { logs: [], total: 0 };
    }

    // Sort by timestamp desc
    allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (options.search) {
      const q = options.search.toLowerCase();
      const filtered = allLogs.filter(l =>
        l.message.toLowerCase().includes(q) ||
        l.source?.toLowerCase().includes(q)
      );
      const page = Math.max(1, options.page || 1);
      const start = (page - 1) * limit;
      return { logs: filtered.slice(start, start + limit), total: filtered.length };
    }

    const page = Math.max(1, options.page || 1);
    const start = (page - 1) * limit;
    return { logs: allLogs.slice(start, start + limit), total: allLogs.length };
  }

  async getLogStats(): Promise<{
    totalLines: number;
    byLevel: Record<LogLevel, number>;
    byCategory: Record<LogCategory, number>;
    files: string[];
  }> {
    const stats = {
      totalLines: 0,
      byLevel: { debug: 0, info: 0, warning: 0, error: 0, critical: 0 } as Record<LogLevel, number>,
      byCategory: {
        app: 0, monitoring: 0, simulator: 0, execution: 0,
        forensics: 0, vm: 0, sandbox: 0, system: 0
      } as Record<LogCategory, number>,
      files: [] as string[],
    };

    const scanDir = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      try {
        const entries = fs.readdirSync(dir);
        for (const entry of entries) {
          const fullPath = path.join(dir, entry);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            scanDir(fullPath);
          } else if (stat.isFile() && (entry.endsWith('.log') || entry.endsWith('.json') || entry === 'agent.log')) {
            stats.files.push(fullPath);
          }
        }
      } catch { /* skip */ }
    };

    scanDir(LOGS_DIR);

    if (stats.files.length === 0) {
      return stats;
    }

    return stats;
  }
}

export const logsService = new LogsService();