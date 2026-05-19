"use strict";
/**
 * Sandbox Synchronization Service
 * Handles data sync from desktop sandbox agent
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sandboxSyncService = exports.SandboxSyncService = void 0;
const models_1 = require("../models");
const types_1 = require("../types");
const middleware_1 = require("../middleware");
// import { v4 as uuidv4 } from 'uuid';
class SandboxSyncService {
    /**
     * Receive sandbox session start event
     */
    async receiveSessionStart(data) {
        // Check for duplicate session
        const existing = await models_1.SandboxSession.findOne({ sessionId: data.sessionId });
        if (existing) {
            throw new middleware_1.ConflictError(`Session ${data.sessionId} already exists`);
        }
        const session = await models_1.SandboxSession.create({
            sessionId: data.sessionId,
            vmName: data.vmName,
            simulatorId: data.simulatorId,
            simulatorName: data.simulatorName,
            status: types_1.SandboxSessionStatus.RUNNING,
            startTime: new Date(data.startTime),
        });
        return session;
    }
    /**
     * Receive sandbox session completion
     */
    async receiveSessionComplete(data) {
        const session = await models_1.SandboxSession.findOne({ sessionId: data.sessionId });
        if (!session) {
            throw new middleware_1.AppError('Session not found', 400, 'NOT_FOUND');
        }
        session.status = data.status;
        session.endTime = new Date(data.endTime);
        session.duration = (session.endTime.getTime() - session.startTime.getTime()) / 1000;
        session.exitCode = data.exitCode;
        session.eventsCollected = data.eventsCollected || 0;
        session.evidenceFiles = data.evidenceFiles || [];
        session.errorMessages = data.errors || [];
        session.syncedAt = new Date();
        await session.save();
        return session;
    }
    /**
     * Receive forensic events from sandbox
     */
    async receiveForensicEvents(data) {
        // Verify session exists
        const session = await models_1.SandboxSession.findOne({ sessionId: data.sessionId });
        if (!session) {
            throw new middleware_1.AppError('Session not found', 400, 'NOT_FOUND');
        }
        // In a full implementation, these would be stored in an events collection
        // For now, we just increment the counter
        session.eventsCollected += data.events.length;
        await session.save();
        return { received: data.events.length };
    }
    /**
     * Get all sessions
     */
    async findAll(options) {
        const { page, limit, status } = options;
        const query = status ? { status } : {};
        const total = await models_1.SandboxSession.countDocuments(query);
        const totalPages = Math.ceil(total / limit);
        const sessions = await models_1.SandboxSession.find(query)
            .sort({ startTime: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();
        return { sessions, total, totalPages };
    }
    /**
     * Get session by ID
     */
    async findById(sessionId) {
        const session = await models_1.SandboxSession.findOne({ sessionId }).lean();
        if (!session) {
            throw new middleware_1.AppError('Session not found', 400, 'NOT_FOUND');
        }
        return session;
    }
    /**
     * Get session statistics
     */
    async getStats() {
        const total = await models_1.SandboxSession.countDocuments();
        const byStatus = await models_1.SandboxSession.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]);
        const avgDuration = await models_1.SandboxSession.aggregate([
            { $match: { duration: { $exists: true } } },
            { $group: { _id: null, avg: { $avg: '$duration' } } },
        ]);
        return {
            total,
            byStatus: byStatus.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
            avgDuration: avgDuration[0]?.avg || 0,
        };
    }
}
exports.SandboxSyncService = SandboxSyncService;
exports.sandboxSyncService = new SandboxSyncService();
exports.default = exports.sandboxSyncService;
//# sourceMappingURL=sandbox-sync.service.js.map