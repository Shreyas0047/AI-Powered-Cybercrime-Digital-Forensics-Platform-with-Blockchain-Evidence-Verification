/**
 * Synchronization Routes
 * /api/v1/sync
 *
 * Handles all sandbox-to-server synchronization endpoints
 */

import { Router, Request, Response, NextFunction } from 'express';
import { syncController } from '../controllers';
import { authenticate, authorize, requirePermission, asyncHandler } from '../middleware';
import { UserRole, Permission } from '../types';

const router = Router();

// All sync routes require authentication
router.use(authenticate);

// ============================================
// EVIDENCE UPLOAD
// ============================================

// Single evidence upload
router.post(
  '/evidence/upload',
  requirePermission(Permission.EVIDENCE_UPLOAD),
  (req: Request, res: Response, next: NextFunction) => {
    syncController.uploadEvidenceMiddleware(req, res, next);
  },
  asyncHandler(syncController.handleEvidenceUpload)
);

// Chunk upload for large files
router.post(
  '/evidence/upload-chunk',
  requirePermission(Permission.EVIDENCE_UPLOAD),
  (req: Request, res: Response, next: NextFunction) => {
    syncController.uploadChunkMiddleware(req, res, next);
  },
  asyncHandler(syncController.handleChunkUpload)
);

// Batch upload multiple files
router.post(
  '/evidence/batch',
  requirePermission(Permission.EVIDENCE_UPLOAD),
  (req: Request, res: Response, next: NextFunction) => {
    syncController.uploadBatchMiddleware(req, res, next);
  },
  asyncHandler(syncController.handleBatchUpload)
);

// ============================================
// FORENSIC REPORT INGESTION
// ============================================

// Ingest forensic report
router.post(
  '/reports/ingest',
  authorize(UserRole.SANDBOX_OPERATOR, UserRole.FORENSIC_ANALYST, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  (req: Request, res: Response, next: NextFunction) => {
    syncController.uploadEvidenceMiddleware(req, res, next);
  },
  asyncHandler(syncController.ingestReport)
);

// Ingest execution summary
router.post(
  '/reports/execution-summary',
  authorize(UserRole.SANDBOX_OPERATOR, UserRole.FORENSIC_ANALYST, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(syncController.ingestExecutionSummary)
);

// ============================================
// TELEMETRY INGESTION
// ============================================

// Ingest forensic events (batch)
router.post(
  '/telemetry/events',
  authorize(UserRole.SANDBOX_OPERATOR, UserRole.FORENSIC_ANALYST, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(syncController.ingestTelemetry)
);

// Ingest real-time event stream
router.post(
  '/telemetry/stream',
  authorize(UserRole.SANDBOX_OPERATOR, UserRole.FORENSIC_ANALYST, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(syncController.ingestEventStream)
);

// Get telemetry summary
router.get(
  '/telemetry/:sessionId',
  authorize(UserRole.SANDBOX_OPERATOR, UserRole.FORENSIC_ANALYST, UserRole.SECURITY_REVIEWER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(syncController.getTelemetrySummary)
);

// ============================================
// SANDBOX SESSION SYNC
// ============================================

// Session heartbeat
router.post(
  '/sessions/:sessionId/heartbeat',
  authorize(UserRole.SANDBOX_OPERATOR, UserRole.FORENSIC_ANALYST, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(syncController.sessionHeartbeat)
);

// Rollback status report
router.post(
  '/sessions/:sessionId/rollback',
  authorize(UserRole.SANDBOX_OPERATOR, UserRole.FORENSIC_ANALYST, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(syncController.reportRollback)
);

// ============================================
// HEALTH & STATUS
// ============================================

// Get sync system health
router.get(
  '/health',
  asyncHandler(syncController.getHealth)
);

export default router;