"use strict";
/**
 * Sandbox Controller
 * Handles sandbox synchronization and runtime control endpoints
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
exports.sandboxController = exports.SandboxController = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const logger_1 = __importDefault(require("../config/logger"));
const services_1 = require("../services");
const types_1 = require("../types");
const websocket_service_1 = require("../services/websocket.service");
const blockchain_1 = require("../blockchain");
/**
 * Simulator display-name mapping.
 *
 * SOURCE OF TRUTH: `sandbox-agent-v2/agent/app.py` (SIMULATORS list) and
 * `sandbox-agent-v2/agent/pipeline.py` (script_map).  Keep these files in
 * sync when adding/renaming simulators.
 */
const SIMULATOR_DISPLAY_NAMES = {
    'system_service_1': 'Sample Alpha',
    'system_service_2': 'Sample Beta',
    'system_service_3': 'Sample Gamma',
    'system_service_4': 'Sample Delta',
    'system_service_5': 'Sample Epsilon',
    'ransomware-simulator': 'Sample Alpha',
    'spyware-simulator': 'Sample Beta',
    'trojan-simulator': 'Sample Gamma',
    'botnet-simulator': 'Sample Delta',
    'credential-stealer': 'Sample Epsilon',
};
function formatSimulatorName(simulatorId) {
    return SIMULATOR_DISPLAY_NAMES[simulatorId] || simulatorId;
}
let runtimeStarting = false;
/**
 * Auto-register the sandbox-report.json on the blockchain after analysis completes.
 * Implements the workflow: Evidence → SHA256 → Blockchain.
 * Polls briefly for the report file (the agent writes it after COMPLETE state).
 */
