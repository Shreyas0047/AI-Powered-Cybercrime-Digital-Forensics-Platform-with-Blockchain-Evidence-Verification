"use strict";
/**
 * Blockchain Service - Main Orchestrator
 * Coordinates all blockchain verification operations
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
exports.blockchainVerificationService = exports.BlockchainVerificationService = void 0;
const logger_1 = __importDefault(require("../config/logger"));
const types_1 = require("./types");
const blockchain_service_1 = require("./blockchain.service");
const hashing_service_1 = require("./hashing.service");
const verification_service_1 = require("./verification.service");
const blockchain_model_1 = require("./models/blockchain.model");
const uuid_1 = require("uuid");
class BlockchainVerificationService {
    /**
     * Initialize blockchain service
     */
    async initialize() {
        await blockchain_service_1.blockchainService.initialize();
        logger_1.default.info('[BlockchainVerification] Service initialized');
    }
    /**
     * Register evidence for blockchain verification
     */
    async registerEvidence(evidenceId, filePath, userId) {
        // Generate evidence fingerprint
        const fingerprint = await hashing_service_1.evidenceHashingService.generateFileFingerprint(filePath);
        // Create blockchain verification record
        const blockchainVerification = await blockchain_model_1.BlockchainVerification.create({
            evidenceId,
            fingerprint,
            algorithm: 'sha256',
            status: blockchain_model_1.BlockchainVerificationStatus.PENDING,
            verifiedBy: userId,
        });
        // Create integrity record
        const integrityRecord = await blockchain_model_1.EvidenceIntegrity.create({
            evidenceId,
            currentHash: fingerprint,
            integrityState: types_1.EvidenceIntegrityState.UNKNOWN,
        });
        // Add audit entry
        await this.addAuditEntry(evidenceId, types_1.BlockchainEventType.EVIDENCE_REGISTERED, `Evidence ${evidenceId} registered for blockchain verification`, userId, { fingerprint });
        return { fingerprint, blockchainVerification, integrityRecord };
    }
    /**
     * Verify evidence integrity
     */
    async verifyEvidence(evidenceId, filePath, userId) {
        // Get current verification record
        const blockchainVerification = await blockchain_model_1.BlockchainVerification.findOne({ evidenceId });
        if (!blockchainVerification) {
            throw new Error(`No blockchain verification record found for evidence ${evidenceId}`);
        }
        // Perform verification
        const result = await verification_service_1.verificationService.verifyEvidence(evidenceId, filePath, blockchainVerification.fingerprint, userId);
        // Update blockchain verification record
        blockchainVerification.verificationResult = result.status === types_1.VerificationStatus.VERIFIED;
        blockchainVerification.verifiedAt = new Date();
        blockchainVerification.verifiedBy = userId;
        blockchainVerification.status = result.status;
        await blockchainVerification.save();
        // Update or create integrity record
        let integrityRecord = await blockchain_model_1.EvidenceIntegrity.findOne({ evidenceId });
        if (integrityRecord) {
            integrityRecord.currentHash = result.currentHash;
            integrityRecord.integrityState = result.integrityState;
            integrityRecord.lastVerifiedAt = new Date();
            integrityRecord.lastVerificationStatus = result.status;
            integrityRecord.verificationHistory.push({
                id: (0, uuid_1.v4)(),
                timestamp: new Date(),
                hash: result.currentHash,
                status: result.status,
                method: 'both',
                verifiedBy: userId,
                details: result.verification.details,
            });
            // Check for tampering
            if (result.status === types_1.VerificationStatus.MODIFIED) {
                integrityRecord.tamperAlerts.push({
                    id: (0, uuid_1.v4)(),
                    timestamp: new Date(),
                    evidenceId,
                    detectedAt: new Date(),
                    expectedHash: blockchainVerification.fingerprint,
                    actualHash: result.currentHash,
                    severity: 'critical',
                    acknowledged: false,
                });
            }
            await integrityRecord.save();
        }
        // Add audit entry
        await this.addAuditEntry(evidenceId, result.status === types_1.VerificationStatus.VERIFIED
            ? types_1.BlockchainEventType.EVIDENCE_VERIFIED
            : types_1.BlockchainEventType.HASH_MISMATCH, result.status === types_1.VerificationStatus.VERIFIED
            ? `Evidence ${evidenceId} verified successfully`
            : `Hash mismatch detected for evidence ${evidenceId}`, userId, { currentHash: result.currentHash, status: result.status });
        return {
            verified: result.status === types_1.VerificationStatus.VERIFIED,
            currentHash: result.currentHash,
            status: result.status,
            integrityState: result.integrityState,
            verificationRecord: result.verification,
        };
    }
    /**
     * Verify multiple evidence items (batch)
     */
    async batchVerify(evidenceItems, userId) {
        const results = [];
        for (const item of evidenceItems) {
            try {
                const result = await this.verifyEvidence(item.evidenceId, item.filePath, userId);
                results.push({
                    evidenceId: item.evidenceId,
                    status: result.status,
                    verified: result.verified,
                    error: null,
                });
            }
            catch (error) {
                results.push({
                    evidenceId: item.evidenceId,
                    status: types_1.VerificationStatus.FAILED,
                    verified: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }
        return {
            total: evidenceItems.length,
            verified: results.filter((r) => r.verified).length,
            modified: results.filter((r) => r.status === types_1.VerificationStatus.MODIFIED).length,
            failed: results.filter((r) => !r.verified && r.status === types_1.VerificationStatus.FAILED).length,
            results,
        };
    }
    /**
     * Create evidence package hash
     */
    async createPackageHash(investigationId, evidenceIds, filePaths, userId) {
        // Generate package hash
        const packageHash = await hashing_service_1.evidenceHashingService.generatePackageHash((0, uuid_1.v4)(), filePaths, userId);
        // Create package hash record
        const evidenceHashes = await Promise.all(evidenceIds.map(async (id, index) => {
            const hash = await hashing_service_1.evidenceHashingService.generateFileFingerprint(filePaths[index]);
            return { evidenceId: id, hash, fileName: filePaths[index] };
        }));
        const packageRecord = await blockchain_model_1.EvidencePackageHash.create({
            packageId: packageHash.packageId,
            investigationId,
            rootHash: packageHash.rootHash,
            evidenceHashes,
            manifestHash: packageHash.manifestHash,
            evidenceCount: evidenceIds.length,
            createdBy: userId,
        });
        // Add audit entry
        await this.addAuditEntry(null, types_1.BlockchainEventType.EVIDENCE_REGISTERED, `Evidence package ${packageHash.packageId} created with ${evidenceIds.length} items`, userId, { rootHash: packageHash.rootHash });
        return packageRecord;
    }
    /**
     * Verify evidence package
     */
    async verifyPackage(packageId, userId) {
        const packageRecord = await blockchain_model_1.EvidencePackageHash.findOne({ packageId });
        if (!packageRecord) {
            throw new Error(`Package ${packageId} not found`);
        }
        const results = [];
        let verifiedCount = 0;
        let failedCount = 0;
        for (const item of packageRecord.evidenceHashes) {
            try {
                const verification = await blockchain_model_1.BlockchainVerification.findOne({ evidenceId: item.evidenceId });
                if (verification && verification.fingerprint === item.hash) {
                    verifiedCount++;
                    results.push({ evidenceId: item.evidenceId, valid: true });
                }
                else {
                    failedCount++;
                    results.push({ evidenceId: item.evidenceId, valid: false });
                }
            }
            catch {
                failedCount++;
                results.push({ evidenceId: item.evidenceId, valid: false });
            }
        }
        // Update package verification
        packageRecord.verificationCount++;
        packageRecord.lastVerifiedAt = new Date();
        packageRecord.lastVerificationStatus = failedCount === 0
            ? blockchain_model_1.BlockchainVerificationStatus.VERIFIED
            : blockchain_model_1.BlockchainVerificationStatus.FAILED;
        await packageRecord.save();
        return {
            valid: failedCount === 0,
            verifiedCount,
            failedCount,
            results,
        };
    }
    /**
     * Get blockchain audit log
     */
    async getAuditLog(filters) {
        const query = {};
        if (filters?.evidenceId) {
            query.evidenceId = filters.evidenceId;
        }
        if (filters?.eventType) {
            query.eventType = filters.eventType;
        }
        if (filters?.startDate || filters?.endDate) {
            query.timestamp = {};
            if (filters?.startDate)
                query.timestamp.$gte = filters.startDate;
            if (filters?.endDate)
                query.timestamp.$lte = filters.endDate;
        }
        const logs = await blockchain_model_1.BlockchainAudit.find(query)
            .sort({ timestamp: -1 })
            .limit(filters?.limit || 100)
            .lean();
        return logs;
    }
    /**
     * Get integrity records for investigation
     */
    async getInvestigationIntegrityRecords(investigationId) {
        const { Evidence } = await Promise.resolve().then(() => __importStar(require('../models')));
        const evidenceItems = await Evidence.find({ investigationId }).lean();
        const evidenceIds = evidenceItems.map((e) => e._id);
        const integrityRecords = await blockchain_model_1.EvidenceIntegrity.find({
            evidenceId: { $in: evidenceIds },
        }).lean();
        return integrityRecords;
    }
    /**
     * Get tamper alerts
     */
    async getTamperAlerts(unacknowledgedOnly = false) {
        const query = unacknowledgedOnly ? { acknowledged: false } : {};
        return await blockchain_model_1.EvidenceIntegrity.find({ tamperAlerts: { $exists: true, $ne: [] } })
            .lean();
    }
    /**
     * Acknowledge tamper alert
     */
    async acknowledgeAlert(evidenceId, alertId, userId, notes) {
        const record = await blockchain_model_1.EvidenceIntegrity.findOne({ evidenceId });
        if (!record) {
            throw new Error(`Integrity record not found for evidence ${evidenceId}`);
        }
        const alert = record.tamperAlerts.find((a) => a.id === alertId);
        if (!alert) {
            throw new Error(`Alert ${alertId} not found`);
        }
        alert.acknowledged = true;
        alert.acknowledgedBy = userId;
        alert.acknowledgedAt = new Date();
        alert.notes = notes;
        await record.save();
    }
    /**
     * Add audit entry
     */
    async addAuditEntry(evidenceId, eventType, details, performedBy, metadata) {
        await blockchain_model_1.BlockchainAudit.create({
            evidenceId,
            eventType,
            details,
            performedBy,
            metadata,
        });
    }
    /**
     * Get blockchain status
     */
    async getBlockchainStatus() {
        const networkInfo = await blockchain_service_1.blockchainService.getNetworkInfo();
        return {
            available: networkInfo.available,
            networkName: networkInfo.networkName,
            chainId: networkInfo.chainId,
            blockNumber: networkInfo.blockNumber,
            verificationMode: networkInfo.available ? 'on-chain' : 'local-only',
        };
    }
    /**
     * Get verification statistics
     */
    async getVerificationStats() {
        const [total, verified, modified, pending, onChain, integrityRecords] = await Promise.all([
            blockchain_model_1.BlockchainVerification.countDocuments(),
            blockchain_model_1.BlockchainVerification.countDocuments({ status: blockchain_model_1.BlockchainVerificationStatus.VERIFIED }),
            blockchain_model_1.EvidenceIntegrity.countDocuments({ integrityState: types_1.EvidenceIntegrityState.MODIFIED }),
            blockchain_model_1.BlockchainVerification.countDocuments({ status: blockchain_model_1.BlockchainVerificationStatus.PENDING }),
            blockchain_model_1.BlockchainVerification.countDocuments({ status: blockchain_model_1.BlockchainVerificationStatus.ON_CHAIN }),
            blockchain_model_1.EvidenceIntegrity.find({ tamperAlerts: { $exists: true, $ne: [] } }).lean(),
        ]);
        const tamperAlertCount = integrityRecords.reduce((count, record) => count + record.tamperAlerts.filter((a) => !a.acknowledged).length, 0);
        return {
            totalEvidence: total,
            verified,
            modified,
            pending,
            blockchainOnChain: onChain,
            tamperAlerts: tamperAlertCount,
        };
    }
}
exports.BlockchainVerificationService = BlockchainVerificationService;
exports.blockchainVerificationService = new BlockchainVerificationService();
exports.default = exports.blockchainVerificationService;
//# sourceMappingURL=verification-orchestrator.service.js.map