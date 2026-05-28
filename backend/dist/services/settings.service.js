"use strict";
/**
 * Settings Service
 * Manages application settings persistence
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsService = exports.SettingsService = void 0;
const logger_1 = __importDefault(require("../config/logger"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const SETTINGS_FILE = path.resolve(process.cwd(), 'uploads/settings.json');
const DEFAULT_SETTINGS = {
    vm: {
        vmName: 'ForensicsSandbox',
        snapshotName: 'CleanBaseline',
        headlessMode: false,
        startupTimeout: 60,
        shutdownTimeout: 30,
    },
    monitoring: {
        enabled: true,
        pollingInterval: 5000,
        processEnabled: true,
        fileEnabled: true,
        registryEnabled: true,
        networkEnabled: true,
        behaviorEnabled: true,
        logRetentionDays: 30,
    },
    execution: {
        timeout: 300,
        autoRollback: true,
        maxConcurrentSessions: 1,
        telemetryLimit: 10000,
    },
    logging: {
        level: 'info',
        maxFileSize: '10m',
        maxFiles: 30,
    },
    notifications: {
        alertsEnabled: true,
        alertOnCompletion: true,
        alertOnError: true,
        webhookUrl: '',
    },
};
function loadSettings() {
    try {
        if (fs.existsSync(SETTINGS_FILE)) {
            const content = fs.readFileSync(SETTINGS_FILE, 'utf-8');
            const saved = JSON.parse(content);
            return { ...DEFAULT_SETTINGS, ...saved };
        }
    }
    catch (error) {
        logger_1.default.error('Error loading settings:', error);
    }
    return { ...DEFAULT_SETTINGS };
}
function saveSettings(settings) {
    try {
        const dir = path.dirname(SETTINGS_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
    }
    catch (error) {
        logger_1.default.error('Error saving settings:', error);
        throw error;
    }
}
function validateSettings(settings) {
    const errors = [];
    if (settings.vm) {
        const vm = settings.vm;
        if (vm.vmName !== undefined && (typeof vm.vmName !== 'string' || vm.vmName.trim().length === 0)) {
            errors.push('VM name must be a non-empty string');
        }
        if (vm.snapshotName !== undefined && (typeof vm.snapshotName !== 'string' || vm.snapshotName.trim().length === 0)) {
            errors.push('Snapshot name must be a non-empty string');
        }
        if (vm.startupTimeout !== undefined && (typeof vm.startupTimeout !== 'number' || vm.startupTimeout < 10 || vm.startupTimeout > 600)) {
            errors.push('Startup timeout must be between 10 and 600 seconds');
        }
        if (vm.shutdownTimeout !== undefined && (typeof vm.shutdownTimeout !== 'number' || vm.shutdownTimeout < 5 || vm.shutdownTimeout > 300)) {
            errors.push('Shutdown timeout must be between 5 and 300 seconds');
        }
    }
    if (settings.monitoring) {
        const mon = settings.monitoring;
        if (mon.pollingInterval !== undefined && (typeof mon.pollingInterval !== 'number' || mon.pollingInterval < 1000 || mon.pollingInterval > 60000)) {
            errors.push('Polling interval must be between 1000ms and 60000ms');
        }
        if (mon.logRetentionDays !== undefined && (typeof mon.logRetentionDays !== 'number' || mon.logRetentionDays < 1 || mon.logRetentionDays > 365)) {
            errors.push('Log retention must be between 1 and 365 days');
        }
    }
    if (settings.execution) {
        const exec = settings.execution;
        if (exec.timeout !== undefined && (typeof exec.timeout !== 'number' || exec.timeout < 30 || exec.timeout > 3600)) {
            errors.push('Execution timeout must be between 30 and 3600 seconds');
        }
        if (exec.maxConcurrentSessions !== undefined && (typeof exec.maxConcurrentSessions !== 'number' || exec.maxConcurrentSessions < 1 || exec.maxConcurrentSessions > 10)) {
            errors.push('Max concurrent sessions must be between 1 and 10');
        }
        if (exec.telemetryLimit !== undefined && (typeof exec.telemetryLimit !== 'number' || exec.telemetryLimit < 100 || exec.telemetryLimit > 100000)) {
            errors.push('Telemetry limit must be between 100 and 100000 events');
        }
    }
    if (settings.logging) {
        const log = settings.logging;
        if (log.level !== undefined) {
            const validLevels = ['debug', 'info', 'warning', 'error', 'critical'];
            if (!validLevels.includes(log.level)) {
                errors.push(`Log level must be one of: ${validLevels.join(', ')}`);
            }
        }
        if (log.maxFiles !== undefined && (typeof log.maxFiles !== 'number' || log.maxFiles < 1 || log.maxFiles > 100)) {
            errors.push('Max log files must be between 1 and 100');
        }
    }
    return { valid: errors.length === 0, errors };
}
class SettingsService {
    getSettings() {
        return loadSettings();
    }
    updateSettings(updates) {
        const current = loadSettings();
        const merged = {
            vm: { ...current.vm, ...(updates.vm || {}) },
            monitoring: { ...current.monitoring, ...(updates.monitoring || {}) },
            execution: { ...current.execution, ...(updates.execution || {}) },
            logging: { ...current.logging, ...(updates.logging || {}) },
            notifications: { ...current.notifications, ...(updates.notifications || {}) },
        };
        const validation = validateSettings(merged);
        if (!validation.valid) {
            return { settings: current, errors: validation.errors };
        }
        saveSettings(merged);
        return { settings: merged };
    }
    resetToDefaults() {
        saveSettings(DEFAULT_SETTINGS);
        return { ...DEFAULT_SETTINGS };
    }
    exportSettings() {
        return loadSettings();
    }
}
exports.SettingsService = SettingsService;
exports.settingsService = new SettingsService();
//# sourceMappingURL=settings.service.js.map