"use strict";
/**
 * Secure Storage & Synchronization Service
 * Handles secure file storage, metadata extraction, and evidence workflows
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncStorageService = exports.SyncStorageService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const models_1 = require("../models");
const middleware_1 = require("../middleware");
const config_1 = require("../config");
const uuid_1 = require("uuid");
class SyncStorageService {
    /**
     * Initialize storage directories
     */
    initializeStorage() {
        const dirs = [
            config_1.config.evidence.path,
            config_1.config.evidence.reportsPath,
            config_1.config.evidence.sandboxLogsPath,
            './uploads/sync/temp',
            './uploads/sync/quarantine',
        ];
        dirs.forEach(dir => {
            if (!fs_1.default.existsSync(dir)) {
                fs_1.default.mkdirSync(dir, { recursive: true });
            }
        });
    }
    /**
     * Secure upload evidence file
     */
    async secureUpload(file, metadata) {
        const errors = [];
        // Validate investigation if provided
        let investigation = null;
        if (metadata.investigationId) {
            investigation = await models_1.Investigation.findById(metadata.investigationId);
            if (!investigation) {
                errors.push(`Investigation not found: ${metadata.investigationId}`);
                return { success: false, metadata: {}, errors };
            }
        }
        // Validate session if provided
        let session = null;
        if (metadata.sessionId) {
            session = await models_1.SandboxSession.findOne({ sessionId: metadata.sessionId });
            if (!session) {
                errors.push(`Session not found: ${metadata.sessionId}`);
                return { success: false, metadata: {}, errors };
            }
        }
        // Generate unique file ID and safe filename
        const fileId = (0, uuid_1.v4)();
        const originalExt = path_1.default.extname(file.originalname).toLowerCase();
        const safeFilename = `${fileId}${originalExt}`;
        // Determine storage path based on type
        const storagePath = this.determineStoragePath(metadata.type, metadata.sessionId);
        const destPath = path_1.default.join(storagePath, safeFilename);
        // Move file to storage
        try {
            // Ensure directory exists
            if (!fs_1.default.existsSync(storagePath)) {
                fs_1.default.mkdirSync(storagePath, { recursive: true });
            }
            // Move file from temp to final location
            fs_1.default.renameSync(file.path, destPath);
        }
        catch (err) {
            errors.push(`Failed to store file: ${err.message}`);
            return { success: false, metadata: {}, errors };
        }
        // Calculate file hashes
        const hashes = await this.calculateFileHashes(destPath);
        // Extract file metadata
        const fileMetadata = await this.extractFileMetadata(destPath, file);
        // Create evidence record
        const evidence = await models_1.Evidence.create({
            evidenceId: this.generateEvidenceId(),
            investigationId: metadata.investigationId,
            name: metadata.name || file.originalname,
            description: metadata.description,
            type: metadata.type || this.detectEvidenceType(file.mimetype),
            source: metadata.source || models_1.EvidenceSource.SANDBOX_EXECUTION,
            status: models_1.EvidenceStatus.READY,
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
        await models_1.AuditLog.create({
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
        const uploadMetadata = {
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
    async uploadArtifact(file, metadata) {
        // For JSON files, parse and validate structure
        if (file.mimetype === 'application/json' || file.originalname.endsWith('.json')) {
            try {
                const content = JSON.parse(fs_1.default.readFileSync(file.path, 'utf-8'));
                // Add parsed content metadata
                metadata.tags = [...(metadata.tags || []), `type:${metadata.artifactType}`];
                if (content.findings)
                    metadata.tags.push('has-findings');
                if (content.iocIndicators)
                    metadata.tags.push('has-ioc');
                if (content.events)
                    metadata.tags.push('has-events');
            }
            catch {
                // Not valid JSON, continue anyway
                metadata.tags = [...(metadata.tags || []), 'parse-warning'];
            }
        }
        return this.secureUpload(file, {
            ...metadata,
            type: models_1.EvidenceType.FILE,
            source: models_1.EvidenceSource.SANDBOX_EXECUTION,
        });
    }
    /**
     * Get evidence file by ID
     */
    async getEvidenceFile(evidenceId) {
        const evidence = await models_1.Evidence.findById(evidenceId);
        if (!evidence) {
            throw new middleware_1.NotFoundError('Evidence');
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
    async deleteEvidenceFile(evidenceId, deletedBy) {
        const evidence = await models_1.Evidence.findById(evidenceId);
        if (!evidence) {
            throw new middleware_1.NotFoundError('Evidence');
        }
        // Check if file exists and delete
        if (fs_1.default.existsSync(evidence.filePath)) {
            fs_1.default.unlinkSync(evidence.filePath);
        }
        // Update investigation count
        if (evidence.investigationId) {
            await models_1.Investigation.updateOne({ _id: evidence.investigationId }, { $inc: { evidenceCount: -1 } });
        }
        // Log to audit
        await models_1.AuditLog.create({
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
        await models_1.Evidence.findByIdAndDelete(evidenceId);
    }
    /**
     * Extract metadata from file
     */
    async extractFileMetadata(filePath, file) {
        const stats = fs_1.default.statSync(filePath);
        return {
            originalName: file.originalname,
            extension: path_1.default.extname(file.originalname).toLowerCase(),
            mimeType: file.mimetype,
            size: file.size,
            modifiedAt: stats.mtime,
        };
    }
    /**
     * Calculate file hashes
     */
    async calculateFileHashes(filePath) {
        return new Promise((resolve, reject) => {
            const sha256Hash = crypto_1.default.createHash('sha256');
            const md5Hash = crypto_1.default.createHash('md5');
            const stream = fs_1.default.createReadStream(filePath);
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
    determineStoragePath(type, sessionId) {
        let basePath = config_1.config.evidence.path;
        if (type === models_1.EvidenceType.REPORT) {
            basePath = config_1.config.evidence.reportsPath;
        }
        else if (sessionId) {
            basePath = path_1.default.join(config_1.config.evidence.sandboxLogsPath, sessionId);
        }
        return basePath;
    }
    /**
     * Detect evidence type from MIME type
     */
    detectEvidenceType(mimeType) {
        const typeMap = {
            'application/json': models_1.EvidenceType.FILE,
            'text/plain': models_1.EvidenceType.LOG,
            'image/png': models_1.EvidenceType.SCREENSHOT,
            'image/jpeg': models_1.EvidenceType.SCREENSHOT,
            'application/pdf': models_1.EvidenceType.REPORT,
            'application/zip': models_1.EvidenceType.PACKAGE,
        };
        return typeMap[mimeType] || models_1.EvidenceType.OTHER;
    }
    /**
     * Generate evidence ID
     */
    generateEvidenceId() {
        const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const random = (0, uuid_1.v4)().slice(0, 8).toUpperCase();
        return `EV-${timestamp}-${random}`;
    }
}
exports.SyncStorageService = SyncStorageService;
exports.syncStorageService = new SyncStorageService();
exports.default = exports.syncStorageService;
//# sourceMappingURL=sync-storage.service.js.map