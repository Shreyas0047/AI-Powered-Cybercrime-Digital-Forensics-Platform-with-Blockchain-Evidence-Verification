"use strict";
/**
 * Blockchain State Tracking Service
 * Monitors and tracks blockchain operational state
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.blockchainStateTrackingService = exports.BlockchainStateTrackingService = void 0;
const blockchain_service_1 = require("./blockchain.service");
const blockchain_model_1 = require("./models/blockchain.model");
const types_1 = require("./types");
const uuid_1 = require("uuid");
class BlockchainStateTrackingService {
    operationHistory = [];
    MAX_HISTORY = 1000;
    lastSnapshot = null;
    /**
     * Take a state snapshot
     */
    async takeSnapshot() {
        const [networkInfo, verificationStats, integrityStats] = await Promise.all([
            this.getNetworkInfo(),
            this.getVerificationStats(),
            this.getIntegrityStats(),
        ]);
        const snapshot = {
            timestamp: new Date(),
            blockchain: {
                available: networkInfo.available,
                networkName: networkInfo.networkName,
                chainId: networkInfo.chainId,
                blockNumber: networkInfo.blockNumber,
                lastBlockTimestamp: networkInfo.lastBlockTimestamp,
            },
            verification: verificationStats,
            integrity: integrityStats,
            sync: {
                queueSize: 0,
                pendingOps: 0,
                failedOps: 0,
                health: 'healthy',
            },
            performance: {
                avgVerificationTime: 0,
                throughputPerMinute: 0,
            },
        };
        this.lastSnapshot = snapshot;
        return snapshot;
    }
    /**
     * Get network info
     */
    async getNetworkInfo() {
        try {
            const info = await blockchain_service_1.blockchainService.getNetworkInfo();
            let lastBlockTimestamp = null;
            if (info.available && info.blockNumber > 0) {
                const block = await blockchain_service_1.blockchainService.getBlock(info.blockNumber);
                if (block && block.timestamp) {
                    lastBlockTimestamp = new Date(Number(block.timestamp) * 1000);
                }
            }
            return {
                available: info.available,
                networkName: info.networkName,
                chainId: info.chainId,
                blockNumber: info.blockNumber,
                lastBlockTimestamp,
            };
        }
        catch {
            return {
                available: false,
                networkName: 'unknown',
                chainId: 0,
                blockNumber: 0,
                lastBlockTimestamp: null,
            };
        }
    }
    /**
     * Get verification stats
     */
    async getVerificationStats() {
        const [total, pending, verified, failed, onChain] = await Promise.all([
            blockchain_model_1.BlockchainVerification.countDocuments(),
            blockchain_model_1.BlockchainVerification.countDocuments({ status: types_1.VerificationStatus.PENDING }),
            blockchain_model_1.BlockchainVerification.countDocuments({ status: types_1.VerificationStatus.VERIFIED }),
            blockchain_model_1.BlockchainVerification.countDocuments({ status: types_1.VerificationStatus.FAILED }),
            blockchain_model_1.BlockchainVerification.countDocuments({ status: types_1.VerificationStatus.ON_CHAIN }),
        ]);
        return { total, pending, verified, failed, onChain };
    }
    /**
     * Get integrity stats
     */
    async getIntegrityStats() {
        const [intact, modified, unknown, failed] = await Promise.all([
            blockchain_model_1.EvidenceIntegrity.countDocuments({ integrityState: 'intact' }),
            blockchain_model_1.EvidenceIntegrity.countDocuments({ integrityState: 'modified' }),
            blockchain_model_1.EvidenceIntegrity.countDocuments({ integrityState: 'unknown' }),
            blockchain_model_1.EvidenceIntegrity.countDocuments({ integrityState: 'verification_failed' }),
        ]);
        return { intact, modified, unknown, failed };
    }
    /**
     * Record operation
     */
    recordOperation(operation, status, evidenceId, duration, error) {
        const entry = {
            id: (0, uuid_1.v4)(),
            operation,
            status,
            evidenceId,
            timestamp: new Date(),
            duration,
            error,
        };
        this.operationHistory.push(entry);
        // Trim history if needed
        if (this.operationHistory.length > this.MAX_HISTORY) {
            this.operationHistory = this.operationHistory.slice(-this.MAX_HISTORY);
        }
    }
    /**
     * Get operation history
     */
    getOperationHistory(filters) {
        let results = [...this.operationHistory];
        if (filters?.operation) {
            results = results.filter(e => e.operation === filters.operation);
        }
        if (filters?.status) {
            results = results.filter(e => e.status === filters.status);
        }
        if (filters?.from) {
            results = results.filter(e => e.timestamp >= filters.from);
        }
        if (filters?.to) {
            results = results.filter(e => e.timestamp <= filters.to);
        }
        return results.slice(-(filters?.limit || 100));
    }
    /**
     * Calculate health metrics
     */
    async calculateHealthMetrics() {
        const issues = [];
        let score = 100;
        // Check blockchain connection
        const networkInfo = await blockchain_service_1.blockchainService.getNetworkInfo();
        if (!networkInfo.available) {
            issues.push('Blockchain not available - running in offline mode');
            score -= 30;
        }
        // Check verification success rate
        const verificationStats = await this.getVerificationStats();
        const successRate = verificationStats.total > 0
            ? (verificationStats.verified / verificationStats.total) * 100
            : 100;
        if (successRate < 80) {
            issues.push(`Low verification success rate: ${successRate.toFixed(1)}%`);
            score -= 20;
        }
        if (successRate < 60) {
            issues.push(`Critical verification success rate: ${successRate.toFixed(1)}%`);
            score -= 30;
        }
        // Check integrity
        const integrityStats = await this.getIntegrityStats();
        const integrityRatio = integrityStats.intact / (verificationStats.total || 1);
        if (integrityRatio < 0.9) {
            issues.push(`Data integrity below threshold: ${(integrityRatio * 100).toFixed(1)}%`);
            score -= 15;
        }
        // Check failed operations
        const failedOps = this.operationHistory.filter(e => e.status === 'failed');
        const recentFailures = failedOps.filter(e => e.timestamp > new Date(Date.now() - 3600000) // Last hour
        ).length;
        if (recentFailures > 10) {
            issues.push(`High failure rate: ${recentFailures} failures in last hour`);
            score -= 20;
        }
        // Determine status
        let status = 'healthy';
        if (score < 40)
            status = 'unhealthy';
        else if (score < 70)
            status = 'degraded';
        return {
            score: Math.max(0, Math.min(100, score)),
            status,
            blockchainConnection: networkInfo.available,
            verificationSuccessRate: successRate,
            syncQueueHealth: 100 - Math.min(100, (recentFailures / 10) * 100),
            dataIntegrityScore: integrityRatio * 100,
            lastCheck: new Date(),
            issues,
        };
    }
    /**
     * Get current state
     */
    async getCurrentState() {
        const health = await this.calculateHealthMetrics();
        return {
            snapshot: this.lastSnapshot,
            health,
            lastUpdate: this.lastSnapshot?.timestamp || null,
        };
    }
    /**
     * Get transaction metrics
     */
    async getTransactionMetrics() {
        const verifications = await blockchain_model_1.BlockchainVerification.find({
            transactionHash: { $exists: true, $ne: null },
        }).lean();
        const confirmed = verifications.filter(v => v.status === types_1.VerificationStatus.ON_CHAIN && v.blockNumber).length;
        const pending = verifications.filter(v => v.status === types_1.VerificationStatus.SYNCING).length;
        const failed = verifications.filter(v => v.status === types_1.VerificationStatus.FAILED).length;
        // Calculate average confirmation time from recent transactions
        let avgConfirmationTime = 0;
        const recentConfirmed = verifications
            .filter(v => v.blockTimestamp && v.createdAt)
            .slice(-20);
        if (recentConfirmed.length > 0) {
            const totalTime = recentConfirmed.reduce((sum, v) => {
                const confirmTime = new Date(v.blockTimestamp).getTime() - new Date(v.createdAt).getTime();
                return sum + confirmTime;
            }, 0);
            avgConfirmationTime = Math.round(totalTime / recentConfirmed.length / 1000); // In seconds
        }
        return {
            totalTransactions: verifications.length,
            confirmedTransactions: confirmed,
            pendingTransactions: pending,
            failedTransactions: failed,
            averageConfirmationTime: avgConfirmationTime,
        };
    }
    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        const recentOps = this.operationHistory.filter(e => e.timestamp.getTime() > oneMinuteAgo);
        const operationsPerMinute = recentOps.length;
        const completedOps = recentOps.filter(e => e.duration);
        const averageOperationTime = completedOps.length > 0
            ? completedOps.reduce((sum, e) => sum + (e.duration || 0), 0) / completedOps.length
            : 0;
        const successOps = recentOps.filter(e => e.status === 'success').length;
        const successRate = recentOps.length > 0
            ? (successOps / recentOps.length) * 100
            : 100;
        return {
            operationsPerMinute,
            averageOperationTime: Math.round(averageOperationTime),
            successRate,
            recentOperations: recentOps.slice(-10),
        };
    }
    /**
     * Get last snapshot
     */
    getLastSnapshot() {
        return this.lastSnapshot;
    }
}
exports.BlockchainStateTrackingService = BlockchainStateTrackingService;
exports.blockchainStateTrackingService = new BlockchainStateTrackingService();
exports.default = exports.blockchainStateTrackingService;
//# sourceMappingURL=state-tracking.service.js.map