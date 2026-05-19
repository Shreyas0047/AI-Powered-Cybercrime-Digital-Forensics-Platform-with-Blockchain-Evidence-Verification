"use strict";
/**
 * Blockchain Controller
 * Handles blockchain verification endpoints
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.blockchainController = exports.BlockchainController = void 0;
const verification_orchestrator_service_1 = require("../verification-orchestrator.service");
const verification_service_1 = require("../verification.service");
const synchronization_service_1 = require("../synchronization.service");
const verification_worker_service_1 = require("../verification-worker.service");
const reconciliation_service_1 = require("../reconciliation.service");
const state_tracking_service_1 = require("../state-tracking.service");
class BlockchainController {
    /**
     * GET /api/v1/blockchain/status
     * Get blockchain connection status
     */
    async getStatus(req, res) {
        try {
            const status = await verification_orchestrator_service_1.blockchainVerificationService.getBlockchainStatus();
            const response = {
                success: true,
                message: 'Blockchain status retrieved',
                data: { status },
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to get blockchain status',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * GET /api/v1/blockchain/verification/stats
     * Get verification statistics
     */
    async getVerificationStats(req, res) {
        try {
            const stats = await verification_orchestrator_service_1.blockchainVerificationService.getVerificationStats();
            const response = {
                success: true,
                message: 'Verification statistics retrieved',
                data: { stats },
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to get verification statistics',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * POST /api/v1/blockchain/evidence/register
     * Register evidence for blockchain verification
     */
    async registerEvidence(req, res) {
        try {
            const { evidenceId, filePath } = req.body;
            if (!evidenceId || !filePath) {
                res.status(400).json({
                    success: false,
                    message: 'Evidence ID and file path are required',
                });
                return;
            }
            const result = await verification_orchestrator_service_1.blockchainVerificationService.registerEvidence(evidenceId, filePath, req.user?.id || 'system');
            const response = {
                success: true,
                message: 'Evidence registered for blockchain verification',
                data: result,
            };
            res.status(201).json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to register evidence',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * POST /api/v1/blockchain/evidence/verify
     * Verify evidence integrity
     */
    async verifyEvidence(req, res) {
        try {
            const { evidenceId, filePath } = req.body;
            if (!evidenceId || !filePath) {
                res.status(400).json({
                    success: false,
                    message: 'Evidence ID and file path are required',
                });
                return;
            }
            const result = await verification_orchestrator_service_1.blockchainVerificationService.verifyEvidence(evidenceId, filePath, req.user?.id || 'system');
            const response = {
                success: true,
                message: result.verified ? 'Evidence verified successfully' : 'Evidence verification failed',
                data: result,
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to verify evidence',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * POST /api/v1/blockchain/evidence/batch-verify
     * Batch verify multiple evidence items
     */
    async batchVerify(req, res) {
        try {
            const { evidenceItems } = req.body;
            if (!evidenceItems || !Array.isArray(evidenceItems) || evidenceItems.length === 0) {
                res.status(400).json({
                    success: false,
                    message: 'Evidence items array is required',
                });
                return;
            }
            const result = await verification_orchestrator_service_1.blockchainVerificationService.batchVerify(evidenceItems, req.user?.id || 'system');
            const response = {
                success: true,
                message: `Batch verification completed: ${result.verified} verified, ${result.modified} modified, ${result.failed} failed`,
                data: result,
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to batch verify evidence',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * POST /api/v1/blockchain/package/create
     * Create evidence package hash
     */
    async createPackage(req, res) {
        try {
            const { investigationId, evidenceIds, filePaths } = req.body;
            if (!investigationId || !evidenceIds || !filePaths) {
                res.status(400).json({
                    success: false,
                    message: 'Investigation ID, evidence IDs, and file paths are required',
                });
                return;
            }
            const result = await verification_orchestrator_service_1.blockchainVerificationService.createPackageHash(investigationId, evidenceIds, filePaths, req.user?.id || 'system');
            const response = {
                success: true,
                message: 'Evidence package hash created',
                data: result,
            };
            res.status(201).json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to create evidence package',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * POST /api/v1/blockchain/package/verify
     * Verify evidence package
     */
    async verifyPackage(req, res) {
        try {
            const { packageId } = req.body;
            if (!packageId) {
                res.status(400).json({
                    success: false,
                    message: 'Package ID is required',
                });
                return;
            }
            const result = await verification_orchestrator_service_1.blockchainVerificationService.verifyPackage(packageId, req.user?.id || 'system');
            const response = {
                success: true,
                message: result.valid ? 'Package verified successfully' : 'Package verification failed',
                data: result,
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to verify package',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * GET /api/v1/blockchain/audit
     * Get blockchain audit log
     */
    async getAuditLog(req, res) {
        try {
            const { evidenceId, eventType, startDate, endDate, limit } = req.query;
            const logs = await verification_orchestrator_service_1.blockchainVerificationService.getAuditLog({
                evidenceId: evidenceId,
                eventType: eventType,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
                limit: limit ? parseInt(limit) : 100,
            });
            const response = {
                success: true,
                message: 'Audit log retrieved',
                data: { logs },
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to get audit log',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * GET /api/v1/blockchain/integrity/:investigationId
     * Get integrity records for investigation
     */
    async getInvestigationIntegrity(req, res) {
        try {
            const { investigationId } = req.params;
            const records = await verification_orchestrator_service_1.blockchainVerificationService.getInvestigationIntegrityRecords(investigationId);
            const response = {
                success: true,
                message: 'Integrity records retrieved',
                data: { records },
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to get integrity records',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * GET /api/v1/blockchain/alerts
     * Get tamper alerts
     */
    async getTamperAlerts(req, res) {
        try {
            const { unacknowledged } = req.query;
            const alerts = await verification_orchestrator_service_1.blockchainVerificationService.getTamperAlerts(unacknowledged === 'true');
            const response = {
                success: true,
                message: 'Tamper alerts retrieved',
                data: { alerts },
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to get tamper alerts',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * POST /api/v1/blockchain/alerts/:alertId/acknowledge
     * Acknowledge tamper alert
     */
    async acknowledgeAlert(req, res) {
        try {
            const { evidenceId, alertId } = req.params;
            const { notes } = req.body;
            await verification_orchestrator_service_1.blockchainVerificationService.acknowledgeAlert(evidenceId, alertId, req.user?.id || 'system', notes);
            const response = {
                success: true,
                message: 'Alert acknowledged',
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to acknowledge alert',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * GET /api/v1/blockchain/verification/history/:evidenceId
     * Get verification history for evidence
     */
    async getVerificationHistory(req, res) {
        try {
            const { evidenceId } = req.params;
            const history = verification_service_1.verificationService.getVerificationHistory(evidenceId);
            const response = {
                success: true,
                message: 'Verification history retrieved',
                data: { history },
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to get verification history',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * POST /api/v1/blockchain/hash/generate
     * Generate hash for raw data
     */
    async generateHash(req, res) {
        try {
            const { data } = req.body;
            if (!data) {
                res.status(400).json({
                    success: false,
                    message: 'Data is required',
                });
                return;
            }
            const { evidenceHashingService } = await Promise.resolve().then(() => __importStar(require('../index')));
            const hash = evidenceHashingService.generateDataFingerprint(typeof data === 'string' ? data : JSON.stringify(data));
            const response = {
                success: true,
                message: 'Hash generated',
                data: { hash, algorithm: 'sha256' },
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to generate hash',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * POST /api/v1/blockchain/hash/verify
     * Verify hash matches expected
     */
    async verifyHash(req, res) {
        try {
            const { filePath, expectedHash } = req.body;
            if (!filePath || !expectedHash) {
                res.status(400).json({
                    success: false,
                    message: 'File path and expected hash are required',
                });
                return;
            }
            const { evidenceHashingService } = await Promise.resolve().then(() => __importStar(require('../index')));
            const result = await evidenceHashingService.verifyFileIntegrity(filePath, expectedHash);
            const response = {
                success: true,
                message: result.matches ? 'Hash matches' : 'Hash mismatch detected',
                data: {
                    matches: result.matches,
                    currentHash: result.currentHash,
                    expectedHash,
                },
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to verify hash',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * POST /api/v1/blockchain/contract/register
     * Register evidence on smart contract
     */
    async registerOnContract(req, res) {
        try {
            const { evidenceId, evidenceHash, investigationId, metadata } = req.body;
            if (!evidenceId || !evidenceHash) {
                res.status(400).json({
                    success: false,
                    message: 'Evidence ID and evidence hash are required',
                });
                return;
            }
            const { transactionService } = await Promise.resolve().then(() => __importStar(require('../index')));
            const result = await transactionService.registerEvidenceTransaction(evidenceId, evidenceHash, investigationId || '', metadata);
            const response = {
                success: result.success,
                message: result.success ? 'Evidence registered on blockchain' : 'Registration failed',
                data: result.transactionRecord,
            };
            res.status(result.success ? 201 : 500).json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to register on contract',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * POST /api/v1/blockchain/contract/verify
     * Verify evidence on smart contract
     */
    async verifyOnContract(req, res) {
        try {
            const { evidenceId, hashToVerify } = req.body;
            if (!evidenceId || !hashToVerify) {
                res.status(400).json({
                    success: false,
                    message: 'Evidence ID and hash to verify are required',
                });
                return;
            }
            const { transactionService } = await Promise.resolve().then(() => __importStar(require('../index')));
            const result = await transactionService.verifyEvidenceTransaction(evidenceId, hashToVerify);
            const response = {
                success: result.success,
                message: result.success ? 'Evidence verified on blockchain' : 'Verification failed',
                data: result.transactionRecord,
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to verify on contract',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * GET /api/v1/blockchain/contract/evidence/:evidenceId
     * Get evidence info from smart contract
     */
    async getContractEvidence(req, res) {
        try {
            const { evidenceId } = req.params;
            const { smartContractService } = await Promise.resolve().then(() => __importStar(require('../index')));
            const evidence = await smartContractService.getEvidence(evidenceId);
            if (!evidence) {
                res.status(404).json({
                    success: false,
                    message: 'Evidence not found on blockchain',
                });
                return;
            }
            const response = {
                success: true,
                message: 'Evidence retrieved from blockchain',
                data: { evidence },
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to get evidence from contract',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * GET /api/v1/blockchain/contract/exists/:evidenceId
     * Check if evidence exists on blockchain
     */
    async checkContractEvidence(req, res) {
        try {
            const { evidenceId } = req.params;
            const { smartContractService } = await Promise.resolve().then(() => __importStar(require('../index')));
            const exists = await smartContractService.checkEvidenceExists(evidenceId);
            const response = {
                success: true,
                message: exists ? 'Evidence exists on blockchain' : 'Evidence not found on blockchain',
                data: { exists },
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to check evidence',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * GET /api/v1/blockchain/transactions
     * Get transaction history
     */
    async getTransactions(req, res) {
        try {
            const { status, type, limit } = req.query;
            const { transactionService } = await Promise.resolve().then(() => __importStar(require('../index')));
            let transactions;
            if (status) {
                transactions = transactionService.getTransactionsByStatus(status);
            }
            else if (type) {
                transactions = transactionService.getTransactionsByType(type);
            }
            else {
                transactions = transactionService.getAllTransactions();
            }
            const limited = limit ? transactions.slice(0, parseInt(limit)) : transactions;
            const response = {
                success: true,
                message: 'Transactions retrieved',
                data: { transactions: limited, total: transactions.length },
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to get transactions',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * GET /api/v1/blockchain/transactions/stats
     * Get transaction statistics
     */
    async getTransactionStats(req, res) {
        try {
            const { transactionService } = await Promise.resolve().then(() => __importStar(require('../index')));
            const stats = transactionService.getTransactionStats();
            const response = {
                success: true,
                message: 'Transaction statistics retrieved',
                data: { stats },
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to get transaction stats',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * POST /api/v1/blockchain/transactions/:txId/retry
     * Retry failed transaction
     */
    async retryTransaction(req, res) {
        try {
            const { txId } = req.params;
            const { transactionService } = await Promise.resolve().then(() => __importStar(require('../index')));
            const result = await transactionService.retryTransaction(txId);
            const response = {
                success: result.success,
                message: result.success ? 'Transaction retry initiated' : 'Retry failed',
                data: result.transactionRecord,
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to retry transaction',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * POST /api/v1/blockchain/audit/record
     * Record audit entry on blockchain
     */
    async recordAuditEntry(req, res) {
        try {
            const { category, severity, description, investigationId, evidenceId, metadata } = req.body;
            if (!description) {
                res.status(400).json({
                    success: false,
                    message: 'Description is required',
                });
                return;
            }
            const { transactionService } = await Promise.resolve().then(() => __importStar(require('../index')));
            const result = await transactionService.recordAuditTransaction({
                category: category || 0,
                severity: severity || 0,
                description,
                investigationId: investigationId || '',
                evidenceId,
                metadata,
            });
            const response = {
                success: result.success,
                message: result.success ? 'Audit entry recorded on blockchain' : 'Failed to record audit',
                data: result.transactionRecord,
            };
            res.status(result.success ? 201 : 500).json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to record audit entry',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * GET /api/v1/blockchain/audit/evidence/:evidenceId
     * Get audit entries for evidence from blockchain
     */
    async getEvidenceAuditFromChain(req, res) {
        try {
            const { evidenceId } = req.params;
            const { smartContractService } = await Promise.resolve().then(() => __importStar(require('../index')));
            const auditEntries = await smartContractService.getEvidenceAudit(evidenceId);
            const response = {
                success: true,
                message: 'Audit entries retrieved from blockchain',
                data: { auditEntries },
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to get audit entries',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * POST /api/v1/blockchain/tamper/record
     * Record tamper detection on blockchain
     */
    async recordTamperDetection(req, res) {
        try {
            const { evidenceId, investigationId, expectedHash, actualHash } = req.body;
            if (!evidenceId || !expectedHash || !actualHash) {
                res.status(400).json({
                    success: false,
                    message: 'Evidence ID, expected hash, and actual hash are required',
                });
                return;
            }
            const { smartContractService } = await Promise.resolve().then(() => __importStar(require('../index')));
            const result = await smartContractService.recordTamperDetection(evidenceId, investigationId || '', expectedHash, actualHash);
            const response = {
                success: result.success,
                message: result.success ? 'Tamper detection recorded on blockchain' : 'Failed to record',
                data: result,
            };
            res.status(result.success ? 201 : 500).json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to record tamper detection',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * GET /api/v1/blockchain/explorer/tx/:txHash
     * Get explorer URL for transaction
     */
    async getExplorerUrl(req, res) {
        try {
            const { txHash } = req.params;
            const { smartContractService } = await Promise.resolve().then(() => __importStar(require('../index')));
            const explorerUrl = smartContractService.getExplorerUrl(txHash);
            const response = {
                success: true,
                message: 'Explorer URL generated',
                data: { explorerUrl },
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to generate explorer URL',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    // ============================================
    // SYNCHRONIZATION ENDPOINTS
    // ============================================
    /**
     * GET /api/v1/blockchain/sync/status
     * Get synchronization status
     */
    async getSyncStatus(req, res) {
        try {
            const state = synchronization_service_1.blockchainSyncService.getSyncState();
            const queueStatus = synchronization_service_1.blockchainSyncService.getQueueStatus();
            const healthReport = await synchronization_service_1.blockchainSyncService.getSyncHealthReport();
            const response = {
                success: true,
                message: 'Synchronization status retrieved',
                data: { state, queueStatus, healthReport },
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to get sync status',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * POST /api/v1/blockchain/sync/queue
     * Queue evidence for blockchain sync
     */
    async queueForSync(req, res) {
        try {
            const { evidenceId, fingerprint } = req.body;
            if (!evidenceId || !fingerprint) {
                res.status(400).json({
                    success: false,
                    message: 'Evidence ID and fingerprint are required',
                });
                return;
            }
            const syncId = await synchronization_service_1.blockchainSyncService.queueEvidenceRegistration(evidenceId, fingerprint);
            const response = {
                success: true,
                message: 'Evidence queued for synchronization',
                data: { syncId },
            };
            res.status(201).json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to queue for sync',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * POST /api/v1/blockchain/sync/process
     * Process synchronization queue
     */
    async processSyncQueue(req, res) {
        try {
            const result = await synchronization_service_1.blockchainSyncService.processQueue();
            const response = {
                success: true,
                message: `Processed ${result.processed} items: ${result.successful} successful, ${result.failed} failed`,
                data: result,
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to process sync queue',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * POST /api/v1/blockchain/sync/retry
     * Retry failed sync operations
     */
    async retryFailedSync(req, res) {
        try {
            const count = await synchronization_service_1.blockchainSyncService.retryFailed();
            const response = {
                success: true,
                message: `${count} failed operations re-queued for retry`,
                data: { retryCount: count },
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to retry sync operations',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * GET /api/v1/blockchain/sync/consistency/:evidenceId
     * Check evidence-chain consistency
     */
    async checkConsistency(req, res) {
        try {
            const { evidenceId } = req.params;
            const result = await synchronization_service_1.blockchainSyncService.validateConsistency(evidenceId);
            const response = {
                success: true,
                message: result.consistent ? 'Evidence is consistent with blockchain' : 'Inconsistencies detected',
                data: result,
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to check consistency',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    // ============================================
    // VERIFICATION WORKER ENDPOINTS
    // ============================================
    /**
     * GET /api/v1/blockchain/worker/status
     * Get verification worker status
     */
    async getWorkerStatus(req, res) {
        try {
            const queueStatus = verification_worker_service_1.distributedVerificationService.getQueueStatus();
            const stats = verification_worker_service_1.distributedVerificationService.getVerificationStats();
            const schedules = verification_worker_service_1.distributedVerificationService.getSchedules();
            const response = {
                success: true,
                message: 'Worker status retrieved',
                data: { queueStatus, stats, schedules },
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to get worker status',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * POST /api/v1/blockchain/worker/job
     * Create verification job
     */
    async createVerificationJob(req, res) {
        try {
            const { type, evidenceIds, priority, filePaths } = req.body;
            if (!type || !evidenceIds || !Array.isArray(evidenceIds)) {
                res.status(400).json({
                    success: false,
                    message: 'Type and evidence IDs array are required',
                });
                return;
            }
            const jobId = await verification_worker_service_1.distributedVerificationService.createJob(type, evidenceIds, req.user?.id || 'system', priority || 'normal', filePaths);
            const response = {
                success: true,
                message: 'Verification job created',
                data: { jobId },
            };
            res.status(201).json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to create verification job',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * GET /api/v1/blockchain/worker/job/:jobId
     * Get verification job status
     */
    async getJobStatus(req, res) {
        try {
            const { jobId } = req.params;
            const job = verification_worker_service_1.distributedVerificationService.getJobStatus(jobId);
            if (!job) {
                res.status(404).json({
                    success: false,
                    message: 'Job not found',
                });
                return;
            }
            const response = {
                success: true,
                message: 'Job status retrieved',
                data: { job },
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to get job status',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * POST /api/v1/blockchain/worker/job/:jobId/cancel
     * Cancel verification job
     */
    async cancelJob(req, res) {
        try {
            const { jobId } = req.params;
            const cancelled = verification_worker_service_1.distributedVerificationService.cancelJob(jobId);
            const response = {
                success: cancelled,
                message: cancelled ? 'Job cancelled' : 'Failed to cancel job (may already be processing)',
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to cancel job',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * POST /api/v1/blockchain/worker/schedule
     * Create verification schedule
     */
    async createSchedule(req, res) {
        try {
            const { name, cronExpression, evidenceFilter } = req.body;
            if (!name || !cronExpression) {
                res.status(400).json({
                    success: false,
                    message: 'Name and cron expression are required',
                });
                return;
            }
            const scheduleId = await verification_worker_service_1.distributedVerificationService.createSchedule(name, cronExpression, evidenceFilter || {}, req.user?.id || 'system');
            const response = {
                success: true,
                message: 'Verification schedule created',
                data: { scheduleId },
            };
            res.status(201).json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to create schedule',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    // ============================================
    // RECONCILIATION ENDPOINTS
    // ============================================
    /**
     * POST /api/v1/blockchain/reconciliation/run
     * Run full reconciliation
     */
    async runReconciliation(req, res) {
        try {
            const report = await reconciliation_service_1.blockchainReconciliationService.performFullReconciliation();
            const response = {
                success: true,
                message: `Reconciliation completed: ${report.issuesFound} issues found, ${report.issuesResolved} resolved`,
                data: { report },
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to run reconciliation',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * GET /api/v1/blockchain/reconciliation/issues
     * Get active reconciliation issues
     */
    async getReconciliationIssues(req, res) {
        try {
            const { severity } = req.query;
            let issues;
            if (severity) {
                issues = reconciliation_service_1.blockchainReconciliationService.getIssuesBySeverity(severity);
            }
            else {
                issues = reconciliation_service_1.blockchainReconciliationService.getActiveIssues();
            }
            const response = {
                success: true,
                message: 'Reconciliation issues retrieved',
                data: { issues },
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to get reconciliation issues',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * POST /api/v1/blockchain/reconciliation/issues/:issueId/resolve
     * Acknowledge and resolve reconciliation issue
     */
    async resolveIssue(req, res) {
        try {
            const { issueId } = req.params;
            const { resolution } = req.body;
            if (!resolution) {
                res.status(400).json({
                    success: false,
                    message: 'Resolution description is required',
                });
                return;
            }
            const resolved = await reconciliation_service_1.blockchainReconciliationService.acknowledgeIssue(issueId, resolution);
            const response = {
                success: resolved,
                message: resolved ? 'Issue resolved' : 'Issue not found',
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to resolve issue',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * GET /api/v1/blockchain/reconciliation/stats
     * Get reconciliation statistics
     */
    async getReconciliationStats(req, res) {
        try {
            const stats = await reconciliation_service_1.blockchainReconciliationService.getReconciliationStats();
            const response = {
                success: true,
                message: 'Reconciliation statistics retrieved',
                data: { stats },
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to get reconciliation stats',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * GET /api/v1/blockchain/reconciliation/check/:evidenceId
     * Check specific evidence consistency
     */
    async checkEvidenceReconciliation(req, res) {
        try {
            const { evidenceId } = req.params;
            const result = await reconciliation_service_1.blockchainReconciliationService.checkEvidenceConsistency(evidenceId);
            const response = {
                success: true,
                message: result.consistent ? 'Evidence is consistent' : 'Inconsistencies found',
                data: result,
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to check evidence consistency',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    // ============================================
    // STATE TRACKING ENDPOINTS
    // ============================================
    /**
     * GET /api/v1/blockchain/state
     * Get blockchain state
     */
    async getBlockchainState(req, res) {
        try {
            const state = await state_tracking_service_1.blockchainStateTrackingService.getCurrentState();
            const snapshot = await state_tracking_service_1.blockchainStateTrackingService.takeSnapshot();
            const response = {
                success: true,
                message: 'Blockchain state retrieved',
                data: { ...state, snapshot },
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to get blockchain state',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * GET /api/v1/blockchain/state/health
     * Get health metrics
     */
    async getHealthMetrics(req, res) {
        try {
            const health = await state_tracking_service_1.blockchainStateTrackingService.calculateHealthMetrics();
            const response = {
                success: true,
                message: 'Health metrics retrieved',
                data: { health },
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to get health metrics',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * GET /api/v1/blockchain/state/metrics
     * Get performance metrics
     */
    async getPerformanceMetrics(req, res) {
        try {
            const txMetrics = await state_tracking_service_1.blockchainStateTrackingService.getTransactionMetrics();
            const perfMetrics = state_tracking_service_1.blockchainStateTrackingService.getPerformanceMetrics();
            const response = {
                success: true,
                message: 'Performance metrics retrieved',
                data: { transactionMetrics: txMetrics, performanceMetrics: perfMetrics },
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to get performance metrics',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * GET /api/v1/blockchain/state/operations
     * Get operation history
     */
    async getOperationHistory(req, res) {
        try {
            const { operation, status, from, to, limit } = req.query;
            const history = state_tracking_service_1.blockchainStateTrackingService.getOperationHistory({
                operation: operation,
                status: status,
                from: from ? new Date(from) : undefined,
                to: to ? new Date(to) : undefined,
                limit: limit ? parseInt(limit) : 100,
            });
            const response = {
                success: true,
                message: 'Operation history retrieved',
                data: { history },
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to get operation history',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
}
exports.BlockchainController = BlockchainController;
exports.blockchainController = new BlockchainController();
exports.default = exports.blockchainController;
//# sourceMappingURL=blockchain.controller.js.map