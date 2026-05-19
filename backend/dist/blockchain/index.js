"use strict";
/**
 * Blockchain Module - Index
 * Centralized exports for blockchain integration
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.blockchainServices = exports.blockchainStateTrackingService = exports.BlockchainStateTrackingService = exports.blockchainReconciliationService = exports.BlockchainReconciliationService = exports.distributedVerificationService = exports.DistributedVerificationService = exports.blockchainSyncService = exports.BlockchainSyncService = exports.transactionService = exports.TransactionService = exports.FORENSICS_AUDIT_ABI = exports.FORENSICS_EVIDENCE_ABI = exports.smartContractService = exports.SmartContractService = exports.blockchainVerificationService = exports.BlockchainVerificationService = exports.verificationService = exports.VerificationService = exports.evidenceHashingService = exports.EvidenceHashingService = exports.blockchainService = exports.BlockchainService = void 0;
__exportStar(require("./config"), exports);
__exportStar(require("./types"), exports);
var blockchain_service_1 = require("./blockchain.service");
Object.defineProperty(exports, "BlockchainService", { enumerable: true, get: function () { return blockchain_service_1.BlockchainService; } });
Object.defineProperty(exports, "blockchainService", { enumerable: true, get: function () { return blockchain_service_1.blockchainService; } });
var hashing_service_1 = require("./hashing.service");
Object.defineProperty(exports, "EvidenceHashingService", { enumerable: true, get: function () { return hashing_service_1.EvidenceHashingService; } });
Object.defineProperty(exports, "evidenceHashingService", { enumerable: true, get: function () { return hashing_service_1.evidenceHashingService; } });
var verification_service_1 = require("./verification.service");
Object.defineProperty(exports, "VerificationService", { enumerable: true, get: function () { return verification_service_1.VerificationService; } });
Object.defineProperty(exports, "verificationService", { enumerable: true, get: function () { return verification_service_1.verificationService; } });
var verification_orchestrator_service_1 = require("./verification-orchestrator.service");
Object.defineProperty(exports, "BlockchainVerificationService", { enumerable: true, get: function () { return verification_orchestrator_service_1.BlockchainVerificationService; } });
Object.defineProperty(exports, "blockchainVerificationService", { enumerable: true, get: function () { return verification_orchestrator_service_1.blockchainVerificationService; } });
var smart_contract_service_1 = require("./smart-contract.service");
Object.defineProperty(exports, "SmartContractService", { enumerable: true, get: function () { return smart_contract_service_1.SmartContractService; } });
Object.defineProperty(exports, "smartContractService", { enumerable: true, get: function () { return smart_contract_service_1.smartContractService; } });
Object.defineProperty(exports, "FORENSICS_EVIDENCE_ABI", { enumerable: true, get: function () { return smart_contract_service_1.FORENSICS_EVIDENCE_ABI; } });
Object.defineProperty(exports, "FORENSICS_AUDIT_ABI", { enumerable: true, get: function () { return smart_contract_service_1.FORENSICS_AUDIT_ABI; } });
var transaction_service_1 = require("./transaction.service");
Object.defineProperty(exports, "TransactionService", { enumerable: true, get: function () { return transaction_service_1.TransactionService; } });
Object.defineProperty(exports, "transactionService", { enumerable: true, get: function () { return transaction_service_1.transactionService; } });
var synchronization_service_1 = require("./synchronization.service");
Object.defineProperty(exports, "BlockchainSyncService", { enumerable: true, get: function () { return synchronization_service_1.BlockchainSyncService; } });
Object.defineProperty(exports, "blockchainSyncService", { enumerable: true, get: function () { return synchronization_service_1.blockchainSyncService; } });
var verification_worker_service_1 = require("./verification-worker.service");
Object.defineProperty(exports, "DistributedVerificationService", { enumerable: true, get: function () { return verification_worker_service_1.DistributedVerificationService; } });
Object.defineProperty(exports, "distributedVerificationService", { enumerable: true, get: function () { return verification_worker_service_1.distributedVerificationService; } });
var reconciliation_service_1 = require("./reconciliation.service");
Object.defineProperty(exports, "BlockchainReconciliationService", { enumerable: true, get: function () { return reconciliation_service_1.BlockchainReconciliationService; } });
Object.defineProperty(exports, "blockchainReconciliationService", { enumerable: true, get: function () { return reconciliation_service_1.blockchainReconciliationService; } });
var state_tracking_service_1 = require("./state-tracking.service");
Object.defineProperty(exports, "BlockchainStateTrackingService", { enumerable: true, get: function () { return state_tracking_service_1.BlockchainStateTrackingService; } });
Object.defineProperty(exports, "blockchainStateTrackingService", { enumerable: true, get: function () { return state_tracking_service_1.blockchainStateTrackingService; } });
const blockchain_service_2 = require("./blockchain.service");
const hashing_service_2 = require("./hashing.service");
const verification_service_2 = require("./verification.service");
const verification_orchestrator_service_2 = require("./verification-orchestrator.service");
const smart_contract_service_2 = require("./smart-contract.service");
const transaction_service_2 = require("./transaction.service");
const synchronization_service_2 = require("./synchronization.service");
const verification_worker_service_2 = require("./verification-worker.service");
const reconciliation_service_2 = require("./reconciliation.service");
const state_tracking_service_2 = require("./state-tracking.service");
exports.blockchainServices = {
    blockchain: blockchain_service_2.blockchainService,
    hashing: hashing_service_2.evidenceHashingService,
    verification: verification_service_2.verificationService,
    orchestrator: verification_orchestrator_service_2.blockchainVerificationService,
    smartContract: smart_contract_service_2.smartContractService,
    transaction: transaction_service_2.transactionService,
    sync: synchronization_service_2.blockchainSyncService,
    worker: verification_worker_service_2.distributedVerificationService,
    reconciliation: reconciliation_service_2.blockchainReconciliationService,
    state: state_tracking_service_2.blockchainStateTrackingService,
};
exports.default = exports.blockchainServices;
//# sourceMappingURL=index.js.map