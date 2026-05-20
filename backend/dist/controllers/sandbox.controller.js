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
Object.defineProperty(exports, "__esModule", { value: true });
exports.sandboxController = exports.SandboxController = void 0;
const services_1 = require("../services");
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
                simulatorName: runtimeSession.simulator_id,
                startTime: runtimeSession.created_at,
            });
            const response = {
                success: true,
                message: 'Session started',
                data: { session: runtimeSession },
            };
            res.status(201).json(response);
        }
        catch (error) {
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
            await services_1.sandboxSyncService.receiveSessionComplete({
                sessionId: runtimeSession.session_id,
                status: 'failed',
                endTime: runtimeSession.updated_at,
                exitCode: -1,
                errors: [runtimeSession.error || 'Session stopped by user'],
            });
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
            const runtimeSession = await services_1.sandboxRuntimeService.terminateSession(req.params.sessionId);
            await services_1.sandboxSyncService.receiveSessionComplete({
                sessionId: runtimeSession.session_id,
                status: 'failed',
                endTime: runtimeSession.updated_at,
                exitCode: -1,
                errors: [runtimeSession.error || 'Session terminated by user'],
            });
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
        const { spawn } = await Promise.resolve().then(() => __importStar(require('child_process')));
        const { join } = await Promise.resolve().then(() => __importStar(require('path')));
        const fs = await Promise.resolve().then(() => __importStar(require('fs')));
        const possiblePaths = [
            process.env.SANDBOX_RUNTIME_PATH,
            join(process.cwd(), 'sandbox-agent', 'src', 'forensics_sandbox_agent', 'infrastructure', 'runtime_api.py'),
        ].filter(Boolean);
        let runtimePath;
        for (const path of possiblePaths) {
            if (path && fs.existsSync(path.replace(/\\/g, '\\\\').replace(/\//g, '\\'))) {
                runtimePath = path;
                break;
            }
        }
        if (!runtimePath) {
            const defaultPath = 'C:\\Users\\shreyas\\Desktop\\cybersec projects\\gowda virus project\\sandbox-agent\\src\\forensics_sandbox_agent\\infrastructure\\runtime_api.py';
            if (fs.existsSync(defaultPath)) {
                runtimePath = defaultPath;
            }
        }
        if (!runtimePath) {
            res.status(404).json({
                success: false,
                message: 'Sandbox runtime not found',
            });
            return;
        }
        try {
            const isWindows = process.platform === 'win32';
            if (isWindows) {
                const pythonCmd = 'python';
                spawn(pythonCmd, [runtimePath], {
                    detached: true,
                    stdio: 'ignore',
                    shell: false,
                });
            }
            else {
                spawn('python3', [runtimePath], {
                    detached: true,
                    stdio: 'ignore',
                });
            }
            res.json({
                success: true,
                message: 'Sandbox runtime started',
            });
        }
        catch (error) {
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
    /**
     * POST /api/v1/sandbox/launch-agent
     * Legacy: Launch the desktop sandbox agent application
     */
    async launchAgent(req, res) {
        const { spawn } = await Promise.resolve().then(() => __importStar(require('child_process')));
        const fs = await Promise.resolve().then(() => __importStar(require('fs')));
        const possiblePaths = [
            process.env.SANDBOX_AGENT_PATH,
            'C:\\Users\\shreyas\\Desktop\\cybersec projects\\gowda virus project\\dist\\sandbox-agent\\ForensicsSandboxAgent.exe',
            'C:\\Users\\shreyas\\Desktop\\cybersec projects\\gowda virus project\\dist\\sandbox-agent\\ForensicsSandboxAgent.exe',
        ].filter(Boolean);
        let agentPath;
        let foundPath = false;
        for (const path of possiblePaths) {
            if (path && fs.existsSync(path)) {
                agentPath = path;
                foundPath = true;
                break;
            }
        }
        if (!foundPath || !agentPath) {
            console.error('Sandbox agent not found. Searched paths:', possiblePaths);
            res.status(404).json({
                success: false,
                message: 'Sandbox agent not found. Please build the agent first using: python build.py agent',
                searchedPaths: possiblePaths,
            });
            return;
        }
        console.log('Launching sandbox agent from:', agentPath);
        try {
            const isWindows = process.platform === 'win32';
            if (isWindows) {
                const psCommand = `Start-Process -FilePath "${agentPath.replace(/\\/g, '\\\\')}" -WindowStyle Normal`;
                spawn('powershell', ['-Command', psCommand], {
                    detached: true,
                    stdio: 'ignore',
                    shell: false,
                    windowsHide: false
                });
            }
            else {
                spawn(agentPath, [], {
                    detached: true,
                    stdio: 'ignore'
                });
            }
            res.json({
                success: true,
                message: 'Sandbox agent launched',
                data: { agentPath },
            });
        }
        catch (error) {
            console.error('Failed to launch sandbox agent:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to launch sandbox agent',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
}
exports.SandboxController = SandboxController;
exports.sandboxController = new SandboxController();
exports.default = exports.sandboxController;
//# sourceMappingURL=sandbox.controller.js.map