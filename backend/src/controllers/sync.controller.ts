/**
 * Synchronization Controller
 * Handles all sandbox-to-server synchronization endpoints
 */

import { Response } from 'express';
import multer from 'multer';
import path from 'path';
import {
  forensicIngestionService,
  telemetryIngestionService,
  syncStorageService,
  evidenceValidationService,
} from '../services';
import { AuthenticatedRequest } from '../middleware';
import { ApiResponse } from '../types';
import { config } from '../config';

// Configure secure upload storage
const syncStorage = multer.diskStorage({
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
const syncUpload = multer({
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
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

export class SyncController {
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
  async handleEvidenceUpload(req: AuthenticatedRequest, res: Response): Promise<void> {
    const file = req.file;
    if (!file) {
      res.status(400).json({
        success: false,
        message: 'No file uploaded',
      } as ApiResponse);
      return;
    }

    // Validate file first
    const validation = evidenceValidationService.validateFileUpload({
      mimetype: file.mimetype,
      originalname: file.originalname,
      size: file.size,
    });

    if (!validation.valid) {
      res.status(400).json({
        success: false,
        message: `Validation failed: ${validation.errors.join(', ')}`,
        data: { warnings: validation.warnings },
      } as ApiResponse);
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

    const result = await syncStorageService.secureUpload(file, metadata);

    const response: ApiResponse = {
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
  async handleChunkUpload(req: AuthenticatedRequest, res: Response): Promise<void> {
    const file = req.file;
    const { chunkIndex, totalChunks, fileId, investigationId } = req.body;

    if (!file) {
      res.status(400).json({ success: false, message: 'No chunk uploaded' } as ApiResponse);
      return;
    }

    // In a full implementation, this would handle chunk assembly
    // For now, we log the chunk receipt
    const response: ApiResponse = {
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
  async handleBatchUpload(req: AuthenticatedRequest, res: Response): Promise<void> {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ success: false, message: 'No files uploaded' } as ApiResponse);
      return;
    }

    const results = [];
    const errors = [];

    for (const file of files) {
      try {
        const validation = evidenceValidationService.validateFileUpload({
          mimetype: file.mimetype,
          originalname: file.originalname,
          size: file.size,
        });

        if (!validation.valid) {
          errors.push({ file: file.originalname, errors: validation.errors });
          continue;
        }

        const result = await syncStorageService.secureUpload(file, {
          investigationId: req.body.investigationId,
          sessionId: req.body.sessionId,
          collectedBy: req.user?.id,
          tags: ['batch-upload'],
        });

        results.push({ file: file.originalname, success: true, metadata: result.metadata });
      } catch (err) {
        errors.push({ file: file.originalname, error: (err as Error).message });
      }
    }

    const response: ApiResponse = {
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
  async ingestReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { investigationId, sessionId, reportType, reportData } = req.body;

    if (!reportType || !reportData) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: reportType, reportData',
      } as ApiResponse);
      return;
    }

    try {
      const result = await forensicIngestionService.ingestForensicReport(
        {
          investigationId,
          sessionId,
          reportType,
          reportData: JSON.parse(JSON.stringify(reportData)),
          uploadedBy: req.user?.id,
        },
        req.file
      );

      const response: ApiResponse = {
        success: true,
        message: 'Forensic report ingested successfully',
        data: {
          report: result.report,
          metadata: result.metadata,
          warnings: result.warnings,
        },
      };

      res.status(201).json(response);
    } catch (err) {
      res.status(400).json({
        success: false,
        message: (err as Error).message,
      } as ApiResponse);
    }
  }

  /**
   * POST /api/v1/sync/reports/execution-summary
   * Ingest execution summary from sandbox
   */
  async ingestExecutionSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { sessionId, summary } = req.body;

    if (!sessionId || !summary) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: sessionId, summary',
      } as ApiResponse);
      return;
    }

    try {
      const result = await forensicIngestionService.ingestExecutionSummary(
        sessionId,
        summary,
        req.user?.id
      );

      const response: ApiResponse = {
        success: true,
        message: 'Execution summary ingested',
        data: result,
      };

      res.json(response);
    } catch (err) {
      res.status(400).json({
        success: false,
        message: (err as Error).message,
      } as ApiResponse);
    }
  }

  // ============================================
  // TELEMETRY INGESTION
  // ============================================

  /**
   * POST /api/v1/sync/telemetry/events
   * Ingest forensic telemetry events
   */
  async ingestTelemetry(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { sessionId, events } = req.body;

    if (!sessionId || !events || !Array.isArray(events)) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: sessionId, events (array)',
      } as ApiResponse);
      return;
    }

    try {
      const result = await telemetryIngestionService.ingestTelemetry(
        { sessionId, events },
        req.user?.id
      );

      const response: ApiResponse = {
        success: true,
        message: 'Telemetry ingested successfully',
        data: result,
      };

      res.json(response);
    } catch (err) {
      res.status(400).json({
        success: false,
        message: (err as Error).message,
      } as ApiResponse);
    }
  }

  /**
   * POST /api/v1/sync/telemetry/stream
   * Ingest real-time event stream
   */
  async ingestEventStream(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { sessionId, event } = req.body;

    if (!sessionId || !event) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: sessionId, event',
      } as ApiResponse);
      return;
    }

    try {
      const result = await telemetryIngestionService.ingestEventStream(
        sessionId,
        event,
        req.user?.id
      );

      const response: ApiResponse = {
        success: true,
        message: 'Event stream ingested',
        data: result,
      };

      res.json(response);
    } catch (err) {
      res.status(400).json({
        success: false,
        message: (err as Error).message,
      } as ApiResponse);
    }
  }

  /**
   * GET /api/v1/sync/telemetry/:sessionId
   * Get telemetry summary for session
   */
  async getTelemetrySummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { sessionId } = req.params;

    try {
      const summary = await telemetryIngestionService.getTelemetrySummary(sessionId);

      const response: ApiResponse = {
        success: true,
        message: 'Telemetry summary retrieved',
        data: { summary },
      };

      res.json(response);
    } catch (err) {
      res.status(400).json({
        success: false,
        message: (err as Error).message,
      } as ApiResponse);
    }
  }

  // ============================================
  // SANDBOX SESSION SYNC
  // ============================================

  /**
   * POST /api/v1/sync/sessions/:sessionId/heartbeat
   * Receive sandbox heartbeat
   */
  async sessionHeartbeat(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { sessionId } = req.params;
    const { status, vmState, memoryUsage, cpuUsage } = req.body;

    try {
      const { SandboxSession } = await import('../models');
      const session = await SandboxSession.findOne({ sessionId });

      if (!session) {
        res.status(404).json({
          success: false,
          message: 'Session not found',
        } as ApiResponse);
        return;
      }

      // Update session with heartbeat data
      (session as any).lastHeartbeat = new Date();
      (session as any).vmState = vmState;
      (session as any).memoryUsage = memoryUsage;
      (session as any).cpuUsage = cpuUsage;

      await session.save();

      const response: ApiResponse = {
        success: true,
        message: 'Heartbeat received',
        data: { sessionId, status: session.status },
      };

      res.json(response);
    } catch (err) {
      res.status(400).json({
        success: false,
        message: (err as Error).message,
      } as ApiResponse);
    }
  }

  /**
   * POST /api/v1/sync/sessions/:sessionId/rollback
   * Report rollback status
   */
  async reportRollback(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { sessionId } = req.params;
    const { success, snapshotRestored, errors } = req.body;

    try {
      const { SandboxSession } = await import('../models');
      const session = await SandboxSession.findOne({ sessionId });

      if (!session) {
        res.status(404).json({
          success: false,
          message: 'Session not found',
        } as ApiResponse);
        return;
      }

      // Update session with rollback info
      (session as any).rollbackStatus = {
        completed: true,
        success,
        snapshotRestored,
        errors: errors || [],
        completedAt: new Date(),
      };

      await session.save();

      // Log to audit
      const { AuditLog } = await import('../models');
      await AuditLog.create({
        userId: req.user?.id || 'system',
        action: 'ROLLBACK_COMPLETED',
        resourceType: 'sandbox_session',
        resourceId: session._id.toString(),
        details: { sessionId, success, snapshotRestored },
        ipAddress: 'system',
      });

      const response: ApiResponse = {
        success: true,
        message: 'Rollback status recorded',
        data: { sessionId, success },
      };

      res.json(response);
    } catch (err) {
      res.status(400).json({
        success: false,
        message: (err as Error).message,
      } as ApiResponse);
    }
  }

  // ============================================
  // HEALTH & STATUS
  // ============================================

  /**
   * GET /api/v1/sync/health
   * Get sync system health
   */
  async getHealth(req: AuthenticatedRequest, res: Response): Promise<void> {
    // Check storage availability
    const fs = require('fs');
    const storageCheck = {
      evidencePath: fs.existsSync(config.evidence.path),
      reportsPath: fs.existsSync(config.evidence.reportsPath),
      logsPath: fs.existsSync(config.evidence.sandboxLogsPath),
    };

    const response: ApiResponse = {
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

export const syncController = new SyncController();
export default syncController;