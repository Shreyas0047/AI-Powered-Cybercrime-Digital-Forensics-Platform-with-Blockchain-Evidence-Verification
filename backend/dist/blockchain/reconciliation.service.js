"use strict";
/**
 * Blockchain Reconciliation Service
 * Handles detection and resolution of blockchain inconsistencies
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.blockchainReconciliationService = exports.BlockchainReconciliationService = void 0;
const logger_1 = __importDefault(require("../config/logger"));
const blockchain_model_1 = require("./models/blockchain.model");
const synchronization_service_1 = require("./synchronization.service");
const types_1 = require("./types");
const uuid_1 = require("uuid");
class BlockchainReconciliationService {
    activeIssues = new Map();
    /**
     * Perform full reconciliation check
     */
    async performFullReconciliation() {
        const issues = [];
        let resolved = 0;
        logger_1.default.info('[Reconciliation] Starting full reconciliation...');
        // Check 1: Hash consistency between verification and integrity records
        const verificationRecords = await blockchain_model_1.BlockchainVerification.find().lean();
        for (const verification of verificationRecords) {
            const integrity = await blockchain_model_1.EvidenceIntegrity.findOne({ evidenceId: verification.evidenceId });
            if (!integrity) {
                const issue = this.createIssue('orphan_record', 'high', String(verification.evidenceId), 'Verification record exists but no integrity record');
                issues.push(issue);
            }
            else if (verification.fingerprint !== integrity.currentHash) {
                const issue = this.createIssue('hash_mismatch', 'critical', String(verification.evidenceId), `Hash mismatch: verification has ${verification.fingerprint.substring(0, 16)}... but integrity has ${integrity.currentHash.substring(0, 16)}...`);
                issues.push(issue);
            }
        }
        // Check 2: Verify integrity records have corresponding verification
        const integrityRecords = await blockchain_model_1.EvidenceIntegrity.find().lean();
        for (const integrity of integrityRecords) {
            const verification = await blockchain_model_1.BlockchainVerification.findOne({ evidenceId: integrity.evidenceId });
            if (!verification) {
                const issue = this.createIssue('orphan_record', 'medium', String(integrity.evidenceId), 'Integrity record exists but no verification record');
                issues.push(issue);
            }
        }
        // Check 3: Blockchain synchronization status
        const syncingRecords = await blockchain_model_1.BlockchainVerification.find({
            status: types_1.VerificationStatus.SYNCING,
        }).lean();
        if (syncingRecords.length > 0) {
            // Check if these are stuck
            for (const record of syncingRecords) {
                const issue = this.createIssue('sync_failure', 'medium', String(record.evidenceId), 'Verification stuck in syncing state');
                issues.push(issue);
            }
        }
        // Check 4: Failed transactions
        const failedRecords = await blockchain_model_1.BlockchainVerification.find({
            status: types_1.VerificationStatus.FAILED,
        }).lean();
        for (const record of failedRecords) {
            const issue = this.createIssue('transaction_failure', 'high', String(record.evidenceId), 'Blockchain transaction failed');
            issues.push(issue);
        }
        // Check 5: Evidence integrity drift
        for (const integrity of integrityRecords) {
            if (integrity.integrityState === types_1.EvidenceIntegrityState.MODIFIED) {
                const issue = this.createIssue('drift_detected', 'critical', String(integrity.evidenceId), `Evidence integrity drift detected - current state: ${integrity.integrityState}`);
                issues.push(issue);
            }
        }
        // Try to auto-resolve issues
        for (const issue of issues) {
            const resolvedIssue = await this.tryAutoResolve(issue);
            if (resolvedIssue) {
                resolved++;
            }
        }
        // Update active issues — build local accumulator first, then bulk-assign
        const newIssues = new Map();
        for (const issue of issues.filter(i => !i.resolved)) {
            newIssues.set(issue.id, issue);
        }
        this.activeIssues = newIssues;
        const report = {
            id: (0, uuid_1.v4)(),
            timestamp: new Date(),
            issuesFound: issues.length,
            issuesResolved: resolved,
            issuesRemaining: issues.length - resolved,
            recommendations: this.generateRecommendations(issues),
            details: issues,
        };
        // Log to audit
        await this.logAudit(null, types_1.BlockchainEventType.CHAIN_SYNC_COMPLETE, `Reconciliation completed: ${issues.length} issues found, ${resolved} resolved`, 'system', { issuesFound: issues.length, resolved, remaining: issues.length - resolved });
        logger_1.default.info(`[Reconciliation] Completed: ${issues.length} issues found, ${resolved} resolved`);
        return report;
    }
    /**
     * Create reconciliation issue
     */
    createIssue(type, severity, evidenceId, description) {
        return {
            id: (0, uuid_1.v4)(),
            type,
            severity,
            evidenceId,
            description,
            detectedAt: new Date(),
            resolved: false,
            automatic: false,
        };
    }
    /**
     * Try to automatically resolve an issue
     */
    async tryAutoResolve(issue) {
        if (!issue.evidenceId)
            return false;
        try {
            switch (issue.type) {
                case 'hash_mismatch':
                    // Re-sync with blockchain
                    const verification = await blockchain_model_1.BlockchainVerification.findOne({ evidenceId: issue.evidenceId });
                    if (verification) {
                        await synchronization_service_1.blockchainSyncService.queueEvidenceRegistration(issue.evidenceId, verification.fingerprint);
                        issue.resolved = true;
                        issue.resolution = 'Re-queued for blockchain sync';
                        return true;
                    }
                    break;
                case 'orphan_record':
                    // Create missing record
                    const integrity = await blockchain_model_1.EvidenceIntegrity.findOne({ evidenceId: issue.evidenceId });
                    if (integrity) {
                        await blockchain_model_1.BlockchainVerification.create({
                            evidenceId: issue.evidenceId,
                            fingerprint: integrity.currentHash,
                            algorithm: 'sha256',
                            status: blockchain_model_1.BlockchainVerificationStatus.PENDING,
                            verifiedBy: 'system',
                        });
                        issue.resolved = true;
                        issue.resolution = 'Created missing verification record';
                        return true;
                    }
                    break;
                case 'sync_failure':
                    // Retry sync
                    await synchronization_service_1.blockchainSyncService.queueEvidenceVerification(issue.evidenceId);
                    issue.resolved = true;
                    issue.resolution = 'Re-queued for verification';
                    return true;
                case 'transaction_failure':
                    // Retry registration
                    const v = await blockchain_model_1.BlockchainVerification.findOne({ evidenceId: issue.evidenceId });
                    if (v) {
                        await synchronization_service_1.blockchainSyncService.queueEvidenceRegistration(issue.evidenceId, v.fingerprint);
                        issue.resolved = true;
                        issue.resolution = 'Re-queued for blockchain registration';
                        return true;
                    }
                    break;
                case 'drift_detected':
                    // Create alert for manual review
                    issue.resolved = false;
                    issue.resolution = 'Requires manual review - evidence modified';
                    return false;
            }
        }
        catch (error) {
            logger_1.default.error(`[Reconciliation] Auto-resolution failed for ${issue.id}:`, error);
        }
        return false;
    }
    /**
     * Generate recommendations based on issues
     */
    generateRecommendations(issues) {
        const recommendations = [];
        const byType = new Map();
        for (const issue of issues) {
            byType.set(issue.type, (byType.get(issue.type) || 0) + 1);
        }
        const criticalCount = issues.filter(i => i.severity === 'critical').length;
        if (criticalCount > 0) {
            recommendations.push(`Critical: ${criticalCount} critical issues require immediate attention`);
        }
        const hashMismatchCount = byType.get('hash_mismatch') || 0;
        if (hashMismatchCount > 0) {
            recommendations.push(`${hashMismatchCount} hash mismatches detected - check for evidence tampering`);
        }
        const orphanCount = byType.get('orphan_record') || 0;
        if (orphanCount > 0) {
            recommendations.push(`${orphanCount} orphan records found - database integrity may be compromised`);
        }
        const syncFailures = byType.get('sync_failure') || 0;
        if (syncFailures > 0) {
            recommendations.push(`${syncFailures} sync failures - verify blockchain connectivity`);
        }
        if (issues.length === 0) {
            recommendations.push('No reconciliation issues detected - system is healthy');
        }
        return recommendations;
    }
    /**
     * Get active issues
     */
    getActiveIssues() {
        return Array.from(this.activeIssues.values());
    }
    /**
     * Get issues by severity
     */
    getIssuesBySeverity(severity) {
        return Array.from(this.activeIssues.values()).filter(i => i.severity === severity);
    }
    /**
     * Acknowledge issue
     */
    async acknowledgeIssue(issueId, resolution) {
        const issue = this.activeIssues.get(issueId);
        if (issue) {
            issue.resolved = true;
            issue.resolvedAt = new Date();
            issue.resolution = resolution;
            await this.logAudit(issue.evidenceId || null, types_1.BlockchainEventType.EVIDENCE_VERIFIED, `Reconciliation issue ${issueId} resolved: ${resolution}`, 'system');
            return true;
        }
        return false;
    }
    /**
     * Check specific evidence consistency
     */
    async checkEvidenceConsistency(evidenceId) {
        const issues = [];
        const verification = await blockchain_model_1.BlockchainVerification.findOne({ evidenceId });
        const integrity = await blockchain_model_1.EvidenceIntegrity.findOne({ evidenceId });
        if (!verification && !integrity) {
            issues.push('No blockchain records found for this evidence');
            return { consistent: false, issues };
        }
        if (!verification) {
            issues.push('Missing verification record');
        }
        if (!integrity) {
            issues.push('Missing integrity record');
        }
        if (verification && integrity) {
            if (verification.fingerprint !== integrity.currentHash) {
                issues.push('Hash mismatch between verification and integrity records');
            }
            if (verification.status === types_1.VerificationStatus.ON_CHAIN && !integrity.blockchainVerified) {
                issues.push('Verification shows on-chain but integrity not verified');
            }
        }
        return {
            consistent: issues.length === 0,
            issues,
        };
    }
    /**
     * Log audit entry
     */
    async logAudit(evidenceId, eventType, details, performedBy, metadata) {
        try {
            await blockchain_model_1.BlockchainAudit.create({
                evidenceId,
                eventType,
                details,
                performedBy,
                metadata,
            });
        }
        catch (error) {
            logger_1.default.error('[Reconciliation] Failed to log audit:', error);
        }
    }
    /**
     * Get reconciliation statistics
     */
    async getReconciliationStats() {
        const allIssues = await this.activeIssues.values();
        const bySeverity = { low: 0, medium: 0, high: 0, critical: 0 };
        const byType = {};
        for (const issue of allIssues) {
            bySeverity[issue.severity]++;
            byType[issue.type] = (byType[issue.type] || 0) + 1;
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const resolvedToday = Array.from(this.activeIssues.values())
            .filter(i => i.resolved && i.resolvedAt && i.resolvedAt >= today).length;
        const autoResolved = Array.from(this.activeIssues.values())
            .filter(i => i.resolved && i.automatic).length;
        return {
            totalIssues: this.activeIssues.size,
            bySeverity,
            byType,
            resolvedToday,
            autoResolved,
        };
    }
}
exports.BlockchainReconciliationService = BlockchainReconciliationService;
exports.blockchainReconciliationService = new BlockchainReconciliationService();
exports.default = exports.blockchainReconciliationService;
//# sourceMappingURL=reconciliation.service.js.map