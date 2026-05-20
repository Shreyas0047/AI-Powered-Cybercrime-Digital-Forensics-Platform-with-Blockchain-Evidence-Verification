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
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path_1 = require("path");
let runtimeStarted = false;
class SandboxRuntimeService {
    client;
    baseUrl;
    constructor() {
        this.baseUrl = process.env.SANDBOX_RUNTIME_URL || 'http://127.0.0.1:8765';
        this.client = axios_1.default.create({
            baseURL: this.baseUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }
    async ensureRuntimeStarted() {
        if (runtimeStarted)
            return;
        try {
            await this.getHealth();
            runtimeStarted = true;
            return;
        }
        catch {
            const runtimePath = (0, path_1.join)(process.cwd(), 'sandbox-agent', 'src', 'forensics_sandbox_agent', 'infrastructure', '__main__.py');
            const altPath = 'C:\\Users\\shreyas\\Desktop\\cybersec projects\\gowda virus project\\sandbox-agent\\src\\forensics_sandbox_agent\\infrastructure\\__main__.py';
            let finalPath = (0, fs_1.existsSync)(runtimePath) ? runtimePath : ((0, fs_1.existsSync)(altPath) ? altPath : null);
            if (finalPath) {
                const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
                (0, child_process_1.spawn)(pythonCmd, ['-m', 'forensics_sandbox_agent.infrastructure.runtime_api', '--port', '8765'], {
                    detached: true,
                    stdio: 'ignore',
                    shell: false,
                });
                await new Promise(resolve => setTimeout(resolve, 3000));
                runtimeStarted = true;
            }
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
            await this.ensureRuntimeStarted();
            const response = await this.client.get('/health');
            return response.data;
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    async isAvailable() {
        try {
            await this.client.get('/health', { timeout: 2000 });
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
            const response = await this.client.post('/sessions/start', request);
            return response.data;
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    async getSession(sessionId) {
        try {
            const response = await this.client.get(`/sessions/${sessionId}`);
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