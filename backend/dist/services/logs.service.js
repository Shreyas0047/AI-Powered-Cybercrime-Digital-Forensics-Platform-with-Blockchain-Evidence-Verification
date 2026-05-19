"use strict";
/**
 * Logs Service
 * Reads and streams application and forensic logs from the filesystem
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.logsService = exports.LogsService = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const LOGS_DIR = path.resolve(process.cwd(), 'logs');
const MONITORING_DIR = path.resolve(process.cwd(), 'logs/monitoring');
const BACKEND_LOG = path.resolve(process.cwd(), 'logs/backend.log');
function detectLogLevel(text) {
    const upper = text.toUpperCase();
    if (upper.includes('[CRITICAL]') || upper.includes('CRITICAL:'))
        return 'critical';
    if (upper.includes('[ERROR]') || upper.includes('ERROR:') || upper.includes('Error:'))
        return 'error';
    if (upper.includes('[WARN]') || upper.includes('WARNING:') || upper.includes('Warn:'))
        return 'warning';
    if (upper.includes('[DEBUG]') || upper.includes('DEBUG:'))
        return 'debug';
    return 'info';
}
function detectLogCategory(text, filename) {
    const lower = text.toLowerCase() + filename.toLowerCase();
    if (lower.includes('monitor'))
        return 'monitoring';
    if (lower.includes('simulator'))
        return 'simulator';
    if (lower.includes('execution') || lower.includes('execute'))
        return 'execution';
    if (lower.includes('forensic'))
        return 'forensics';
    if (lower.includes('vm') || lower.includes('virtualbox') || lower.includes('sandbox'))
        return 'vm';
    if (lower.includes('sandbox'))
        return 'sandbox';
    if (lower.includes('app'))
        return 'app';
    return 'system';
}
function parseLogFile(filePath, options = {}) {
    const entries = [];
    try {
        if (!fs.existsSync(filePath))
            return entries;
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n').filter(l => l.trim().length > 0);
        const now = Date.now();
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim())
                continue;
            const level = options.level || detectLogLevel(line);
            const category = options.category ? options.category : detectLogCategory(line, path.basename(filePath));
            // Apply level filter
            if (options.level) {
                const levelOrder = { debug: 0, info: 1, warning: 2, error: 3, critical: 4 };
                const reqLevel = levelOrder[options.level];
                const lineLevel = levelOrder[level];
                if (lineLevel < reqLevel)
                    continue;
            }
            // Apply search filter
            if (options.search && !line.toLowerCase().includes(options.search.toLowerCase()))
                continue;
            // Apply time filter (last N seconds)
            if (options.since) {
                const age = options.since * 1000;
                // Try to parse timestamp from line
                const tsMatch = line.match(/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/);
                if (tsMatch) {
                    const ts = new Date(tsMatch[0]).getTime();
                    if (now - ts > age)
                        continue;
                }
            }
            // Extract timestamp
            let timestamp = new Date().toISOString();
            const tsMatch = line.match(/^(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d{3})?)/);
            if (tsMatch) {
                try {
                    timestamp = new Date(tsMatch[1]).toISOString();
                }
                catch { /* use default */ }
            }
            // Extract source
            let source = path.basename(filePath);
            const sourceMatch = line.match(/\|\s*([\w.]+)\s*\|/);
            if (sourceMatch)
                source = sourceMatch[1];
            const entry = {
                id: `${path.basename(filePath)}:${i}`,
                timestamp,
                level,
                category: category,
                message: line.replace(/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d{3})?\s*\|?\s*/, '').trim(),
                source,
                details: {},
            };
            entries.push(entry);
            if (options.limit && entries.length >= options.limit)
                break;
        }
    }
    catch (error) {
        console.error(`Error reading log file ${filePath}:`, error);
    }
    return entries;
}
function generateDemoLogs() {
    const now = Date.now();
    const sources = ['app', 'monitoring', 'simulator', 'execution', 'forensics', 'vm', 'sandbox', 'system'];
    const levels = ['debug', 'info', 'info', 'info', 'warning', 'error'];
    const messages = {
        app: ['Application initialized', 'Configuration loaded', 'Service started', 'Health check passed', 'Session authenticated'],
        monitoring: ['Process monitor started', 'File system monitor active', 'Registry monitor enabled', 'Network monitor tracking', 'Behavior detector initialized', 'Event pipeline active'],
        simulator: ['Simulator catalog loaded', 'Ransomware simulator ready', 'Spyware simulator ready', 'Trojan simulator ready', 'Credential stealer ready', 'Simulator execution started'],
        execution: ['VM snapshot restored', 'Guest agent connected', 'Execution started', 'Execution completed', 'Rollback initiated', 'Session terminated'],
        forensics: ['Forensic event captured', 'Timeline entry created', 'Evidence packaged', 'Report generated', 'Hash computed', 'Integrity verified'],
        vm: ['VirtualBox connection established', 'VM state: running', 'Snapshot loaded: CleanBaseline', 'Guest additions detected', 'Network isolation active'],
        sandbox: ['Sandbox session created', 'Isolation policy enforced', 'Execution timeout: 300s', 'Events collected', 'Session ended'],
        system: ['CPU usage: normal', 'Memory usage: stable', 'Disk I/O: within limits', 'Network: isolated'],
    };
    const logs = [];
    for (let i = 0; i < 100; i++) {
        const source = sources[Math.floor(Math.random() * sources.length)];
        const msgs = messages[source] || messages.system;
        const msg = msgs[Math.floor(Math.random() * msgs.length)];
        const level = levels[Math.floor(Math.random() * levels.length)];
        const ts = new Date(now - i * 5000).toISOString();
        logs.push({
            id: `demo-${i}`,
            timestamp: ts,
            level,
            category: source,
            message: msg,
            source: `forensics-sandbox-agent.${source}`,
        });
    }
    return logs;
}
class LogsService {
    async getLogs(options = {}) {
        const limit = Math.min(500, Math.max(1, options.limit || 100));
        const allLogs = [];
        const searchDirs = [
            { dir: LOGS_DIR, recursive: false },
            { dir: MONITORING_DIR, recursive: false },
        ];
        for (const { dir, recursive } of searchDirs) {
            if (!fs.existsSync(dir))
                continue;
            const readDir = (d, rec) => {
                try {
                    const entries = fs.readdirSync(d);
                    for (const entry of entries) {
                        const fullPath = path.join(d, entry);
                        const stat = fs.statSync(fullPath);
                        if (stat.isDirectory() && rec) {
                            readDir(fullPath, rec);
                        }
                        else if (stat.isFile() && (entry.endsWith('.log') || entry.endsWith('.json') || entry === 'agent.log')) {
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
                }
                catch { /* skip inaccessible dirs */ }
            };
            readDir(dir, recursive);
        }
        // If no real logs found, generate demo logs for UX
        if (allLogs.length === 0) {
            const demoLogs = generateDemoLogs();
            let filtered = demoLogs;
            if (options.level) {
                const levelOrder = { debug: 0, info: 1, warning: 2, error: 3, critical: 4 };
                const reqLevel = levelOrder[options.level];
                filtered = filtered.filter(l => levelOrder[l.level] >= reqLevel);
            }
            if (options.category) {
                filtered = filtered.filter(l => l.category === options.category);
            }
            if (options.search) {
                const q = options.search.toLowerCase();
                filtered = filtered.filter(l => l.message.toLowerCase().includes(q) ||
                    l.source?.toLowerCase().includes(q));
            }
            filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            const page = Math.max(1, options.page || 1);
            const start = (page - 1) * limit;
            return { logs: filtered.slice(start, start + limit), total: filtered.length };
        }
        // Sort by timestamp desc
        allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        if (options.search) {
            const q = options.search.toLowerCase();
            const filtered = allLogs.filter(l => l.message.toLowerCase().includes(q) ||
                l.source?.toLowerCase().includes(q));
            const page = Math.max(1, options.page || 1);
            const start = (page - 1) * limit;
            return { logs: filtered.slice(start, start + limit), total: filtered.length };
        }
        const page = Math.max(1, options.page || 1);
        const start = (page - 1) * limit;
        return { logs: allLogs.slice(start, start + limit), total: allLogs.length };
    }
    async getLogStats() {
        const stats = {
            totalLines: 0,
            byLevel: { debug: 0, info: 0, warning: 0, error: 0, critical: 0 },
            byCategory: {
                app: 0, monitoring: 0, simulator: 0, execution: 0,
                forensics: 0, vm: 0, sandbox: 0, system: 0
            },
            files: [],
        };
        const scanDir = (dir) => {
            if (!fs.existsSync(dir))
                return;
            try {
                const entries = fs.readdirSync(dir);
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry);
                    const stat = fs.statSync(fullPath);
                    if (stat.isDirectory()) {
                        scanDir(fullPath);
                    }
                    else if (stat.isFile() && (entry.endsWith('.log') || entry.endsWith('.json') || entry === 'agent.log')) {
                        stats.files.push(fullPath);
                    }
                }
            }
            catch { /* skip */ }
        };
        scanDir(LOGS_DIR);
        if (stats.files.length === 0) {
            // Generate demo stats
            stats.totalLines = 100;
            stats.byLevel = { debug: 10, info: 60, warning: 20, error: 8, critical: 2 };
            stats.byCategory = {
                app: 15, monitoring: 25, simulator: 20, execution: 15,
                forensics: 10, vm: 8, sandbox: 5, system: 2
            };
            stats.files = ['logs/agent.log', 'logs/monitoring/'];
        }
        return stats;
    }
}
exports.LogsService = LogsService;
exports.logsService = new LogsService();
//# sourceMappingURL=logs.service.js.map