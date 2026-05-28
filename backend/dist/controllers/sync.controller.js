"use strict";
/**
 * Synchronization Controller
 * Handles all sandbox-to-server synchronization endpoints
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
exports.syncController = exports.SyncController = void 0;
const multer_1 = __importDefault(require("multer"));
const services_1 = require("../services");
const config_1 = require("../config");
// Configure secure upload storage
const syncStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const tempDir = './uploads/sync/temp';
        const fs = require('fs');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        cb(null, tempDir);
    },
    filename: (req, file, cb) => {
        const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + '-' + safeName);
    },
});
// Upload middleware with size and type limits
const syncUpload = (0, multer_1.default)({
    storage: syncStorage,
    limits: {
        fileSize: 500 * 1024 * 1024, // 500MB max for sync uploads
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = [
            'application/json',
            'application/zip',
            'application/pdf',
            'text/plain',
            'image/png',
            'image/jpeg',
            'application/octet-stream',
        ];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error(`Unsupported file type: ${file.mimetype}`));
        }
    },
});
class SyncController {
    // ============================================
    // MULTER MIDDLEWARE EXPORTS
    // ============================================
    uploadEvidenceMiddleware = syncUpload.single('file');
    uploadChunkMiddleware = syncUpload.single('chunk');
    uploadBatchMiddleware = syncUpload.array('files', 10);
    // ============================================
    // EVIDENCE UPLOAD ENDPOINTS
    // ============================================
    /**
     * POST /api/v1/sync/evidence/upload
     * Upload evidence file via sync
     */
    async handleEvidenceUpload(req, res) {
        const file = req.file;
        if (!file) {
            res.status(400).json({
                success: false,
                message: 'No file uploaded',
            });
            return;
        }
        // Validate file first
        const validation = services_1.evidenceValidationService.validateFileUpload({
            mimetype: file.mimetype,
            originalname: file.originalname,
            size: file.size,
        });
        if (!validation.valid) {
            res.status(400).json({
                success: false,
                message: `Validation failed: ${validation.errors.join(', ')}`,
                data: { warnings: validation.warnings },
            });
            return;
        }
        // Extract metadata from body
        const metadata = {
            investigationId: req.body.investigationId,
            sessionId: req.body.sessionId,
            name: req.body.name,
            description: req.body.description,
            type: req.body.type,
            collectedBy: req.user?.id,
            tags: req.body.tags ? JSON.parse(req.body.tags) : [],
            collectedAt: req.body.collectedAt ? new Date(req.body.collectedAt) : undefined,
        };
        const result = await services_1.syncStorageService.secureUpload(file, metadata);
        const response = {
            success: result.success,
            message: result.success ? 'Evidence uploaded successfully' : 'Upload failed',
            data: {
                evidence: result.evidence,
                metadata: result.metadata,
                validationWarnings: validation.warnings,
            },
        };
        res.status(result.success ? 201 : 400).json(response);
    }
    /**
     * POST /api/v1/sync/evidence/upload-chunk
     * Upload large evidence in chunks
     */
    async handleChunkUpload(req, res) {
        const file = req.file;
        const { chunkIndex, totalChunks, fileId, investigationId } = req.body;
        if (!file) {
            res.status(400).json({ success: false, message: 'No chunk uploaded' });
            return;
        }
        // In a full implementation, this would handle chunk assembly
        // For now, we log the chunk receipt
        const response = {
            success: true,
            message: `Chunk ${chunkIndex} of ${totalChunks} received`,
            data: {
                chunkIndex: Number(chunkIndex),
                totalChunks: Number(totalChunks),
                fileId,
            },
        };
        res.json(response);
    }
    /**
     * POST /api/v1/sync/evidence/batch
     * Batch upload multiple evidence files
     */
    async handleBatchUpload(req, res) {
        const files = req.files;
        if (!files || files.length === 0) {
            res.status(400).json({ success: false, message: 'No files uploaded' });
            return;
        }
        const results = [];
        const errors = [];
        for (const file of files) {
            try {
                const validation = services_1.evidenceValidationService.validateFileUpload({
                    mimetype: file.mimetype,
                    originalname: file.originalname,
                    size: file.size,
                });
                if (!validation.valid) {
                    errors.push({ file: file.originalname, errors: validation.errors });
                    continue;
                }
                const result = await services_1.syncStorageService.secureUpload(file, {
                    investigationId: req.body.investigationId,
                    sessionId: req.body.sessionId,
                    collectedBy: req.user?.id,
                    tags: ['batch-upload'],
                });
                results.push({ file: file.originalname, success: true, metadata: result.metadata });
            }
            catch (err) {
                errors.push({ file: file.originalname, error: err.message });
            }
        }
        const response = {
            success: errors.length === 0,
            message: `Batch upload complete: ${results.length} succeeded, ${errors.length} failed`,
            data: {
                succeeded: results,
                failed: errors,
            },
        };
        res.status(errors.length === 0 ? 201 : 207).json(response);
    }
    // ============================================
    // FORENSIC REPORT INGESTION
    // ============================================
    /**
     * POST /api/v1/sync/reports/ingest
     * Ingest forensic report from sandbox
     */
    async ingestReport(req, res) {
        const { investigationId, sessionId, reportType, reportData } = req.body;
        if (!reportType || !reportData) {
            res.status(400).json({
                success: false,
                message: 'Missing required fields: reportType, reportData',
            });
            return;
        }
        try {
            const result = await services_1.forensicIngestionService.ingestForensicReport({
                investigationId,
                sessionId,
                reportType,
                reportData: JSON.parse(JSON.stringify(reportData)),
                uploadedBy: req.user?.id,
            }, req.file);
            const response = {
                success: true,
                message: 'Forensic report ingested successfully',
                data: {
                    report: result.report,
                    metadata: result.metadata,
                    warnings: result.warnings,
                },
            };
            res.status(201).json(response);
        }
        catch (err) {
            res.status(400).json({
                success: false,
                message: err.message,
            });
        }
    }
    /**
     * POST /api/v1/sync/reports/execution-summary
     * Ingest execution summary from sandbox
     */
    async ingestExecutionSummary(req, res) {
        const { sessionId, summary } = req.body;
        if (!sessionId || !summary) {
            res.status(400).json({
                success: false,
                message: 'Missing required fields: sessionId, summary',
            });
            return;
        }
        try {
            const result = await services_1.forensicIngestionService.ingestExecutionSummary(sessionId, summary, req.user?.id);
            const response = {
                success: true,
                message: 'Execution summary ingested',
                data: result,
            };
            res.json(response);
        }
        catch (err) {
            res.status(400).json({
                success: false,
                message: err.message,
            });
        }
    }
    // ============================================
    // TELEMETRY INGESTION
    // ============================================
    /**
     * POST /api/v1/sync/telemetry/events
     * Ingest forensic telemetry events
     */
    async ingestTelemetry(req, res) {
        const { sessionId, events } = req.body;
        if (!sessionId || !events || !Array.isArray(events)) {
            res.status(400).json({
                success: false,
                message: 'Missing required fields: sessionId, events (array)',
            });
            return;
        }
        try {
            const result = await services_1.telemetryIngestionService.ingestTelemetry({ sessionId, events }, req.user?.id);
            const response = {
                success: true,
                message: 'Telemetry ingested successfully',
                data: result,
            };
            res.json(response);
        }
        catch (err) {
            res.status(400).json({
                success: false,
                message: err.message,
            });
        }
    }
    /**
     * POST /api/v1/sync/telemetry/stream
     * Ingest real-time event stream
     */
    async ingestEventStream(req, res) {
        const { sessionId, event } = req.body;
        if (!sessionId || !event) {
            res.status(400).json({
                success: false,
                message: 'Missing required fields: sessionId, event',
            });
            return;
        }
        try {
            const result = await services_1.telemetryIngestionService.ingestEventStream(sessionId, event, req.user?.id);
            const response = {
                success: true,
                message: 'Event stream ingested',
                data: result,
            };
            res.json(response);
        }
        catch (err) {
            res.status(400).json({
                success: false,
                message: err.message,
            });
        }
    }
    /**
     * GET /api/v1/sync/telemetry/:sessionId
     * Get telemetry summary for session
     */
    async getTelemetrySummary(req, res) {
        const { sessionId } = req.params;
        try {
            const summary = await services_1.telemetryIngestionService.getTelemetrySummary(sessionId);
            const response = {
                success: true,
                message: 'Telemetry summary retrieved',
                data: { summary },
            };
            res.json(response);
        }
        catch (err) {
            res.status(400).json({
                success: false,
                message: err.message,
            });
        }
    }
    // ============================================
    // SANDBOX SESSION SYNC
    // ============================================
    /**
     * POST /api/v1/sync/sessions/:sessionId/heartbeat
     * Receive sandbox heartbeat
     */
    async sessionHeartbeat(req, res) {
        const { sessionId } = req.params;
        const { status, vmState, memoryUsage, cpuUsage } = req.body;
        try {
            const { SandboxSession } = await Promise.resolve().then(() => __importStar(require('../models')));
            const session = await SandboxSession.findOne({ sessionId });
            if (!session) {
                res.status(404).json({
                    success: false,
                    message: 'Session not found',
                });
                return;
            }
            // Update session with heartbeat data
            session.lastHeartbeat = new Date();
            // Allow agent to push status updates (e.g., mark as failed on shutdown)
            if (status) {
                session.status = status;
            }
            session.vmState = vmState;
            session.memoryUsage = memoryUsage;
            session.cpuUsage = cpuUsage;
            await session.save();
            const response = {
                success: true,
                message: 'Heartbeat received',
                data: { sessionId, status: session.status },
            };
            res.json(response);
        }
        catch (err) {
            res.status(400).json({
                success: false,
                message: err.message,
            });
        }
    }
    /**
     * POST /api/v1/sync/sessions/:sessionId/rollback
     * Report rollback status
     */
    async reportRollback(req, res) {
        const { sessionId } = req.params;
        const { success, snapshotRestored, errors } = req.body;
        try {
            const { SandboxSession } = await Promise.resolve().then(() => __importStar(require('../models')));
            const session = await SandboxSession.findOne({ sessionId });
            if (!session) {
                res.status(404).json({
                    success: false,
                    message: 'Session not found',
                });
                return;
            }
            // Update session with rollback info
            session.rollbackStatus = {
                completed: true,
                success,
                snapshotRestored,
                errors: errors || [],
                completedAt: new Date(),
            };
            await session.save();
            // Log to audit
            const { AuditLog } = await Promise.resolve().then(() => __importStar(require('../models')));
            await AuditLog.create({
                userId: req.user?.id || 'system',
                action: 'ROLLBACK_COMPLETED',
                resourceType: 'sandbox_session',
                resourceId: session._id.toString(),
                details: { sessionId, success, snapshotRestored },
                ipAddress: 'system',
            });
            const response = {
                success: true,
                message: 'Rollback status recorded',
                data: { sessionId, success },
            };
            res.json(response);
        }
        catch (err) {
            res.status(400).json({
                success: false,
                message: err.message,
            });
        }
    }
    // ============================================
    // HEALTH & STATUS
    // ============================================
    /**
     * GET /api/v1/sync/health
     * Get sync system health
     */
    async getHealth(req, res) {
        // Check storage availability
        const fs = require('fs');
        const storageCheck = {
            evidencePath: fs.existsSync(config_1.config.evidence.path),
            reportsPath: fs.existsSync(config_1.config.evidence.reportsPath),
            logsPath: fs.existsSync(config_1.config.evidence.sandboxLogsPath),
        };
        const response = {
            success: true,
            message: 'Sync system healthy',
            data: {
                status: 'operational',
                storage: storageCheck,
                timestamp: new Date(),
            },
        };
        res.json(response);
    }
}
exports.SyncController = SyncController;
exports.syncController = new SyncController();
exports.default = exports.syncController;
//# sourceMappingURL=sync.controller.js.map