"use strict";
/**
 * Synchronization Routes
 * /api/v1/sync
 *
 * Handles all sandbox-to-server synchronization endpoints
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controllers_1 = require("../controllers");
const middleware_1 = require("../middleware");
const types_1 = require("../types");
const router = (0, express_1.Router)();
// ============================================
// SERVICE-TO-SERVICE AUTH (shared secret)
// ============================================
function requireAgentSecret(req, res, next) {
    const secret = process.env.SANDBOX_AGENT_SECRET;
    if (!secret) {
        // Dev mode: only allow loopback connections
        const clientIp = (req.ip || '').replace(/^::ffff:/, '');
        if (clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === 'localhost') {
            next();
            return;
        }
        res.status(503).json({ success: false, message: 'Agent auth not configured. Set SANDBOX_AGENT_SECRET in .env.' });
        return;
    }
    const provided = req.headers['x-agent-secret'];
    if (!provided || provided !== secret) {
        res.status(401).json({ success: false, message: 'Invalid agent credentials' });
        return;
    }
    next();
}
// Session heartbeat — requires agent shared secret
router.post('/sessions/:sessionId/heartbeat', requireAgentSecret, (0, middleware_1.asyncHandler)(controllers_1.syncController.sessionHeartbeat));
// ============================================
// AUTHENTICATED ROUTES
// ============================================
// All remaining sync routes require authentication
router.use(middleware_1.authenticate);
// ============================================
// EVIDENCE UPLOAD
// ============================================
// Single evidence upload
router.post('/evidence/upload', (0, middleware_1.requirePermission)(types_1.Permission.EVIDENCE_UPLOAD), (req, res, next) => {
    controllers_1.syncController.uploadEvidenceMiddleware(req, res, next);
}, (0, middleware_1.asyncHandler)(controllers_1.syncController.handleEvidenceUpload));
// Chunk upload for large files
router.post('/evidence/upload-chunk', (0, middleware_1.requirePermission)(types_1.Permission.EVIDENCE_UPLOAD), (req, res, next) => {
    controllers_1.syncController.uploadChunkMiddleware(req, res, next);
}, (0, middleware_1.asyncHandler)(controllers_1.syncController.handleChunkUpload));
// Batch upload multiple files
router.post('/evidence/batch', (0, middleware_1.requirePermission)(types_1.Permission.EVIDENCE_UPLOAD), (req, res, next) => {
    controllers_1.syncController.uploadBatchMiddleware(req, res, next);
}, (0, middleware_1.asyncHandler)(controllers_1.syncController.handleBatchUpload));
// ============================================
// FORENSIC REPORT INGESTION
// ============================================
// Ingest forensic report
router.post('/reports/ingest', (0, middleware_1.authorize)(types_1.UserRole.SANDBOX_OPERATOR, types_1.UserRole.FORENSIC_ANALYST, types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (req, res, next) => {
    controllers_1.syncController.uploadEvidenceMiddleware(req, res, next);
}, (0, middleware_1.asyncHandler)(controllers_1.syncController.ingestReport));
// Ingest execution summary
router.post('/reports/execution-summary', (0, middleware_1.authorize)(types_1.UserRole.SANDBOX_OPERATOR, types_1.UserRole.FORENSIC_ANALYST, types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, middleware_1.asyncHandler)(controllers_1.syncController.ingestExecutionSummary));
// ============================================
// TELEMETRY INGESTION
// ============================================
// Ingest forensic events (batch)
router.post('/telemetry/events', (0, middleware_1.authorize)(types_1.UserRole.SANDBOX_OPERATOR, types_1.UserRole.FORENSIC_ANALYST, types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, middleware_1.asyncHandler)(controllers_1.syncController.ingestTelemetry));
// Ingest real-time event stream
router.post('/telemetry/stream', (0, middleware_1.authorize)(types_1.UserRole.SANDBOX_OPERATOR, types_1.UserRole.FORENSIC_ANALYST, types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, middleware_1.asyncHandler)(controllers_1.syncController.ingestEventStream));
// Get telemetry summary
router.get('/telemetry/:sessionId', (0, middleware_1.authorize)(types_1.UserRole.SANDBOX_OPERATOR, types_1.UserRole.FORENSIC_ANALYST, types_1.UserRole.SECURITY_REVIEWER, types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, middleware_1.asyncHandler)(controllers_1.syncController.getTelemetrySummary));
// ============================================
// SANDBOX SESSION SYNC
// ============================================
// Rollback status report
router.post('/sessions/:sessionId/rollback', (0, middleware_1.authorize)(types_1.UserRole.SANDBOX_OPERATOR, types_1.UserRole.FORENSIC_ANALYST, types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, middleware_1.asyncHandler)(controllers_1.syncController.reportRollback));
// ============================================
// HEALTH & STATUS
// ============================================
// Get sync system health
router.get('/health', (0, middleware_1.asyncHandler)(controllers_1.syncController.getHealth));
exports.default = router;
//# sourceMappingURL=sync.routes.js.map