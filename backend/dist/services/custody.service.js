"use strict";
/**
 * Chain of Custody Service
 * Immutable evidence tracking and custody chain management
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chainOfCustodyService = exports.ChainOfCustodyService = void 0;
const custody_model_1 = require("../models/custody.model");
const models_1 = require("../models");
const blockchain_model_1 = require("../blockchain/models/blockchain.model");
const uuid_1 = require("uuid");
const crypto_1 = __importDefault(require("crypto"));
class ChainOfCustodyService {
    /**
     * Initialize chain of custody for new evidence
     */
    async initializeChain(evidenceId, userId, userName) {
        const chainId = `COC-${(0, uuid_1.v4)().substring(0, 8).toUpperCase()}`;
        const genesisHash = this.generateHash(`${evidenceId}:${chainId}:genesis:${Date.now()}`);
        const chain = await custody_model_1.ChainOfCustody.create({
            evidenceId,
            chainId,
            currentHolder: userId,
            currentHolderName: userName,
            custodyStatus: 'active',
            integrityStatus: custody_model_1.IntegrityStatus.PENDING_VERIFICATION,
            events: [],
            chainHash: genesisHash,
            genesisHash,
        });
        // Add genesis event
        await this.addEvent({
            evidenceId,
            eventType: custody_model_1.CustodyEventType.EVIDENCE_CREATED,
            performedBy: userId,
            performedByName: userName,
            details: 'Evidence chain of custody initialized',
        });
        // Create lineage record
        await custody_model_1.EvidenceLineage.create({
            evidenceId,
            lineageType: 'original',
        });
        return chain;
    }
    /**
     * Add custody event
     */
    async addEvent(input) {
        const { evidenceId, eventType, performedBy, performedByName, details, investigationId, transactionHash, blockNumber, integrityStatus, metadata } = input;
        // Get existing chain
        let chain = await custody_model_1.ChainOfCustody.findOne({ evidenceId });
        if (!chain) {
            // Initialize if not exists
            chain = await this.initializeChain(evidenceId, performedBy, performedByName);
        }
        // Get previous event hash
        const previousHash = chain.chainHash;
        // Create event
        const eventHash = this.generateHash(`${evidenceId}:${eventType}:${performedBy}:${Date.now()}:${previousHash}`);
        const event = {
            eventId: (0, uuid_1.v4)(),
            evidenceId,
            eventType,
            timestamp: new Date(),
            performedBy,
            performedByName,
            details,
            investigationId,
            transactionHash,
            blockNumber,
            integrityStatus,
            previousEventHash: previousHash,
            currentEventHash: eventHash,
            metadata,
        };
        // Atomic update — prevents race conditions on concurrent evidence uploads
        const updateFields = {
            $push: { events: event },
            $inc: { eventCount: 1 },
            $set: {
                lastEventAt: new Date(),
                chainHash: eventHash,
            },
        };
        if (eventType === custody_model_1.CustodyEventType.CUSTODY_TRANSFERRED) {
            updateFields.$set.currentHolder = performedBy;
            updateFields.$set.currentHolderName = performedByName;
        }
        if (integrityStatus) {
            updateFields.$set.integrityStatus = integrityStatus;
            updateFields.$set.lastIntegrityCheck = new Date();
        }
        if (transactionHash && blockNumber) {
            updateFields.$set.blockchainVerified = true;
            updateFields.$set.blockchainTxHash = transactionHash;
            updateFields.$set.blockchainBlockNumber = blockNumber;
        }
        chain = await custody_model_1.ChainOfCustody.findOneAndUpdate({ evidenceId }, updateFields, { new: true });
        // Add verification to history
        if (eventType === custody_model_1.CustodyEventType.VERIFICATION_COMPLETED || eventType === custody_model_1.CustodyEventType.VERIFICATION_FAILED) {
            await this.recordVerification({
                evidenceId,
                verificationType: 'integrity',
                status: eventType === custody_model_1.CustodyEventType.VERIFICATION_COMPLETED ? 'success' : 'failed',
                performedBy,
                performedByName,
                details,
            });
        }
        return chain;
    }
    /**
     * Record verification event
     */
    async recordVerification(input) {
        const verification = await custody_model_1.VerificationHistory.create({
            verificationId: (0, uuid_1.v4)(),
            evidenceId: input.evidenceId,
            verificationType: input.verificationType,
            timestamp: new Date(),
            performedBy: input.performedBy,
            performedByName: input.performedByName,
            status: input.status,
            expectedHash: input.expectedHash,
            actualHash: input.actualHash,
            hashMatch: input.expectedHash && input.actualHash
                ? input.expectedHash === input.actualHash
                : undefined,
            transactionHash: input.transactionHash,
            blockNumber: input.blockNumber,
            verificationTime: input.verificationTime,
            details: input.details,
        });
        return verification;
    }
    /**
     * Get chain of custody visualization
     */
    async getChainVisualization(evidenceId) {
        const chain = await custody_model_1.ChainOfCustody.findOne({ evidenceId });
        if (!chain)
            return null;
        return {
            evidenceId: String(chain.evidenceId),
            chainId: chain.chainId,
            events: chain.events.map(e => ({
                timestamp: e.timestamp,
                eventType: e.eventType,
                details: e.details,
                performedBy: e.performedByName,
                integrityStatus: e.integrityStatus,
            })),
            integrityStatus: chain.integrityStatus,
            blockchainVerified: chain.blockchainVerified,
        };
    }
    /**
     * Get full custody timeline
     */
    async getCustodyTimeline(evidenceId) {
        const chain = await custody_model_1.ChainOfCustody.findOne({ evidenceId })
            .populate('currentHolder', 'username email')
            .populate('events.performedBy', 'username email');
        return chain;
    }
    /**
     * Link evidence to investigation
     */
    async linkToInvestigation(evidenceId, investigationId, userId, userName) {
        await this.addEvent({
            evidenceId,
            eventType: custody_model_1.CustodyEventType.INVESTIGATION_LINKED,
            performedBy: userId,
            performedByName: userName,
            details: `Evidence linked to investigation ${investigationId}`,
            investigationId,
            integrityStatus: custody_model_1.IntegrityStatus.SYNCING,
        });
    }
    /**
     * Transfer custody
     */
    async transferCustody(evidenceId, newHolderId, newHolderName, transferrerId, transferrerName) {
        await this.addEvent({
            evidenceId,
            eventType: custody_model_1.CustodyEventType.CUSTODY_TRANSFERRED,
            performedBy: transferrerId,
            performedByName: transferrerName,
            details: `Custody transferred to ${newHolderName}`,
            integrityStatus: custody_model_1.IntegrityStatus.PENDING_VERIFICATION,
        });
        const chain = await custody_model_1.ChainOfCustody.findOne({ evidenceId });
        if (chain) {
            chain.currentHolder = newHolderId;
            chain.currentHolderName = newHolderName;
            await chain.save();
        }
    }
    /**
     * Get verification history
     */
    async getVerificationHistory(evidenceId, limit = 100) {
        return await custody_model_1.VerificationHistory.find({ evidenceId })
            .sort({ timestamp: -1 })
            .limit(limit)
            .lean();
    }
    /**
     * Create tamper investigation
     */
    async createTamperInvestigation(evidenceId, expectedHash, actualHash, severity) {
        const investigation = await custody_model_1.TamperInvestigation.create({
            investigationId: (0, uuid_1.v4)(),
            evidenceId,
            severity,
            expectedHash,
            actualHash,
            status: 'open',
            driftAnalysis: {
                firstDetectedAt: new Date(),
                lastConfirmedAt: new Date(),
                driftCount: 1,
            },
        });
        await this.addEvent({
            evidenceId,
            eventType: custody_model_1.CustodyEventType.TAMPER_DETECTED,
            performedBy: 'system',
            performedByName: 'System',
            details: `Tamper suspected: hash mismatch detected`,
            integrityStatus: custody_model_1.IntegrityStatus.TAMPER_SUSPECTED,
        });
        return investigation;
    }
    /**
     * Update tamper investigation
     */
    async updateTamperInvestigation(investigationId, updates) {
        const investigation = await custody_model_1.TamperInvestigation.findOne({ investigationId });
        if (!investigation) {
            throw new Error('Tamper investigation not found');
        }
        Object.assign(investigation, updates);
        await investigation.save();
    }
    /**
     * Add event to tamper investigation
     */
    async addTamperInvestigationEvent(investigationId, action, performedBy, notes) {
        const investigation = await custody_model_1.TamperInvestigation.findOne({ investigationId });
        if (!investigation) {
            throw new Error('Tamper investigation not found');
        }
        investigation.events.push({
            timestamp: new Date(),
            action,
            performedBy,
            notes,
        });
        investigation.driftAnalysis.driftCount++;
        investigation.driftAnalysis.lastConfirmedAt = new Date();
        await investigation.save();
    }
    /**
     * Get open tamper investigations
     */
    async getOpenTamperInvestigations() {
        return await custody_model_1.TamperInvestigation.find({
            status: { $in: ['open', 'investigating'] },
        })
            .sort({ detectedAt: -1 })
            .lean();
    }
    /**
     * Generate verification report
     */
    async generateVerificationReport(investigationId, evidenceIds, reportType, userId, userName) {
        const reportId = `RPT-${(0, uuid_1.v4)().substring(0, 8).toUpperCase()}`;
        // Gather evidence details
        const evidenceDetails = [];
        let verifiedCount = 0;
        let failedCount = 0;
        let pendingCount = 0;
        let tamperCount = 0;
        for (const evidenceId of evidenceIds) {
            const evidence = await models_1.Evidence.findById(evidenceId);
            const chain = await custody_model_1.ChainOfCustody.findOne({ evidenceId });
            const verification = await blockchain_model_1.BlockchainVerification.findOne({ evidenceId });
            if (evidence) {
                let integrityStatus = 'unknown';
                if (chain)
                    integrityStatus = chain.integrityStatus;
                else if (verification)
                    integrityStatus = verification.status;
                if (integrityStatus === 'verified' || integrityStatus === 'intact')
                    verifiedCount++;
                else if (integrityStatus === 'failed' || integrityStatus === 'modified')
                    failedCount++;
                else if (integrityStatus === 'tamper_suspected' || integrityStatus === 'integrity_mismatch')
                    tamperCount++;
                else
                    pendingCount++;
                evidenceDetails.push({
                    evidenceId: evidence._id.toString(),
                    fileName: evidence.metadata?.fileName || evidence.name,
                    sha256Hash: verification?.fingerprint || 'N/A',
                    integrityStatus,
                    blockchainVerified: chain?.blockchainVerified || false,
                    lastVerifiedAt: verification?.verifiedAt || null,
                });
            }
        }
        // Gather custody timelines
        const custodyTimeline = [];
        for (const evidenceId of evidenceIds) {
            const chain = await this.getChainVisualization(evidenceId);
            if (chain) {
                custodyTimeline.push({
                    evidenceId,
                    events: chain.events,
                });
            }
        }
        // Generate report content
        const report = await custody_model_1.VerificationReport.create({
            reportId,
            investigationId,
            evidenceIds,
            reportType,
            generatedAt: new Date(),
            generatedBy: userId,
            generatedByName: userName,
            summary: {
                totalEvidence: evidenceIds.length,
                verifiedEvidence: verifiedCount,
                failedEvidence: failedCount,
                pendingEvidence: pendingCount,
                tamperDetected: tamperCount,
            },
            content: {
                evidenceDetails,
                custodyTimeline,
                tamperAlerts: [],
                blockchainReferences: [],
            },
            reportHash: this.generateHash(JSON.stringify({ reportId, evidenceIds, timestamp: Date.now() })),
        });
        return report;
    }
    /**
     * Export report
     */
    async exportReport(reportId, exportFormat, userId) {
        const report = await custody_model_1.VerificationReport.findOne({ reportId });
        if (!report) {
            throw new Error('Report not found');
        }
        report.exportedAt = new Date();
        report.exportedBy = userId;
        report.exportFormat = exportFormat;
        await report.save();
        return report;
    }
    /**
     * Get evidence lineage graph
     */
    async getEvidenceLineageGraph(investigationId) {
        // Get all evidence for investigation
        const evidenceItems = await models_1.Evidence.find({ investigationId }).lean();
        const nodes = [];
        const edges = [];
        for (const evidence of evidenceItems) {
            const lineage = await custody_model_1.EvidenceLineage.findOne({ evidenceId: evidence._id }).lean();
            nodes.push({
                id: evidence._id.toString(),
                type: lineage?.lineageType || 'original',
                label: evidence.name || evidence._id.toString(),
                metadata: {
                    createdAt: evidence.createdAt,
                    integrityStatus: lineage?.lineageType,
                },
            });
            if (lineage?.parentEvidenceId) {
                edges.push({
                    source: lineage.parentEvidenceId.toString(),
                    target: evidence._id.toString(),
                    relationship: 'derived_from',
                });
            }
            if (lineage?.childEvidenceIds) {
                for (const childId of lineage.childEvidenceIds) {
                    edges.push({
                        source: evidence._id.toString(),
                        target: childId.toString(),
                        relationship: 'produces',
                    });
                }
            }
        }
        return { nodes, edges };
    }
    /**
     * Get integrity statistics
     */
    async getIntegrityStatistics() {
        const [total, verified, pending, failed, tamper, onChain] = await Promise.all([
            custody_model_1.ChainOfCustody.countDocuments(),
            custody_model_1.ChainOfCustody.countDocuments({ integrityStatus: custody_model_1.IntegrityStatus.VERIFIED }),
            custody_model_1.ChainOfCustody.countDocuments({ integrityStatus: custody_model_1.IntegrityStatus.PENDING_VERIFICATION }),
            custody_model_1.ChainOfCustody.countDocuments({ integrityStatus: custody_model_1.IntegrityStatus.VERIFICATION_FAILED }),
            custody_model_1.ChainOfCustody.countDocuments({ integrityStatus: custody_model_1.IntegrityStatus.TAMPER_SUSPECTED }),
            custody_model_1.ChainOfCustody.countDocuments({ blockchainVerified: true }),
        ]);
        return { totalEvidence: total, verified, pending, failed, tamperSuspected: tamper, blockchainOnChain: onChain };
    }
    /**
     * Generate hash for chain
     */
    generateHash(data) {
        return crypto_1.default.createHash('sha256').update(data).digest('hex');
    }
}
exports.ChainOfCustodyService = ChainOfCustodyService;
exports.chainOfCustodyService = new ChainOfCustodyService();
exports.default = exports.chainOfCustodyService;
//# sourceMappingURL=custody.service.js.map