/**
 * Blockchain Module - Index
 * Centralized exports for blockchain integration
 */

export * from './config';
export * from './types';
export { BlockchainService, blockchainService } from './blockchain.service';
export { EvidenceHashingService, evidenceHashingService } from './hashing.service';
export { VerificationService, verificationService } from './verification.service';
export { BlockchainVerificationService, blockchainVerificationService } from './verification-orchestrator.service';
export { SmartContractService, smartContractService, FORENSICS_EVIDENCE_ABI, FORENSICS_AUDIT_ABI } from './smart-contract.service';
export { TransactionService, transactionService } from './transaction.service';
export { BlockchainSyncService, blockchainSyncService } from './synchronization.service';
export { DistributedVerificationService, distributedVerificationService } from './verification-worker.service';
export { BlockchainReconciliationService, blockchainReconciliationService } from './reconciliation.service';
export { BlockchainStateTrackingService, blockchainStateTrackingService } from './state-tracking.service';

import { blockchainService } from './blockchain.service';
import { evidenceHashingService } from './hashing.service';
import { verificationService } from './verification.service';
import { blockchainVerificationService } from './verification-orchestrator.service';
import { smartContractService } from './smart-contract.service';
import { transactionService } from './transaction.service';
import { blockchainSyncService } from './synchronization.service';
import { distributedVerificationService } from './verification-worker.service';
import { blockchainReconciliationService } from './reconciliation.service';
import { blockchainStateTrackingService } from './state-tracking.service';

export const blockchainServices = {
  blockchain: blockchainService,
  hashing: evidenceHashingService,
  verification: verificationService,
  orchestrator: blockchainVerificationService,
  smartContract: smartContractService,
  transaction: transactionService,
  sync: blockchainSyncService,
  worker: distributedVerificationService,
  reconciliation: blockchainReconciliationService,
  state: blockchainStateTrackingService,
};

export default blockchainServices;
