"use strict";
/**
 * Sandbox Controller
 * Handles sandbox synchronization endpoints
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sandboxController = exports.SandboxController = void 0;
const services_1 = require("../services");
class SandboxController {
    /**
     * POST /api/v1/sandbox/sessions/start
     * Receive session start event from desktop agent
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
     * Receive session completion event
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
     * Receive forensic events from sandbox
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
     * GET /api/v1/sandbox/sessions
     * List all sandbox sessions
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
}
exports.SandboxController = SandboxController;
exports.sandboxController = new SandboxController();
exports.default = exports.sandboxController;
//# sourceMappingURL=sandbox.controller.js.map