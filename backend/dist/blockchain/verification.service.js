"use strict";
/**
 * Verification Service - Evidence Integrity Verification
 * Main service for verification workflows and tamper detection
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.verificationService = exports.VerificationService = void 0;
const types_1 = require("./types");
const hashing_service_1 = require("./hashing.service");
const blockchain_service_1 = require("./blockchain.service");
const uuid_1 = require("uuid");
class VerificationService {
    verificationHistory = new Map();
    tamperAlerts = new Map();
    auditLog = [];
    /**
     * Verify evidence integrity
     */
    async verifyEvidence(evidenceId, filePath, expectedHash, verifiedBy) {
        // Verify file against expected hash
        const result = await hashing_service_1.evidenceHashingService.verifyFileIntegrity(filePath, expectedHash);
        // Determine status
        let status;
        let integrityState;
        if (!result.valid) {
            status = types_1.VerificationStatus.FAILED;
            integrityState = types_1.EvidenceIntegrityState.VERIFICATION_FAILED;
        }
        else if (result.matches) {
            status = types_1.VerificationStatus.VERIFIED;
            integrityState = types_1.EvidenceIntegrityState.INTACT;
        }
        else {
            status = types_1.VerificationStatus.MODIFIED;
            integrityState = types_1.EvidenceIntegrityState.MODIFIED;
            // Create tamper alert
            await this.createTamperAlert(evidenceId, expectedHash, result.currentHash);
        }
        // Create verification record
        const verification = hashing_service_1.evidenceHashingService.createVerificationRecord(evidenceId, result.currentHash, status, 'local', verifiedBy, result.matches ? 'Integrity verified successfully' : 'Integrity mismatch detected');
        // Store verification in history
        this.addVerificationToHistory(evidenceId, verification);
        // Add to audit log
        this.addAuditEntry({
            eventType: result.matches ? types_1.BlockchainEventType.EVIDENCE_VERIFIED : types_1.BlockchainEventType.HASH_MISMATCH,
            evidenceId,
            details: result.matches
                ? `Evidence ${evidenceId} verified successfully`
                : `Hash mismatch detected for evidence ${evidenceId}`,
            performedBy: verifiedBy,
        });
        return {
            status,
            currentHash: result.currentHash,
            integrityState,
            verification,
        };
    }
    /**
     * Verify evidence with blockchain preparation
     */
    async verifyEvidenceWithBlockchain(evidenceId, filePath, expectedHash, verifiedBy) {
        // Perform local verification first
        const localResult = await this.verifyEvidence(evidenceId, filePath, expectedHash, verifiedBy);
        // If verified locally and blockchain is available, prepare for chain storage
        let blockchainReady = false;
        let transactionHash;
        let blockNumber;
        if (localResult.status === types_1.VerificationStatus.VERIFIED && blockchain_service_1.blockchainService.isAvailable()) {
            blockchainReady = true;
            // In a production system, this would submit to smart contract
            // For now, we prepare the verification for potential chain submission
            this.addAuditEntry({
                eventType: types_1.BlockchainEventType.EVIDENCE_REGISTERED,
                evidenceId,
                details: `Verification prepared for blockchain submission`,
                performedBy: verifiedBy,
                metadata: {
                    hash: localResult.currentHash,
                    method: 'both',
                },
            });
        }
        return {
            ...localResult,
            blockchainReady,
            transactionHash,
            blockNumber,
        };
    }
    /**
     * Create tamper alert
     */
    async createTamperAlert(evidenceId, expectedHash, actualHash) {
        const alert = {
            id: (0, uuid_1.v4)(),
            timestamp: new Date(),
            evidenceId,
            detectedAt: new Date(),
            expectedHash,
            actualHash,
            severity: 'critical',
            acknowledged: false,
        };
        const alerts = this.tamperAlerts.get(evidenceId) || [];
        alerts.push(alert);
        this.tamperAlerts.set(evidenceId, alerts);
        // Add to audit log
        this.addAuditEntry({
            eventType: types_1.BlockchainEventType.TAMPER_DETECTED,
            evidenceId,
            details: `Tampering detected for evidence ${evidenceId}`,
            performedBy: 'system',
            metadata: {
                expectedHash,
                actualHash,
                severity: 'critical',
            },
        });
        return alert;
    }
    /**
     * Acknowledge tamper alert
     */
    acknowledgeAlert(alertId, acknowledgedBy, notes) {
        for (const [evidenceId, alerts] of this.tamperAlerts.entries()) {
            const alert = alerts.find((a) => a.id === alertId);
            if (alert) {
                alert.acknowledged = true;
                alert.acknowledgedBy = acknowledgedBy;
                alert.acknowledgedAt = new Date();
                alert.notes = notes;
                break;
            }
        }
    }
    /**
     * Get tamper alerts for evidence
     */
    getTamperAlerts(evidenceId) {
        if (evidenceId) {
            return this.tamperAlerts.get(evidenceId) || [];
        }
        const allAlerts = [];
        for (const alerts of this.tamperAlerts.values()) {
            allAlerts.push(...alerts);
        }
        return allAlerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }
    /**
     * Get unacknowledged alerts
     */
    getUnacknowledgedAlerts() {
        return this.getTamperAlerts().filter((a) => !a.acknowledged);
    }
    /**
     * Add verification to history
     */
    addVerificationToHistory(evidenceId, verification) {
        const history = this.verificationHistory.get(evidenceId) || [];
        history.push(verification);
        this.verificationHistory.set(evidenceId, history);
    }
    /**
     * Get verification history
     */
    getVerificationHistory(evidenceId) {
        return this.verificationHistory.get(evidenceId) || [];
    }
    /**
     * Add audit entry
     */
    addAuditEntry(entry) {
        const auditEntry = {
            id: (0, uuid_1.v4)(),
            timestamp: new Date(),
            ...entry,
        };
        this.auditLog.push(auditEntry);
        // Keep audit log size manageable
        if (this.auditLog.length > 10000) {
            this.auditLog = this.auditLog.slice(-5000);
        }
    }
    /**
     * Get audit log
     */
    getAuditLog(filters) {
        let entries = [...this.auditLog];
        if (filters?.evidenceId) {
            entries = entries.filter((e) => e.evidenceId === filters.evidenceId);
        }
        if (filters?.eventType) {
            entries = entries.filter((e) => e.eventType === filters.eventType);
        }
        if (filters?.startDate) {
            entries = entries.filter((e) => e.timestamp >= filters.startDate);
        }
        if (filters?.endDate) {
            entries = entries.filter((e) => e.timestamp <= filters.endDate);
        }
        return entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }
    /**
     * Create integrity record
     */
    createIntegrityRecord(evidenceId, hash, previousHash) {
        return hashing_service_1.evidenceHashingService.createIntegrityRecord(evidenceId, hash, previousHash);
    }
    /**
     * Update integrity record with verification
     */
    updateIntegrityRecord(record, verification) {
        return {
            ...record,
            currentHash: verification.hash,
            previousHash: record.currentHash !== verification.hash ? record.currentHash : record.previousHash,
            integrityState: verification.status === types_1.VerificationStatus.VERIFIED
                ? types_1.EvidenceIntegrityState.INTACT
                : verification.status === types_1.VerificationStatus.MODIFIED
                    ? types_1.EvidenceIntegrityState.MODIFIED
                    : types_1.EvidenceIntegrityState.UNKNOWN,
            lastVerifiedAt: verification.timestamp,
            lastVerificationStatus: verification.status,
            verificationHistory: [...record.verificationHistory, verification],
        };
    }
    /**
     * Get verification statistics
     */
    getVerificationStats() {
        const allHistory = Array.from(this.verificationHistory.values()).flat();
        const alerts = this.getUnacknowledgedAlerts();
        return {
            totalVerified: allHistory.filter((v) => v.status === types_1.VerificationStatus.VERIFIED).length,
            totalModified: allHistory.filter((v) => v.status === types_1.VerificationStatus.MODIFIED).length,
            totalFailed: allHistory.filter((v) => v.status === types_1.VerificationStatus.FAILED).length,
            unacknowledgedAlerts: alerts.length,
            auditEntries: this.auditLog.length,
        };
    }
    /**
     * Clear verification data (for testing)
     */
    clearVerificationData() {
        this.verificationHistory.clear();
        this.tamperAlerts.clear();
        this.auditLog = [];
        hashing_service_1.evidenceHashingService.clearCache();
    }
}
exports.VerificationService = VerificationService;
exports.verificationService = new VerificationService();
exports.default = exports.verificationService;
//# sourceMappingURL=verification.service.js.map