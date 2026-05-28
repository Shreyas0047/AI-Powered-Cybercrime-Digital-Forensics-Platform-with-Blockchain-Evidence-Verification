"use strict";
/**
 * Sandbox Runtime Service
 * Communicates with the headless sandbox runtime API
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sandboxRuntimeService = exports.SandboxRuntimeService = void 0;
const axios_1 = __importDefault(require("axios"));
const middleware_1 = require("../middleware");
let runtimeStarted = false;
let runtimeCheckInProgress = false;
class SandboxRuntimeService {
    client;
    baseUrl;
    sessionMonitors = new Map();
    constructor() {
        this.baseUrl = process.env.SANDBOX_RUNTIME_URL || 'http://127.0.0.1:8765';
        this.client = axios_1.default.create({
            baseURL: this.baseUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'X-Agent-Secret': process.env.SANDBOX_AGENT_SECRET || '',
            },
        });
    }
    async monitorSessionCompletion(sessionId, onComplete) {
        if (this.sessionMonitors.has(sessionId))
            return;
        this.sessionMonitors.set(sessionId, true);
        const poll = async (attempts) => {
            if (!this.sessionMonitors.has(sessionId))
                return;
            if (attempts >= 90) {
                this.sessionMonitors.delete(sessionId);
                return;
            }
            try {
                const session = await this.getSession(sessionId);
                const state = session.state.toUpperCase();
                if (state === 'COMPLETED' || state === 'FAILED') {
                    this.sessionMonitors.delete(sessionId);
                    await onComplete(session);
                    return;
                }
            }
            catch {
                // retry
            }
            setTimeout(() => poll(attempts + 1), 3000);
        };
        setTimeout(() => poll(0), 3000);
    }
    async ensureRuntimeStarted() {
        if (runtimeStarted)
            return;
        if (runtimeCheckInProgress) {
            await new Promise(resolve => setTimeout(resolve, 3000));
            return;
        }
        runtimeCheckInProgress = true;
        try {
            for (let attempt = 0; attempt < 3; attempt++) {
                try {
                    await this.client.get('/health', { timeout: 3000 });
                    runtimeStarted = true;
                    return;
                }
                catch {
                    if (attempt < 2) {
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                }
            }
            // Runtime is not reachable — do NOT auto-spawn; operator must start manually
        }
        finally {
            runtimeCheckInProgress = false;
        }
    }
    handleError(error) {
        if (axios_1.default.isAxiosError(error)) {
            if (error.code === 'ECONNREFUSED') {
                throw new middleware_1.AppError('Sandbox runtime service is not running. Click "Start Runtime" in the UI or run the sandbox runtime manually.', 503, 'RUNTIME_UNAVAILABLE');
            }
            throw new middleware_1.AppError(error.response?.data?.detail || error.message, error.response?.status || 500, 'RUNTIME_ERROR');
        }
        throw new middleware_1.AppError('Unknown error communicating with sandbox runtime', 500, 'RUNTIME_ERROR');
    }
    async getHealth() {
        try {
            if (!runtimeStarted) {
                await this.ensureRuntimeStarted();
            }
            const response = await this.client.get('/health');
            return response.data;
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    async isAvailable() {
        try {
            await this.client.get('/health', { timeout: 5000 });
            return true;
        }
        catch {
            return false;
        }
    }
    async listSimulators() {
        try {
            const response = await this.client.get('/simulators');
            return response.data;
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    async startSession(request) {
        try {
            if (!runtimeStarted) {
                await this.ensureRuntimeStarted();
            }
            const response = await this.client.post('/sessions/start', request, {
                timeout: 15000,
            });
            return response.data;
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    async getSession(sessionId) {
        try {
            if (!runtimeStarted) {
                await this.ensureRuntimeStarted();
            }
            const response = await this.client.get(`/sessions/${sessionId}`);
            return response.data;
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    async getSessionEvents(sessionId) {
        try {
            if (!runtimeStarted) {
                await this.ensureRuntimeStarted();
            }
            const response = await this.client.get(`/sessions/${sessionId}/events`);
            return response.data;
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    async listSessions() {
        try {
            const response = await this.client.get('/sessions');
            return response.data;
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    async stopSession(sessionId) {
        try {
            const response = await this.client.post(`/sessions/${sessionId}/stop`);
            return response.data;
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    async terminateSession(sessionId) {
        try {
            const response = await this.client.post(`/sessions/${sessionId}/terminate`);
            return response.data;
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    async getLogs(limit = 100, level) {
        try {
            const params = new URLSearchParams({ limit: String(limit) });
            if (level)
                params.append('level', level);
            const response = await this.client.get(`/logs?${params}`);
            return response.data;
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    getTelemetryUrl() {
        return `${this.baseUrl.replace('http', 'ws')}/telemetry/live`;
    }
    getLogsUrl() {
        return `${this.baseUrl.replace('http', 'ws')}/logs/live`;
    }
    async resetVm() {
        try {
            const response = await this.client.post('/vm/reset');
            return response.data;
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    async getVmStatus() {
        try {
            const response = await this.client.get('/vm/status');
            return response.data;
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    async getMonitoringStatus() {
        try {
            const response = await this.client.get('/monitoring/status');
            return response.data;
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    async getExecutionStatus() {
        try {
            const response = await this.client.get('/execution/status');
            return response.data;
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
}
exports.SandboxRuntimeService = SandboxRuntimeService;
exports.sandboxRuntimeService = new SandboxRuntimeService();
exports.default = exports.sandboxRuntimeService;
//# sourceMappingURL=sandbox-runtime.service.js.map