"use strict";
/**
 * Transaction Service
 * Manages blockchain transaction workflows and confirmation tracking
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
exports.transactionService = exports.TransactionService = exports.TransactionType = exports.TransactionStatus = void 0;
const logger_1 = __importDefault(require("../config/logger"));
const config_1 = require("./config");
const smart_contract_service_1 = require("./smart-contract.service");
const uuid_1 = require("uuid");
var TransactionStatus;
(function (TransactionStatus) {
    TransactionStatus["PENDING"] = "pending";
    TransactionStatus["CONFIRMING"] = "confirming";
    TransactionStatus["CONFIRMED"] = "confirmed";
    TransactionStatus["FAILED"] = "failed";
    TransactionStatus["RETRYING"] = "retrying";
})(TransactionStatus || (exports.TransactionStatus = TransactionStatus = {}));
var TransactionType;
(function (TransactionType) {
    TransactionType["EVIDENCE_REGISTER"] = "evidence_register";
    TransactionType["EVIDENCE_VERIFY"] = "evidence_verify";
    TransactionType["AUDIT_RECORD"] = "audit_record";
    TransactionType["BATCH_REGISTER"] = "batch_register";
})(TransactionType || (exports.TransactionType = TransactionType = {}));
class TransactionService {
    transactionHistory = new Map();
    pendingTransactions = new Map();
    maxRetries = 3;
    confirmationInterval = 5000; // 5 seconds
    /**
     * Execute evidence registration transaction
     */
    async registerEvidenceTransaction(evidenceId, evidenceHash, investigationId, metadata) {
        const txId = this.generateTransactionId();
        const txRecord = {
            id: txId,
            type: TransactionType.EVIDENCE_REGISTER,
            status: TransactionStatus.PENDING,
            confirmations: 0,
            requiredConfirmations: config_1.blockchainConfig.confirmations,
            retryCount: 0,
            maxRetries: this.maxRetries,
            createdAt: new Date(),
            updatedAt: new Date(),
            metadata: {
                evidenceId,
                evidenceHash,
                investigationId,
            },
            events: [
                {
                    timestamp: new Date(),
                    event: 'TRANSACTION_INITIATED',
                    details: `Evidence registration transaction for ${evidenceId}`,
                },
            ],
        };
        this.transactionHistory.set(txId, txRecord);
        try {
            // Execute blockchain transaction
            const result = await smart_contract_service_1.smartContractService.registerEvidence(evidenceId, evidenceHash, investigationId, metadata);
            if (result.success) {
                txRecord.transactionHash = result.transactionHash;
                txRecord.blockNumber = result.blockNumber;
                txRecord.gasUsed = result.gasUsed;
                txRecord.status = TransactionStatus.CONFIRMING;
                txRecord.events.push({
                    timestamp: new Date(),
                    event: 'TRANSACTION_SUBMITTED',
                    details: `TX: ${result.transactionHash}`,
                });
                // Start confirmation monitoring
                this.monitorConfirmation(txId);
                return { success: true, transactionRecord: txRecord };
            }
            else {
                txRecord.status = TransactionStatus.FAILED;
                txRecord.error = result.error;
                txRecord.events.push({
                    timestamp: new Date(),
                    event: 'TRANSACTION_FAILED',
                    details: result.error || 'Unknown error',
                });
                return { success: false, error: result.error, transactionRecord: txRecord };
            }
        }
        catch (error) {
            txRecord.status = TransactionStatus.FAILED;
            txRecord.error = error.message;
            txRecord.events.push({
                timestamp: new Date(),
                event: 'TRANSACTION_ERROR',
                details: error.message,
            });
            return { success: false, error: error.message, transactionRecord: txRecord };
        }
        finally {
            txRecord.updatedAt = new Date();
            this.transactionHistory.set(txId, txRecord);
        }
    }
    /**
     * Execute evidence verification transaction
     */
    async verifyEvidenceTransaction(evidenceId, hashToVerify) {
        const txId = this.generateTransactionId();
        const txRecord = {
            id: txId,
            type: TransactionType.EVIDENCE_VERIFY,
            status: TransactionStatus.PENDING,
            confirmations: 0,
            requiredConfirmations: config_1.blockchainConfig.confirmations,
            retryCount: 0,
            maxRetries: this.maxRetries,
            createdAt: new Date(),
            updatedAt: new Date(),
            metadata: {
                evidenceId,
                hashToVerify,
            },
            events: [
                {
                    timestamp: new Date(),
                    event: 'TRANSACTION_INITIATED',
                    details: `Evidence verification transaction for ${evidenceId}`,
                },
            ],
        };
        this.transactionHistory.set(txId, txRecord);
        try {
            const result = await smart_contract_service_1.smartContractService.verifyEvidence(evidenceId, hashToVerify);
            txRecord.transactionHash = result.transactionHash;
            txRecord.blockNumber = result.blockNumber;
            txRecord.status = TransactionStatus.CONFIRMED;
            txRecord.confirmations = config_1.blockchainConfig.confirmations;
            txRecord.events.push({
                timestamp: new Date(),
                event: 'VERIFICATION_COMPLETE',
                details: `Verified: ${result.verified}, Status: ${result.status}`,
            });
            return { success: true, transactionRecord: txRecord };
        }
        catch (error) {
            txRecord.status = TransactionStatus.FAILED;
            txRecord.error = error.message;
            txRecord.events.push({
                timestamp: new Date(),
                event: 'VERIFICATION_FAILED',
                details: error.message,
            });
            return { success: false, error: error.message, transactionRecord: txRecord };
        }
        finally {
            txRecord.updatedAt = new Date();
            this.transactionHistory.set(txId, txRecord);
        }
    }
    /**
     * Execute batch registration transaction
     */
    async batchRegisterTransaction(evidenceItems, investigationId) {
        const txId = this.generateTransactionId();
        const txRecord = {
            id: txId,
            type: TransactionType.BATCH_REGISTER,
            status: TransactionStatus.PENDING,
            confirmations: 0,
            requiredConfirmations: config_1.blockchainConfig.confirmations,
            retryCount: 0,
            maxRetries: this.maxRetries,
            createdAt: new Date(),
            updatedAt: new Date(),
            metadata: {
                evidenceCount: evidenceItems.length,
                investigationId,
            },
            events: [
                {
                    timestamp: new Date(),
                    event: 'TRANSACTION_INITIATED',
                    details: `Batch registration for ${evidenceItems.length} items`,
                },
            ],
        };
        this.transactionHistory.set(txId, txRecord);
        try {
            const result = await smart_contract_service_1.smartContractService.batchRegisterEvidence(evidenceItems, investigationId);
            if (result.success) {
                txRecord.transactionHash = result.transactionHash;
                txRecord.blockNumber = result.blockNumber;
                txRecord.gasUsed = result.gasUsed;
                txRecord.status = TransactionStatus.CONFIRMING;
                this.monitorConfirmation(txId);
                return { success: true, transactionRecord: txRecord };
            }
            else {
                txRecord.status = TransactionStatus.FAILED;
                txRecord.error = result.error;
                return { success: false, error: result.error, transactionRecord: txRecord };
            }
        }
        catch (error) {
            txRecord.status = TransactionStatus.FAILED;
            txRecord.error = error.message;
            return { success: false, error: error.message, transactionRecord: txRecord };
        }
        finally {
            txRecord.updatedAt = new Date();
            this.transactionHistory.set(txId, txRecord);
        }
    }
    /**
     * Execute audit record transaction
     */
    async recordAuditTransaction(params) {
        const txId = this.generateTransactionId();
        const txRecord = {
            id: txId,
            type: TransactionType.AUDIT_RECORD,
            status: TransactionStatus.PENDING,
            confirmations: 0,
            requiredConfirmations: config_1.blockchainConfig.confirmations,
            retryCount: 0,
            maxRetries: this.maxRetries,
            createdAt: new Date(),
            updatedAt: new Date(),
            metadata: params,
            events: [
                {
                    timestamp: new Date(),
                    event: 'TRANSACTION_INITIATED',
                    details: `Audit record: ${params.description}`,
                },
            ],
        };
        this.transactionHistory.set(txId, txRecord);
        try {
            const result = await smart_contract_service_1.smartContractService.recordAuditEntry(params);
            if (result.success) {
                txRecord.transactionHash = result.transactionHash;
                txRecord.blockNumber = result.blockNumber;
                txRecord.status = TransactionStatus.CONFIRMED;
                txRecord.confirmations = config_1.blockchainConfig.confirmations;
                return { success: true, transactionRecord: txRecord };
            }
            else {
                txRecord.status = TransactionStatus.FAILED;
                txRecord.error = result.error;
                return { success: false, error: result.error, transactionRecord: txRecord };
            }
        }
        catch (error) {
            txRecord.status = TransactionStatus.FAILED;
            txRecord.error = error.message;
            return { success: false, error: error.message, transactionRecord: txRecord };
        }
        finally {
            txRecord.updatedAt = new Date();
            this.transactionHistory.set(txId, txRecord);
        }
    }
    /**
     * Monitor transaction confirmation
     */
    async monitorConfirmation(txId) {
        const txRecord = this.transactionHistory.get(txId);
        if (!txRecord || !txRecord.transactionHash)
            return;
        // Clear existing interval if already monitoring this txId
        if (this.pendingTransactions.has(txId)) {
            clearInterval(this.pendingTransactions.get(txId));
            this.pendingTransactions.delete(txId);
        }
        // Schedule confirmation check
        const intervalId = setInterval(async () => {
            const tx = this.transactionHistory.get(txId);
            if (!tx) {
                clearInterval(intervalId);
                return;
            }
            try {
                const { blockchainService } = await Promise.resolve().then(() => __importStar(require('./blockchain.service')));
                const confirmations = await blockchainService.verifyTransaction(tx.transactionHash, config_1.blockchainConfig.confirmations);
                tx.confirmations = confirmations.confirmations;
                tx.status = confirmations.confirmed
                    ? TransactionStatus.CONFIRMED
                    : TransactionStatus.CONFIRMING;
                tx.events.push({
                    timestamp: new Date(),
                    event: 'CONFIRMATION_UPDATE',
                    details: `${tx.confirmations}/${tx.requiredConfirmations} confirmations`,
                });
                if (confirmations.confirmed) {
                    tx.events.push({
                        timestamp: new Date(),
                        event: 'TRANSACTION_CONFIRMED',
                        details: 'Blockchain confirmation complete',
                    });
                    clearInterval(intervalId);
                    this.pendingTransactions.delete(txId);
                }
                tx.updatedAt = new Date();
                this.transactionHistory.set(txId, tx);
            }
            catch (error) {
                logger_1.default.error(`[Transaction] Confirmation check failed for ${txId}:`, error);
            }
        }, this.confirmationInterval);
        this.pendingTransactions.set(txId, intervalId);
    }
    /**
     * Retry failed transaction
     */
    async retryTransaction(txId) {
        const txRecord = this.transactionHistory.get(txId);
        if (!txRecord) {
            return { success: false, error: 'Transaction not found' };
        }
        if (txRecord.retryCount >= txRecord.maxRetries) {
            return {
                success: false,
                error: 'Maximum retry attempts exceeded',
                transactionRecord: txRecord,
            };
        }
        txRecord.retryCount++;
        txRecord.status = TransactionStatus.RETRYING;
        txRecord.events.push({
            timestamp: new Date(),
            event: 'RETRY_INITIATED',
            details: `Retry attempt ${txRecord.retryCount}/${txRecord.maxRetries}`,
        });
        this.transactionHistory.set(txId, txRecord);
        // Re-execute based on transaction type
        switch (txRecord.type) {
            case TransactionType.EVIDENCE_REGISTER:
                return this.registerEvidenceTransaction(txRecord.metadata.evidenceId, txRecord.metadata.evidenceHash, txRecord.metadata.investigationId, txRecord.metadata.metadata);
            case TransactionType.EVIDENCE_VERIFY:
                return this.verifyEvidenceTransaction(txRecord.metadata.evidenceId, txRecord.metadata.hashToVerify);
            case TransactionType.BATCH_REGISTER:
                return this.batchRegisterTransaction(txRecord.metadata.evidenceItems, txRecord.metadata.investigationId);
            default:
                return { success: false, error: 'Unknown transaction type' };
        }
    }
    /**
     * Get transaction by ID
     */
    getTransaction(txId) {
        return this.transactionHistory.get(txId) || null;
    }
    /**
     * Get transactions by status
     */
    getTransactionsByStatus(status) {
        return Array.from(this.transactionHistory.values()).filter((tx) => tx.status === status);
    }
    /**
     * Get transactions by type
     */
    getTransactionsByType(type) {
        return Array.from(this.transactionHistory.values()).filter((tx) => tx.type === type);
    }
    /**
     * Get all transactions
     */
    getAllTransactions() {
        return Array.from(this.transactionHistory.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    /**
     * Get transaction statistics
     */
    getTransactionStats() {
        const transactions = this.getAllTransactions();
        return {
            total: transactions.length,
            pending: transactions.filter((t) => t.status === TransactionStatus.PENDING || t.status === TransactionStatus.CONFIRMING).length,
            confirmed: transactions.filter((t) => t.status === TransactionStatus.CONFIRMED).length,
            failed: transactions.filter((t) => t.status === TransactionStatus.FAILED).length,
            averageConfirmations: transactions.reduce((sum, t) => sum + t.confirmations, 0) / transactions.length || 0,
        };
    }
    /**
     * Clear old transactions (cleanup)
     */
    clearOldTransactions(maxAge = 86400000) {
        const cutoff = Date.now() - maxAge;
        for (const [txId, tx] of this.transactionHistory.entries()) {
            if (tx.updatedAt.getTime() < cutoff) {
                const interval = this.pendingTransactions.get(txId);
                if (interval) {
                    clearInterval(interval);
                    this.pendingTransactions.delete(txId);
                }
                this.transactionHistory.delete(txId);
            }
        }
    }
    /**
     * Generate transaction ID
     */
    generateTransactionId() {
        return `tx-${(0, uuid_1.v4)()}`;
    }
}
exports.TransactionService = TransactionService;
exports.transactionService = new TransactionService();
exports.default = exports.transactionService;
//# sourceMappingURL=transaction.service.js.map