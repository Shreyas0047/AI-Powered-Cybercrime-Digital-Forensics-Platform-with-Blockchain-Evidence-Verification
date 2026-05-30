"use strict";
/**
 * Sandbox Synchronization Service
 * Handles data sync from desktop sandbox agent
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sandboxSyncService = exports.SandboxSyncService = void 0;
const models_1 = require("../models");
const telemetry_event_model_1 = require("../models/telemetry-event.model");
const types_1 = require("../types");
const middleware_1 = require("../middleware");
const websocket_service_1 = require("./websocket.service");
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
        websocket_service_1.websocketService.emitSandboxSessionUpdate(session.sessionId, session);
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
        websocket_service_1.websocketService.emitSandboxSessionUpdate(session.sessionId, session);
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
        const normalizedEvents = data.events.map((event, index) => ({
            sessionId: data.sessionId,
            eventType: event.type || event.eventType || event.event_type || 'unknown',
            timestamp: new Date(event.timestamp || Date.now()),
            processId: event.processId || event.process_id || event.pid,
            processName: event.processName || event.process_name || event.source,
            metadata: event.details || event.data || event.metadata || {},
            raw: event,
        }));
        if (normalizedEvents.length > 0) {
            await telemetry_event_model_1.TelemetryEvent.insertMany(normalizedEvents, { ordered: false });
        }
        session.eventsCollected += normalizedEvents.length;
        session.recentEvents = [
            ...(session.recentEvents || []),
            ...data.events.map((event, index) => ({
                id: event.id || `${data.sessionId}-${Date.now()}-${index}`,
                timestamp: event.timestamp || new Date().toISOString(),
                type: event.type || event.eventType || event.event_type || 'unknown',
                source: event.source || event.processName || event.process_name || 'sandbox',
                details: event.details || event.data || event.metadata || {},
                receivedAt: new Date(),
            })),
        ].slice(-200);
        await session.save();
        websocket_service_1.websocketService.emitSandboxTelemetry(data.sessionId, { received: normalizedEvents.length });
        return { received: normalizedEvents.length };
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
    /**
     * Clear all sessions
     */
    async clearAll() {
        const result = await models_1.SandboxSession.deleteMany({});
        await telemetry_event_model_1.TelemetryEvent.deleteMany({});
        return { deleted: result.deletedCount || 0 };
    }
}
exports.SandboxSyncService = SandboxSyncService;
exports.sandboxSyncService = new SandboxSyncService();
exports.default = exports.sandboxSyncService;
//# sourceMappingURL=sandbox-sync.service.js.map