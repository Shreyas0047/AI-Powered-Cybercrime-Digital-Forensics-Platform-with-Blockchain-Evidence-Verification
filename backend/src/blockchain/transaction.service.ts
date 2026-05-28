/**
 * Transaction Service
 * Manages blockchain transaction workflows and confirmation tracking
 */

import logger from '../config/logger';
import { ethers } from 'ethers';
import { blockchainConfig } from './config';
import { smartContractService } from './smart-contract.service';
import { v4 as uuidv4 } from 'uuid';

export enum TransactionStatus {
  PENDING = 'pending',
  CONFIRMING = 'confirming',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
  RETRYING = 'retrying',
}

export enum TransactionType {
  EVIDENCE_REGISTER = 'evidence_register',
  EVIDENCE_VERIFY = 'evidence_verify',
  AUDIT_RECORD = 'audit_record',
  BATCH_REGISTER = 'batch_register',
}

export interface TransactionRecord {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  transactionHash?: string;
  blockNumber?: number;
  blockTimestamp?: Date;
  confirmations: number;
  requiredConfirmations: number;
  gasUsed?: string;
  gasPrice?: string;
  cost?: string;
  error?: string;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, any>;
  events: TransactionEventRecord[];
}

export interface TransactionEventRecord {
  timestamp: Date;
  event: string;
  details: string;
}

export interface TransactionResult {
  success: boolean;
  transactionRecord?: TransactionRecord;
  error?: string;
}

export class TransactionService {
  private transactionHistory: Map<string, TransactionRecord> = new Map();
  private pendingTransactions: Map<string, NodeJS.Timeout> = new Map();
  private maxRetries: number = 3;
  private confirmationInterval: number = 5000; // 5 seconds

