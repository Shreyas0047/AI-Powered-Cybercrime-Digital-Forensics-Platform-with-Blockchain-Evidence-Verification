/**
 * Secure Storage & Synchronization Service
 * Handles secure file storage, metadata extraction, and evidence workflows
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Evidence, Investigation, SandboxSession, AuditLog, EvidenceType, EvidenceSource, EvidenceStatus } from '../models';
import { EvidenceType as EvidenceTypeEnum } from '../types';
import { NotFoundError, ValidationError } from '../middleware';
import { config } from '../config';
import { v4 as uuidv4 } from 'uuid';

export interface SecureUploadResult {
  success: boolean;
  evidence?: any;
  metadata: UploadMetadata;
  errors: string[];
}

export interface UploadMetadata {
  fileId: string;
  originalName: string;
  storedName: string;
  size: number;
  mimeType: string;
  sha256?: string;
  md5?: string;
  uploadedAt: Date;
  investigationId?: string;
  sessionId?: string;
  tags: string[];
}

export interface FileMetadata {
  originalName: string;
  extension: string;
  mimeType: string;
  size: number;
  createdAt?: Date;
  modifiedAt?: Date;
  encoding?: string;
}

export class SyncStorageService {
  /**
   * Initialize storage directories
   */
  initializeStorage(): void {
    const dirs = [
      config.evidence.path,
      config.evidence.reportsPath,
      config.evidence.sandboxLogsPath,
      './uploads/sync/temp',
      './uploads/sync/quarantine',
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Secure upload evidence file
   */
  async secureUpload(
    file: Express.Multer.File,
    metadata: {
      investigationId?: string;
      sessionId?: string;
      name?: string;
      description?: string;
      type?: EvidenceType;
      source?: EvidenceSource;
      collectedBy?: string;
      tags?: string[];
      collectedAt?: Date;
    }
  ): Promise<SecureUploadResult> {
    const errors: string[] = [];

    // Validate investigation if provided
    let investigation = null;
    if (metadata.investigationId) {
      investigation = await Investigation.findById(metadata.investigationId);
      if (!investigation) {
        errors.push(`Investigation not found: ${metadata.investigationId}`);
        return { success: false, metadata: {} as UploadMetadata, errors };
      }
    }

    // Validate session if provided
    let session = null;
    if (metadata.sessionId) {
      session = await SandboxSession.findOne({ sessionId: metadata.sessionId });
      if (!session) {
        errors.push(`Session not found: ${metadata.sessionId}`);
        return { success: false, metadata: {} as UploadMetadata, errors };
      }
    }

    // Generate unique file ID and safe filename
    const fileId = uuidv4();
    const originalExt = path.extname(file.originalname).toLowerCase();
    const safeFilename = `${fileId}${originalExt}`;

    // Determine storage path based on type
    const storagePath = this.determineStoragePath(metadata.type, metadata.sessionId);
    const destPath = path.join(storagePath, safeFilename);

    // Move file to storage
    try {
      // Ensure directory exists
      if (!fs.existsSync(storagePath)) {
        fs.mkdirSync(storagePath, { recursive: true });
      }

      // Move file from temp to final location
      fs.renameSync(file.path, destPath);
    } catch (err) {
      errors.push(`Failed to store file: ${(err as Error).message}`);
      return { success: false, metadata: {} as UploadMetadata, errors };
    }

    // Calculate file hashes
    const hashes = await this.calculateFileHashes(destPath);

    // Extract file metadata
    const fileMetadata = await this.extractFileMetadata(destPath, file);

    // Create evidence record
    const evidence = await Evidence.create({
      evidenceId: this.generateEvidenceId(),
      investigationId: metadata.investigationId,
      name: metadata.name || file.originalname,
      description: metadata.description,
      type: metadata.type || this.detectEvidenceType(file.mimetype),
      source: metadata.source || EvidenceSource.SANDBOX_EXECUTION,
      status: EvidenceStatus.READY,

      filePath: destPath,
      fileName: safeFilename,
      fileSize: file.size,
      mimeType: file.mimetype,

      hash: {
        sha256: hashes.sha256,
        md5: hashes.md5,
      },
      fileMetadata: {
        originalName: file.originalname,
        extension: originalExt,
        mimeType: file.mimetype,
        size: file.size,
      },

      collectedAt: metadata.collectedAt || new Date(),
      collectedBy: metadata.collectedBy,
      uploadedAt: new Date(),
      uploadedBy: metadata.collectedBy,

      tags: metadata.tags || [],

      // Link to sandbox session
      sandboxSessionId: session?._id,

      // Chain of custody
      chainOfCustody: [
        {
          timestamp: new Date(),
          action: 'uploaded',
          userId: metadata.collectedBy || 'system',
          userName: 'System',
          details: `Evidence uploaded: ${file.originalname} (${file.size} bytes)`,
          location: destPath,
          hash: hashes.sha256,
        },
      ],

      custodyComplete: true,
    });

    // Update investigation if linked
    if (investigation) {
      investigation.evidenceIds.push(evidence._id);
      investigation.evidenceCount = (investigation.evidenceCount || 0) + 1;

      investigation.timeline.push({
        timestamp: new Date(),
        action: 'evidence_uploaded',
        userId: metadata.collectedBy || 'system',
        userName: 'System',
        details: `Evidence "${evidence.name}" uploaded via sync`,
      });

      await investigation.save();
    }

    // Log to audit
    await AuditLog.create({
      userId: metadata.collectedBy || 'system',
      action: 'EVIDENCE_UPLOADED',
      resourceType: 'evidence',
      resourceId: evidence._id.toString(),
      details: {
        fileId,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        investigationId: metadata.investigationId,
        sessionId: metadata.sessionId,
        sha256: hashes.sha256,
      },
      ipAddress: 'system',
    });

    const uploadMetadata: UploadMetadata = {
      fileId,
      originalName: file.originalname,
      storedName: safeFilename,
      size: file.size,
      mimeType: file.mimetype,
      sha256: hashes.sha256,
      md5: hashes.md5,
      uploadedAt: new Date(),
      investigationId: metadata.investigationId,
      sessionId: metadata.sessionId,
      tags: metadata.tags || [],
    };

    return {
      success: true,
      evidence,
      metadata: uploadMetadata,
      errors: [],
    };
  }

  /**
   * Upload forensic artifact (JSON, log, etc.)
   */
  async uploadArtifact(
    file: Express.Multer.File,
    metadata: {
      investigationId?: string;
      sessionId?: string;
      artifactType: string;
      collectedBy?: string;
      tags?: string[];
    }
  ): Promise<SecureUploadResult> {
    // For JSON files, parse and validate structure
    if (file.mimetype === 'application/json' || file.originalname.endsWith('.json')) {
      try {
        const content = JSON.parse(fs.readFileSync(file.path, 'utf-8'));
        // Add parsed content metadata
        metadata.tags = [...(metadata.tags || []), `type:${metadata.artifactType}`];

        if (content.findings) metadata.tags.push('has-findings');
        if (content.iocIndicators) metadata.tags.push('has-ioc');
        if (content.events) metadata.tags.push('has-events');
      } catch {
        // Not valid JSON, continue anyway
        metadata.tags = [...(metadata.tags || []), 'parse-warning'];
      }
    }

    return this.secureUpload(file, {
      ...metadata,
      type: EvidenceType.FILE,
      source: EvidenceSource.SANDBOX_EXECUTION,
    });
  }

  /**
   * Get evidence file by ID
   */
  async getEvidenceFile(evidenceId: string): Promise<{
    path: string;
    name: string;
    mimeType: string;
  }> {
    const evidence = await Evidence.findById(evidenceId);
    if (!evidence) {
      throw new NotFoundError('Evidence');
    }

    return {
      path: evidence.filePath,
      name: evidence.name,
      mimeType: evidence.mimeType,
    };
  }

  /**
   * Delete evidence file
   */
  async deleteEvidenceFile(evidenceId: string, deletedBy?: string): Promise<void> {
    const evidence = await Evidence.findById(evidenceId);
    if (!evidence) {
      throw new NotFoundError('Evidence');
    }

    // Check if file exists and delete
    if (fs.existsSync(evidence.filePath)) {
      fs.unlinkSync(evidence.filePath);
    }

    // Update investigation count
    if (evidence.investigationId) {
      await Investigation.updateOne(
        { _id: evidence.investigationId },
        { $inc: { evidenceCount: -1 } }
      );
    }

    // Log to audit
    await AuditLog.create({
      userId: deletedBy || 'system',
      action: 'EVIDENCE_DELETED',
      resourceType: 'evidence',
      resourceId: evidenceId,
      details: {
        evidenceId: evidence.evidenceId,
        name: evidence.name,
        investigationId: evidence.investigationId,
      },
      ipAddress: 'system',
    });

    await Evidence.findByIdAndDelete(evidenceId);
  }

  /**
   * Extract metadata from file
   */
  private async extractFileMetadata(filePath: string, file: Express.Multer.File): Promise<FileMetadata> {
    const stats = fs.statSync(filePath);

    return {
      originalName: file.originalname,
      extension: path.extname(file.originalname).toLowerCase(),
      mimeType: file.mimetype,
      size: file.size,
      modifiedAt: stats.mtime,
    };
  }

  /**
   * Calculate file hashes
   */
  private async calculateFileHashes(filePath: string): Promise<{ sha256: string; md5: string }> {
    return new Promise((resolve, reject) => {
      const sha256Hash = crypto.createHash('sha256');
      const md5Hash = crypto.createHash('md5');
      const stream = fs.createReadStream(filePath);

      stream.on('data', (data) => {
        sha256Hash.update(data);
        md5Hash.update(data);
      });

      stream.on('end', () => {
        resolve({
          sha256: sha256Hash.digest('hex'),
          md5: md5Hash.digest('hex'),
        });
      });

      stream.on('error', reject);
    });
  }

  /**
   * Determine storage path based on evidence type
   */
  private determineStoragePath(type?: EvidenceType, sessionId?: string): string {
    let basePath = config.evidence.path;

    if (type === EvidenceType.REPORT) {
      basePath = config.evidence.reportsPath;
    } else if (sessionId) {
      basePath = path.join(config.evidence.sandboxLogsPath, sessionId);
    }

    return basePath;
  }

  /**
   * Detect evidence type from MIME type
   */
  private detectEvidenceType(mimeType: string): EvidenceType {
    const typeMap: Record<string, EvidenceType> = {
      'application/json': EvidenceType.FILE,
      'text/plain': EvidenceType.LOG,
      'image/png': EvidenceType.SCREENSHOT,
      'image/jpeg': EvidenceType.SCREENSHOT,
      'application/pdf': EvidenceType.REPORT,
      'application/zip': EvidenceType.PACKAGE,
    };

    return typeMap[mimeType] || EvidenceType.OTHER;
  }

  /**
   * Generate evidence ID
   */
  private generateEvidenceId(): string {
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = uuidv4().slice(0, 8).toUpperCase();
    return `EV-${timestamp}-${random}`;
  }
}

export const syncStorageService = new SyncStorageService();
export default syncStorageService;