async function registerSandboxReportOnBlockchain(sessionId, userId) {
    // Locate the sandbox-report-<sessionId>.json file
    const reportPath = path_1.default.resolve(process.cwd(), 'uploads', 'reports', `sandbox-report-${sessionId}.json`);
    // The agent writes the file just after COMPLETE; allow a brief window for the write.
    for (let attempt = 0; attempt < 5; attempt++) {
        if (fs_1.default.existsSync(reportPath))
            break;
        await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (!fs_1.default.existsSync(reportPath)) {
        logger_1.default.warn(`[Blockchain] Sandbox report not found at ${reportPath}; skipping auto-registration.`);
        return;
    }
    // Use sessionId as the evidence ID so it can be looked up later.
    const evidenceId = `SANDBOX-${sessionId}`;
    try {
        const result = await blockchain_1.blockchainVerificationService.registerEvidence(evidenceId, reportPath, userId);
        logger_1.default.info(`[Blockchain] Auto-registered sandbox report ${evidenceId} fingerprint=${result.fingerprint.slice(0, 16)}...`);
    }
    catch (err) {
        logger_1.default.warn(`[Blockchain] Auto-registration failed for ${evidenceId}:`, err);
    }
}
class SandboxController {
    /**
     * GET /api/v1/sandbox/health
     * Get sandbox runtime health status
     */
    async getHealth(req, res) {
        try {
            const health = await services_1.sandboxRuntimeService.getHealth();
            const response = {
                success: true,
                message: 'Sandbox runtime health retrieved',
                data: { health },
            };
            res.json(response);
        }
        catch (error) {
            const response = {
                success: false,
                message: error.message || 'Failed to get sandbox health',
                data: { status: 'unavailable' },
            };
            res.status(503).json(response);
        }
    }
    /**
     * GET /api/v1/sandbox/simulators
     * List available simulators
     */
    async listSimulators(req, res) {
        try {
            const simulators = await services_1.sandboxRuntimeService.listSimulators();
            const response = {
                success: true,
                message: 'Simulators retrieved',
                data: { simulators },
            };
            res.json(response);
        }
        catch (error) {
            const response = {
                success: false,
                message: error.message || 'Failed to list simulators',
                data: { simulators: [] },
            };
            res.status(503).json(response);
        }
    }
    /**
     * POST /api/v1/sandbox/sessions
     * Start a new sandbox session (runtime-controlled)
     */
    async startSession(req, res) {
        try {
            const { simulator_id, auto_rollback = true, timeout_seconds = 300 } = req.body;
            if (!simulator_id) {
                res.status(400).json({
                    success: false,
                    message: 'simulator_id is required',
                });
                return;
            }
            const runtimeSession = await services_1.sandboxRuntimeService.startSession({
                simulator_id,
                auto_rollback,
                timeout_seconds,
            });
            await services_1.sandboxSyncService.receiveSessionStart({
                sessionId: runtimeSession.session_id,
                vmName: 'sandbox-vm',
                simulatorId: runtimeSession.simulator_id,
                simulatorName: formatSimulatorName(runtimeSession.simulator_id),
                startTime: runtimeSession.created_at,
            });
            services_1.sandboxRuntimeService.monitorSessionCompletion(runtimeSession.session_id, async (completedSession) => {
                try {
                    const stateMap = {
                        'COMPLETED': types_1.SandboxSessionStatus.COMPLETED,
                        'FAILED': types_1.SandboxSessionStatus.FAILED,
                    };
                    const status = stateMap[completedSession.state.toUpperCase()] || types_1.SandboxSessionStatus.FAILED;
                    await services_1.sandboxSyncService.receiveSessionComplete({
                        sessionId: completedSession.session_id,
                        status,
                        endTime: completedSession.updated_at,
                    });
                    try {
                        const eventsData = await services_1.sandboxRuntimeService.getSessionEvents(completedSession.session_id);
                        if (eventsData.events && eventsData.events.length > 0) {
                            await services_1.sandboxSyncService.receiveForensicEvents({
                                sessionId: completedSession.session_id,
                                events: eventsData.events,
                            });
                            logger_1.default.info(`Forwarded ${eventsData.events.length} forensic events for session ${completedSession.session_id}`);
                        }
                    }
                    catch (eventsErr) {
                        logger_1.default.warn(`Failed to forward events for session ${completedSession.session_id}:`, eventsErr);
                    }
                    // Auto-register the sandbox-report.json on the blockchain after analysis completes.
                    // Workflow: Evidence → SHA256 → Blockchain (only after analysis completes)
                    if (status === types_1.SandboxSessionStatus.COMPLETED) {
                        try {
                            await registerSandboxReportOnBlockchain(completedSession.session_id, req.user?.id || 'system');
                        }
                        catch (blockchainErr) {
                            logger_1.default.warn(`Failed to auto-register sandbox report on blockchain for ${completedSession.session_id}:`, blockchainErr);
                        }
                    }
                }
                catch (err) {
                    logger_1.default.error(`Failed to record session completion for ${runtimeSession.session_id}:`, err);
                }
            });
            websocket_service_1.websocketService.emitSandboxSessionUpdate(runtimeSession.session_id, runtimeSession);
            const response = {
                success: true,
                message: 'Session started',
                data: { session: runtimeSession },
            };
            res.status(201).json(response);
        }
        catch (error) {
            websocket_service_1.websocketService.emitSandboxError('', {
                code: error.code || 'START_FAILED',
                message: error.message || 'Failed to start session',
                stage: 'START',
            });
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to start session',
            });
        }
    }
    /**
     * GET /api/v1/sessions
     * List all sessions (from MongoDB)
     */
    async findAll(req, res) {
        const { page = 1, limit = 20, status } = req.query;
        const result = await services_1.sandboxSyncService.findAll({
            page: Number(page),
            limit: Math.min(Number(limit), 100),
            status,
        });
        const response = {
            success: true,
            message: 'Sessions retrieved',
            data: result.sessions,
            meta: {
                page: Number(page),
                limit: Number(limit),
                total: result.total,
                totalPages: result.totalPages,
            },
        };
        res.json(response);
    }
    /**
     * GET /api/v1/sandbox/sessions/:sessionId
     * Get session by ID
     */
    async findById(req, res) {
        const session = await services_1.sandboxSyncService.findById(req.params.sessionId);
        const response = {
            success: true,
            message: 'Session retrieved',
            data: { session },
        };
        res.json(response);
    }
    /**
     * POST /api/v1/sandbox/sessions/:sessionId/stop
     * Stop an active session
     */
    async stopSession(req, res) {
        try {
            const runtimeSession = await services_1.sandboxRuntimeService.stopSession(req.params.sessionId);
            // Fetch and persist events before marking session complete
            try {
                const eventsData = await services_1.sandboxRuntimeService.getSessionEvents(req.params.sessionId);
                if (eventsData.events && eventsData.events.length > 0) {
                    await services_1.sandboxSyncService.receiveForensicEvents({
                        sessionId: req.params.sessionId,
                        events: eventsData.events,
                    });
                }
            }
            catch (eventsErr) {
                logger_1.default.warn(`Failed to forward events on stop for session ${req.params.sessionId}:`, eventsErr);
            }
            await services_1.sandboxSyncService.receiveSessionComplete({
                sessionId: runtimeSession.session_id,
                status: 'failed',
                endTime: runtimeSession.updated_at,
                exitCode: -1,
                errors: [runtimeSession.error || 'Session stopped by user'],
            });
            websocket_service_1.websocketService.emitSandboxSessionUpdate(runtimeSession.session_id, runtimeSession);
            const response = {
                success: true,
                message: 'Session stopped',
                data: { session: runtimeSession },
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to stop session',
            });
        }
    }
    /**
     * POST /api/v1/sandbox/sessions/:sessionId/terminate
     * Force terminate an active session with rollback
     */
    async terminateSession(req, res) {
        try {
            // Fetch and persist events before terminating
            try {
                const eventsData = await services_1.sandboxRuntimeService.getSessionEvents(req.params.sessionId);
                if (eventsData.events && eventsData.events.length > 0) {
                    await services_1.sandboxSyncService.receiveForensicEvents({
                        sessionId: req.params.sessionId,
                        events: eventsData.events,
                    });
                }
            }
            catch (eventsErr) {
                logger_1.default.warn(`Failed to forward events on terminate for session ${req.params.sessionId}:`, eventsErr);
            }
            const runtimeSession = await services_1.sandboxRuntimeService.terminateSession(req.params.sessionId);
            await services_1.sandboxSyncService.receiveSessionComplete({
                sessionId: runtimeSession.session_id,
                status: 'failed',
                endTime: runtimeSession.updated_at,
                exitCode: -1,
                errors: [runtimeSession.error || 'Session terminated by user'],
            });
            websocket_service_1.websocketService.emitSandboxSessionUpdate(runtimeSession.session_id, runtimeSession);
            const response = {
                success: true,
                message: 'Session terminated',
                data: { session: runtimeSession },
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to terminate session',
            });
        }
    }
    /**
     * GET /api/v1/sandbox/stats
     * Get sandbox statistics
     */
    async getStats(req, res) {
        const stats = await services_1.sandboxSyncService.getStats();
        const response = {
            success: true,
            message: 'Statistics retrieved',
            data: { stats },
        };
        res.json(response);
    }
    /**
     * DELETE /api/v1/sandbox/sessions
     * Clear all session history
     */
    async clearSessions(req, res) {
        const result = await services_1.sandboxSyncService.clearAll();
        res.json({ success: true, message: 'Sessions cleared', data: result });
    }
    /**
     * GET /api/v1/sandbox/telemetry-url
     * Get WebSocket URL for telemetry streaming
     */
    async getTelemetryUrl(req, res) {
        const url = services_1.sandboxRuntimeService.getTelemetryUrl();
        const response = {
            success: true,
            message: 'Telemetry URL retrieved',
            data: { url },
        };
        res.json(response);
    }
    /**
     * GET /api/v1/sandbox/logs-url
     * Get WebSocket URL for system log streaming
     */
    async getLogsUrl(req, res) {
        const url = services_1.sandboxRuntimeService.getLogsUrl();
        const response = {
            success: true,
            message: 'System logs URL retrieved',
            data: { url },
        };
        res.json(response);
    }
    /**
     * POST /api/v1/sandbox/vm/reset
     * Reset VM to clean snapshot
     */
    async resetVm(req, res) {
        try {
            const result = await services_1.sandboxRuntimeService.resetVm();
            const response = {
                success: true,
                message: 'VM reset',
                data: result,
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to reset VM',
            });
        }
    }
    /**
     * GET /api/v1/sandbox/vm/status
     * Get VM status
     */
    async getVmStatus(req, res) {
        try {
            const status = await services_1.sandboxRuntimeService.getVmStatus();
            const response = {
                success: true,
                message: 'VM status retrieved',
                data: { status },
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get VM status',
            });
        }
    }
    /**
     * GET /api/v1/sandbox/monitoring/status
     * Get monitoring status
     */
    async getMonitoringStatus(req, res) {
        try {
            const status = await services_1.sandboxRuntimeService.getMonitoringStatus();
            const response = {
                success: true,
                message: 'Monitoring status retrieved',
                data: { status },
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get monitoring status',
            });
        }
    }
    /**
     * GET /api/v1/sandbox/execution/status
     * Get execution status
     */
    async getExecutionStatus(req, res) {
        try {
            const status = await services_1.sandboxRuntimeService.getExecutionStatus();
            const response = {
                success: true,
                message: 'Execution status retrieved',
                data: { status },
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get execution status',
            });
        }
    }
    /**
     * GET /api/v1/sandbox/logs
     * Get runtime logs
     */
    async getLogs(req, res) {
        try {
            const { limit = 100, level } = req.query;
            const logs = await services_1.sandboxRuntimeService.getLogs(Number(limit) || 100, level);
            const response = {
                success: true,
                message: 'Logs retrieved',
                data: logs,
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get logs',
            });
        }
    }
    /**
     * POST /api/v1/sandbox/runtime/start
     * Start the sandbox runtime service
     */
    async startRuntime(req, res) {
        if (runtimeStarting) {
            res.status(409).json({
                success: false,
                message: 'Runtime is already starting. Please wait.',
            });
            return;
        }
        try {
            const isRunning = await services_1.sandboxRuntimeService.isAvailable();
            if (isRunning) {
                res.json({
                    success: true,
                    message: 'Sandbox runtime is already running',
                });
                return;
            }
        }
        catch {
            // Runtime not available, proceed to start
        }
        const { spawn, exec } = await Promise.resolve().then(() => __importStar(require('child_process')));
        const { join, dirname } = await Promise.resolve().then(() => __importStar(require('path')));
        const fs = await Promise.resolve().then(() => __importStar(require('fs')));
        const util = await Promise.resolve().then(() => __importStar(require('util')));
        const execPromise = util.promisify(exec);
        // Resolve project root: if SANDBOX_PROJECT_ROOT is set use it,
        // else walk up from cwd to find the directory containing 'sandbox-agent-v2'
        let projectRoot = process.env.SANDBOX_PROJECT_ROOT || process.cwd();
        if (!fs.existsSync(join(projectRoot, 'sandbox-agent-v2'))) {
            // Walk up directories looking for the sandbox-agent-v2 folder
            let candidate = process.cwd();
            for (let i = 0; i < 5; i++) {
                if (fs.existsSync(join(candidate, 'sandbox-agent-v2'))) {
                    projectRoot = candidate;
                    break;
                }
                const parent = dirname(candidate);
                if (parent === candidate)
                    break;
                candidate = parent;
            }
        }
        const runtimeFilePath = join(projectRoot, 'sandbox-agent-v2', 'main.py');
        if (!fs.existsSync(runtimeFilePath)) {
            res.status(404).json({
                success: false,
                message: `Runtime script not found at: ${runtimeFilePath}`,
            });
            return;
        }
        let pythonPath = null;
        const pythonCandidates = [
            process.env.PYTHON_PATH,
            'python',
            'python3',
            'py',
        ].filter(Boolean);
        for (const candidate of pythonCandidates) {
            if (!candidate)
                continue;
            if (candidate.includes('\\') || candidate.includes('/')) {
                if (fs.existsSync(candidate)) {
                    pythonPath = candidate;
                    break;
                }
            }
            else {
                try {
                    const { stdout } = await execPromise(`where ${candidate}`, { windowsHide: true });
                    const paths = stdout.trim().split('\r\n').filter(p => p.toLowerCase().endsWith('.exe'));
                    if (paths.length > 0) {
                        pythonPath = paths[0];
                        break;
                    }
                }
                catch {
                    continue;
                }
            }
        }
        if (!pythonPath) {
            res.status(500).json({
                success: false,
                message: 'Python not found. Install Python 3.11+ and add to PATH, or set PYTHON_PATH environment variable.',
                searched: pythonCandidates.filter(Boolean),
            });
            return;
        }
        try {
            runtimeStarting = true;
            const logDir = join(projectRoot, 'sandbox-agent-v2');
            const logFile = join(logDir, 'runtime.log');
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }
            try {
                const { stdout: netstatOut } = await execPromise('netstat -ano | findstr :8765', { windowsHide: true });
                const lines = netstatOut.trim().split('\n').filter(l => l.includes('LISTENING'));
                for (const line of lines) {
                    const parts = line.trim().split(/\s+/);
                    const pid = parts[parts.length - 1];
                    if (pid && pid !== '0') {
                        try {
                            await execPromise(`taskkill /F /PID ${pid}`, { windowsHide: true });
                        }
                        catch { /* process may already be dead */ }
                    }
                }
            }
            catch { /* tasklist failed — port may not be in use */ }
            // Open log file as file descriptor so child can write to it independently of parent
            const logFd = fs.openSync(logFile, 'a');
            const child = spawn(pythonPath, [
                '-u', runtimeFilePath,
            ], {
                detached: true,
                stdio: ['ignore', logFd, logFd],
                cwd: join(projectRoot, 'sandbox-agent-v2'),
                env: { ...process.env, PYTHONPATH: join(projectRoot, 'sandbox-agent-v2') },
                windowsHide: true,
            });
            // Close parent's fd; child has its own copy now
            fs.closeSync(logFd);
            child.unref();
            child.on('error', (err) => {
                runtimeStarting = false;
                logger_1.default.error(`[Sandbox] Runtime spawn error: ${err.message}`);
            });
            child.on('exit', (code) => {
                runtimeStarting = false;
                logger_1.default.info(`[Sandbox] Runtime exited with code ${code}`);
            });
            setTimeout(() => {
                runtimeStarting = false;
            }, 10000);
            res.json({
                success: true,
                message: 'Sandbox runtime starting on port 8765...',
                logFile,
                pythonPath,
            });
        }
        catch (error) {
            runtimeStarting = false;
            res.status(500).json({
                success: false,
                message: 'Failed to start sandbox runtime',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * POST /api/v1/sandbox/sessions/start
     * Legacy: Receive session start event from desktop agent
     */
    async receiveSessionStart(req, res) {
        const session = await services_1.sandboxSyncService.receiveSessionStart(req.body);
        const response = {
            success: true,
            message: 'Session started',
            data: { session },
        };
        res.status(201).json(response);
    }
    /**
     * POST /api/v1/sandbox/sessions/:sessionId/complete
     * Legacy: Receive session completion event
     */
    async receiveSessionComplete(req, res) {
        const session = await services_1.sandboxSyncService.receiveSessionComplete({
            ...req.body,
            sessionId: req.params.sessionId,
        });
        const response = {
            success: true,
            message: 'Session completed',
            data: { session },
        };
        res.json(response);
    }
    /**
     * POST /api/v1/sandbox/sessions/:sessionId/events
     * Legacy: Receive forensic events from sandbox
     */
    async receiveEvents(req, res) {
        const result = await services_1.sandboxSyncService.receiveForensicEvents({
            ...req.body,
            sessionId: req.params.sessionId,
        });
        const response = {
            success: true,
            message: 'Events received',
            data: result,
        };
        res.json(response);
    }
}
exports.SandboxController = SandboxController;
exports.sandboxController = new SandboxController();
exports.default = exports.sandboxController;
//# sourceMappingURL=sandbox.controller.js.map