  /**
   * Execute evidence registration transaction
   */
  async registerEvidenceTransaction(
    evidenceId: string,
    evidenceHash: string,
    investigationId: string,
    metadata?: string
  ): Promise<TransactionResult> {
    const txId = this.generateTransactionId();
    const txRecord: TransactionRecord = {
      id: txId,
      type: TransactionType.EVIDENCE_REGISTER,
      status: TransactionStatus.PENDING,
      confirmations: 0,
      requiredConfirmations: blockchainConfig.confirmations,
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
      const result = await smartContractService.registerEvidence(
        evidenceId,
        evidenceHash,
        investigationId,
        metadata
      );

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
      } else {
        txRecord.status = TransactionStatus.FAILED;
        txRecord.error = result.error;
        txRecord.events.push({
          timestamp: new Date(),
          event: 'TRANSACTION_FAILED',
          details: result.error || 'Unknown error',
        });

        return { success: false, error: result.error, transactionRecord: txRecord };
      }
    } catch (error: any) {
      txRecord.status = TransactionStatus.FAILED;
      txRecord.error = error.message;
      txRecord.events.push({
        timestamp: new Date(),
        event: 'TRANSACTION_ERROR',
        details: error.message,
      });

      return { success: false, error: error.message, transactionRecord: txRecord };
    } finally {
      txRecord.updatedAt = new Date();
      this.transactionHistory.set(txId, txRecord);
    }
  }

  /**
   * Execute evidence verification transaction
   */
  async verifyEvidenceTransaction(
    evidenceId: string,
    hashToVerify: string
  ): Promise<TransactionResult> {
    const txId = this.generateTransactionId();
    const txRecord: TransactionRecord = {
      id: txId,
      type: TransactionType.EVIDENCE_VERIFY,
      status: TransactionStatus.PENDING,
      confirmations: 0,
      requiredConfirmations: blockchainConfig.confirmations,
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
      const result = await smartContractService.verifyEvidence(evidenceId, hashToVerify);

      txRecord.transactionHash = result.transactionHash;
      txRecord.blockNumber = result.blockNumber;
      txRecord.status = TransactionStatus.CONFIRMED;
      txRecord.confirmations = blockchainConfig.confirmations;
      txRecord.events.push({
        timestamp: new Date(),
        event: 'VERIFICATION_COMPLETE',
        details: `Verified: ${result.verified}, Status: ${result.status}`,
      });

      return { success: true, transactionRecord: txRecord };
    } catch (error: any) {
      txRecord.status = TransactionStatus.FAILED;
      txRecord.error = error.message;
      txRecord.events.push({
        timestamp: new Date(),
        event: 'VERIFICATION_FAILED',
        details: error.message,
      });

      return { success: false, error: error.message, transactionRecord: txRecord };
    } finally {
      txRecord.updatedAt = new Date();
      this.transactionHistory.set(txId, txRecord);
    }
  }

  /**
   * Execute batch registration transaction
   */
  async batchRegisterTransaction(
    evidenceItems: Array<{ evidenceId: string; evidenceHash: string }>,
    investigationId: string
  ): Promise<TransactionResult> {
    const txId = this.generateTransactionId();
    const txRecord: TransactionRecord = {
      id: txId,
      type: TransactionType.BATCH_REGISTER,
      status: TransactionStatus.PENDING,
      confirmations: 0,
      requiredConfirmations: blockchainConfig.confirmations,
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
      const result = await smartContractService.batchRegisterEvidence(
        evidenceItems,
        investigationId
      );

      if (result.success) {
        txRecord.transactionHash = result.transactionHash;
        txRecord.blockNumber = result.blockNumber;
        txRecord.gasUsed = result.gasUsed;
        txRecord.status = TransactionStatus.CONFIRMING;

        this.monitorConfirmation(txId);

        return { success: true, transactionRecord: txRecord };
      } else {
        txRecord.status = TransactionStatus.FAILED;
        txRecord.error = result.error;

        return { success: false, error: result.error, transactionRecord: txRecord };
      }
    } catch (error: any) {
      txRecord.status = TransactionStatus.FAILED;
      txRecord.error = error.message;

      return { success: false, error: error.message, transactionRecord: txRecord };
    } finally {
      txRecord.updatedAt = new Date();
      this.transactionHistory.set(txId, txRecord);
    }
  }

  /**
   * Execute audit record transaction
   */
  async recordAuditTransaction(params: {
    category: number;
    severity: number;
    description: string;
    investigationId: string;
    evidenceId?: string;
    metadata?: string;
  }): Promise<TransactionResult> {
    const txId = this.generateTransactionId();
    const txRecord: TransactionRecord = {
      id: txId,
      type: TransactionType.AUDIT_RECORD,
      status: TransactionStatus.PENDING,
      confirmations: 0,
      requiredConfirmations: blockchainConfig.confirmations,
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
      const result = await smartContractService.recordAuditEntry(params);

      if (result.success) {
        txRecord.transactionHash = result.transactionHash;
        txRecord.blockNumber = result.blockNumber;
        txRecord.status = TransactionStatus.CONFIRMED;
        txRecord.confirmations = blockchainConfig.confirmations;

        return { success: true, transactionRecord: txRecord };
      } else {
        txRecord.status = TransactionStatus.FAILED;
        txRecord.error = result.error;

        return { success: false, error: result.error, transactionRecord: txRecord };
      }
    } catch (error: any) {
      txRecord.status = TransactionStatus.FAILED;
      txRecord.error = error.message;

      return { success: false, error: error.message, transactionRecord: txRecord };
    } finally {
      txRecord.updatedAt = new Date();
      this.transactionHistory.set(txId, txRecord);
    }
  }

  /**
   * Monitor transaction confirmation
   */
  private async monitorConfirmation(txId: string): Promise<void> {
    const txRecord = this.transactionHistory.get(txId);
    if (!txRecord || !txRecord.transactionHash) return;

    // Clear existing interval if already monitoring this txId
    if (this.pendingTransactions.has(txId)) {
      clearInterval(this.pendingTransactions.get(txId)!);
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
        const { blockchainService } = await import('./blockchain.service');
        const confirmations = await blockchainService.verifyTransaction(
          tx.transactionHash!,
          blockchainConfig.confirmations
        );

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
      } catch (error) {
        logger.error(`[Transaction] Confirmation check failed for ${txId}:`, error);
      }
    }, this.confirmationInterval);

    this.pendingTransactions.set(txId, intervalId);
  }

  /**
   * Retry failed transaction
   */
  async retryTransaction(txId: string): Promise<TransactionResult> {
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
        return this.registerEvidenceTransaction(
          txRecord.metadata.evidenceId,
          txRecord.metadata.evidenceHash,
          txRecord.metadata.investigationId,
          txRecord.metadata.metadata
        );

      case TransactionType.EVIDENCE_VERIFY:
        return this.verifyEvidenceTransaction(
          txRecord.metadata.evidenceId,
          txRecord.metadata.hashToVerify
        );

      case TransactionType.BATCH_REGISTER:
        return this.batchRegisterTransaction(
          txRecord.metadata.evidenceItems,
          txRecord.metadata.investigationId
        );

      default:
        return { success: false, error: 'Unknown transaction type' };
    }
  }

  /**
   * Get transaction by ID
   */
  getTransaction(txId: string): TransactionRecord | null {
    return this.transactionHistory.get(txId) || null;
  }

  /**
   * Get transactions by status
   */
  getTransactionsByStatus(status: TransactionStatus): TransactionRecord[] {
    return Array.from(this.transactionHistory.values()).filter(
      (tx) => tx.status === status
    );
  }

  /**
   * Get transactions by type
   */
  getTransactionsByType(type: TransactionType): TransactionRecord[] {
    return Array.from(this.transactionHistory.values()).filter(
      (tx) => tx.type === type
    );
  }

  /**
   * Get all transactions
   */
  getAllTransactions(): TransactionRecord[] {
    return Array.from(this.transactionHistory.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  /**
   * Get transaction statistics
   */
  getTransactionStats(): {
    total: number;
    pending: number;
    confirmed: number;
    failed: number;
    averageConfirmations: number;
  } {
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
  clearOldTransactions(maxAge: number = 86400000): void { // 24 hours
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
  private generateTransactionId(): string {
    return `tx-${uuidv4()}`;
  }
}

export const transactionService = new TransactionService();
export default transactionService;