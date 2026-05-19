"use strict";
/**
 * Blockchain Routes
 * API endpoints for blockchain verification
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const middleware_1 = require("../../middleware");
const blockchain_controller_1 = require("../controllers/blockchain.controller");
const router = (0, express_1.Router)();
/**
 * @route   GET /api/v1/blockchain/status
 * @desc    Get blockchain connection status
 * @access  Private (Authenticated)
 */
router.get('/status', middleware_1.authenticate, blockchain_controller_1.blockchainController.getStatus);
/**
 * @route   GET /api/v1/blockchain/verification/stats
 * @desc    Get verification statistics
 * @access  Private (Authenticated)
 */
router.get('/verification/stats', middleware_1.authenticate, blockchain_controller_1.blockchainController.getVerificationStats);
/**
 * @route   POST /api/v1/blockchain/evidence/register
 * @desc    Register evidence for blockchain verification
 * @access  Private (Authenticated, Admin/Analyst)
 */
router.post('/evidence/register', middleware_1.authenticate, (0, middleware_1.authorize)(['admin', 'analyst']), blockchain_controller_1.blockchainController.registerEvidence);
/**
 * @route   POST /api/v1/blockchain/evidence/verify
 * @desc    Verify evidence integrity
 * @access  Private (Authenticated, Admin/Analyst)
 */
router.post('/evidence/verify', middleware_1.authenticate, (0, middleware_1.authorize)(['admin', 'analyst']), blockchain_controller_1.blockchainController.verifyEvidence);
/**
 * @route   POST /api/v1/blockchain/evidence/batch-verify
 * @desc    Batch verify multiple evidence items
 * @access  Private (Authenticated, Admin/Analyst)
 */
router.post('/evidence/batch-verify', middleware_1.authenticate, (0, middleware_1.authorize)(['admin', 'analyst']), blockchain_controller_1.blockchainController.batchVerify);
/**
 * @route   POST /api/v1/blockchain/package/create
 * @desc    Create evidence package hash
 * @access  Private (Authenticated, Admin/Analyst)
 */
router.post('/package/create', middleware_1.authenticate, (0, middleware_1.authorize)(['admin', 'analyst']), blockchain_controller_1.blockchainController.createPackage);
/**
 * @route   POST /api/v1/blockchain/package/verify
 * @desc    Verify evidence package
 * @access  Private (Authenticated, Admin/Analyst)
 */
router.post('/package/verify', middleware_1.authenticate, (0, middleware_1.authorize)(['admin', 'analyst']), blockchain_controller_1.blockchainController.verifyPackage);
/**
 * @route   GET /api/v1/blockchain/audit
 * @desc    Get blockchain audit log
 * @access  Private (Authenticated, Admin)
 */
router.get('/audit', middleware_1.authenticate, (0, middleware_1.authorize)(['admin']), blockchain_controller_1.blockchainController.getAuditLog);
/**
 * @route   GET /api/v1/blockchain/integrity/:investigationId
 * @desc    Get integrity records for investigation
 * @access  Private (Authenticated)
 */
router.get('/integrity/:investigationId', middleware_1.authenticate, blockchain_controller_1.blockchainController.getInvestigationIntegrity);
/**
 * @route   GET /api/v1/blockchain/alerts
 * @desc    Get tamper alerts
 * @access  Private (Authenticated, Admin/Analyst)
 */
router.get('/alerts', middleware_1.authenticate, (0, middleware_1.authorize)(['admin', 'analyst']), blockchain_controller_1.blockchainController.getTamperAlerts);
/**
 * @route   POST /api/v1/blockchain/alerts/:evidenceId/:alertId/acknowledge
 * @desc    Acknowledge tamper alert
 * @access  Private (Authenticated, Admin)
 */
router.post('/alerts/:evidenceId/:alertId/acknowledge', middleware_1.authenticate, (0, middleware_1.authorize)(['admin']), blockchain_controller_1.blockchainController.acknowledgeAlert);
/**
 * @route   GET /api/v1/blockchain/verification/history/:evidenceId
 * @desc    Get verification history for evidence
 * @access  Private (Authenticated)
 */
router.get('/verification/history/:evidenceId', middleware_1.authenticate, blockchain_controller_1.blockchainController.getVerificationHistory);
/**
 * @route   POST /api/v1/blockchain/hash/generate
 * @desc    Generate hash for raw data
 * @access  Private (Authenticated)
 */
router.post('/hash/generate', middleware_1.authenticate, blockchain_controller_1.blockchainController.generateHash);
/**
 * @route   POST /api/v1/blockchain/hash/verify
 * @desc    Verify hash matches expected
 * @access  Private (Authenticated)
 */
router.post('/hash/verify', middleware_1.authenticate, blockchain_controller_1.blockchainController.verifyHash);
// ============================================
// SMART CONTRACT OPERATIONS
// ============================================
/**
 * @route   POST /api/v1/blockchain/contract/register
 * @desc    Register evidence on smart contract
 * @access  Private (Authenticated, Admin/Analyst)
 */
router.post('/contract/register', middleware_1.authenticate, (0, middleware_1.authorize)(['admin', 'analyst']), blockchain_controller_1.blockchainController.registerOnContract);
/**
 * @route   POST /api/v1/blockchain/contract/verify
 * @desc    Verify evidence on smart contract
 * @access  Private (Authenticated, Admin/Analyst)
 */
router.post('/contract/verify', middleware_1.authenticate, (0, middleware_1.authorize)(['admin', 'analyst']), blockchain_controller_1.blockchainController.verifyOnContract);
/**
 * @route   GET /api/v1/blockchain/contract/evidence/:evidenceId
 * @desc    Get evidence info from smart contract
 * @access  Private (Authenticated)
 */
router.get('/contract/evidence/:evidenceId', middleware_1.authenticate, blockchain_controller_1.blockchainController.getContractEvidence);
/**
 * @route   GET /api/v1/blockchain/contract/exists/:evidenceId
 * @desc    Check if evidence exists on blockchain
 * @access  Private (Authenticated)
 */
router.get('/contract/exists/:evidenceId', middleware_1.authenticate, blockchain_controller_1.blockchainController.checkContractEvidence);
// ============================================
// TRANSACTION MANAGEMENT
// ============================================
/**
 * @route   GET /api/v1/blockchain/transactions
 * @desc    Get transaction history
 * @access  Private (Authenticated)
 */
router.get('/transactions', middleware_1.authenticate, blockchain_controller_1.blockchainController.getTransactions);
/**
 * @route   GET /api/v1/blockchain/transactions/stats
 * @desc    Get transaction statistics
 * @access  Private (Authenticated)
 */
router.get('/transactions/stats', middleware_1.authenticate, blockchain_controller_1.blockchainController.getTransactionStats);
/**
 * @route   POST /api/v1/blockchain/transactions/:txId/retry
 * @desc    Retry failed transaction
 * @access  Private (Authenticated, Admin)
 */
router.post('/transactions/:txId/retry', middleware_1.authenticate, (0, middleware_1.authorize)(['admin']), blockchain_controller_1.blockchainController.retryTransaction);
// ============================================
// AUDIT OPERATIONS
// ============================================
/**
 * @route   POST /api/v1/blockchain/audit/record
 * @desc    Record audit entry on blockchain
 * @access  Private (Authenticated, Admin/Analyst)
 */
router.post('/audit/record', middleware_1.authenticate, (0, middleware_1.authorize)(['admin', 'analyst']), blockchain_controller_1.blockchainController.recordAuditEntry);
/**
 * @route   GET /api/v1/blockchain/audit/evidence/:evidenceId
 * @desc    Get audit entries for evidence from blockchain
 * @access  Private (Authenticated)
 */
router.get('/audit/evidence/:evidenceId', middleware_1.authenticate, blockchain_controller_1.blockchainController.getEvidenceAuditFromChain);
// ============================================
// TAMPER DETECTION
// ============================================
/**
 * @route   POST /api/v1/blockchain/tamper/record
 * @desc    Record tamper detection on blockchain
 * @access  Private (Authenticated, Admin)
 */
router.post('/tamper/record', middleware_1.authenticate, (0, middleware_1.authorize)(['admin']), blockchain_controller_1.blockchainController.recordTamperDetection);
// ============================================
// BLOCKCHAIN EXPLORER
// ============================================
/**
 * @route   GET /api/v1/blockchain/explorer/tx/:txHash
 * @desc    Get explorer URL for transaction
 * @access  Private (Authenticated)
 */
router.get('/explorer/tx/:txHash', middleware_1.authenticate, blockchain_controller_1.blockchainController.getExplorerUrl);
// ============================================
// SYNCHRONIZATION OPERATIONS
// ============================================
/**
 * @route   GET /api/v1/blockchain/sync/status
 * @desc    Get synchronization status
 * @access  Private (Authenticated)
 */
router.get('/sync/status', middleware_1.authenticate, blockchain_controller_1.blockchainController.getSyncStatus);
/**
 * @route   POST /api/v1/blockchain/sync/queue
 * @desc    Queue evidence for blockchain sync
 * @access  Private (Authenticated, Admin/Analyst)
 */
router.post('/sync/queue', middleware_1.authenticate, (0, middleware_1.authorize)(['admin', 'analyst']), blockchain_controller_1.blockchainController.queueForSync);
/**
 * @route   POST /api/v1/blockchain/sync/process
 * @desc    Process synchronization queue
 * @access  Private (Authenticated, Admin)
 */
router.post('/sync/process', middleware_1.authenticate, (0, middleware_1.authorize)(['admin']), blockchain_controller_1.blockchainController.processSyncQueue);
/**
 * @route   POST /api/v1/blockchain/sync/retry
 * @desc    Retry failed sync operations
 * @access  Private (Authenticated, Admin)
 */
router.post('/sync/retry', middleware_1.authenticate, (0, middleware_1.authorize)(['admin']), blockchain_controller_1.blockchainController.retryFailedSync);
/**
 * @route   GET /api/v1/blockchain/sync/consistency/:evidenceId
 * @desc    Check evidence-chain consistency
 * @access  Private (Authenticated)
 */
router.get('/sync/consistency/:evidenceId', middleware_1.authenticate, blockchain_controller_1.blockchainController.checkConsistency);
// ============================================
// VERIFICATION WORKER OPERATIONS
// ============================================
/**
 * @route   GET /api/v1/blockchain/worker/status
 * @desc    Get verification worker status
 * @access  Private (Authenticated)
 */
router.get('/worker/status', middleware_1.authenticate, blockchain_controller_1.blockchainController.getWorkerStatus);
/**
 * @route   POST /api/v1/blockchain/worker/job
 * @desc    Create verification job
 * @access  Private (Authenticated, Admin/Analyst)
 */
router.post('/worker/job', middleware_1.authenticate, (0, middleware_1.authorize)(['admin', 'analyst']), blockchain_controller_1.blockchainController.createVerificationJob);
/**
 * @route   GET /api/v1/blockchain/worker/job/:jobId
 * @desc    Get verification job status
 * @access  Private (Authenticated)
 */
router.get('/worker/job/:jobId', middleware_1.authenticate, blockchain_controller_1.blockchainController.getJobStatus);
/**
 * @route   POST /api/v1/blockchain/worker/job/:jobId/cancel
 * @desc    Cancel verification job
 * @access  Private (Authenticated, Admin)
 */
router.post('/worker/job/:jobId/cancel', middleware_1.authenticate, (0, middleware_1.authorize)(['admin']), blockchain_controller_1.blockchainController.cancelJob);
/**
 * @route   POST /api/v1/blockchain/worker/schedule
 * @desc    Create verification schedule
 * @access  Private (Authenticated, Admin)
 */
router.post('/worker/schedule', middleware_1.authenticate, (0, middleware_1.authorize)(['admin']), blockchain_controller_1.blockchainController.createSchedule);
// ============================================
// RECONCILIATION OPERATIONS
// ============================================
/**
 * @route   POST /api/v1/blockchain/reconciliation/run
 * @desc    Run full reconciliation
 * @access  Private (Authenticated, Admin)
 */
router.post('/reconciliation/run', middleware_1.authenticate, (0, middleware_1.authorize)(['admin']), blockchain_controller_1.blockchainController.runReconciliation);
/**
 * @route   GET /api/v1/blockchain/reconciliation/issues
 * @desc    Get active reconciliation issues
 * @access  Private (Authenticated)
 */
router.get('/reconciliation/issues', middleware_1.authenticate, blockchain_controller_1.blockchainController.getReconciliationIssues);
/**
 * @route   POST /api/v1/blockchain/reconciliation/issues/:issueId/resolve
 * @desc    Resolve reconciliation issue
 * @access  Private (Authenticated, Admin)
 */
router.post('/reconciliation/issues/:issueId/resolve', middleware_1.authenticate, (0, middleware_1.authorize)(['admin']), blockchain_controller_1.blockchainController.resolveIssue);
/**
 * @route   GET /api/v1/blockchain/reconciliation/stats
 * @desc    Get reconciliation statistics
 * @access  Private (Authenticated)
 */
router.get('/reconciliation/stats', middleware_1.authenticate, blockchain_controller_1.blockchainController.getReconciliationStats);
/**
 * @route   GET /api/v1/blockchain/reconciliation/check/:evidenceId
 * @desc    Check specific evidence consistency
 * @access  Private (Authenticated)
 */
router.get('/reconciliation/check/:evidenceId', middleware_1.authenticate, blockchain_controller_1.blockchainController.checkEvidenceReconciliation);
// ============================================
// STATE TRACKING OPERATIONS
// ============================================
/**
 * @route   GET /api/v1/blockchain/state
 * @desc    Get blockchain state
 * @access  Private (Authenticated)
 */
router.get('/state', middleware_1.authenticate, blockchain_controller_1.blockchainController.getBlockchainState);
/**
 * @route   GET /api/v1/blockchain/state/health
 * @desc    Get health metrics
 * @access  Private (Authenticated)
 */
router.get('/state/health', middleware_1.authenticate, blockchain_controller_1.blockchainController.getHealthMetrics);
/**
 * @route   GET /api/v1/blockchain/state/metrics
 * @desc    Get performance metrics
 * @access  Private (Authenticated)
 */
router.get('/state/metrics', middleware_1.authenticate, blockchain_controller_1.blockchainController.getPerformanceMetrics);
/**
 * @route   GET /api/v1/blockchain/state/operations
 * @desc    Get operation history
 * @access  Private (Authenticated, Admin)
 */
router.get('/state/operations', middleware_1.authenticate, (0, middleware_1.authorize)(['admin']), blockchain_controller_1.blockchainController.getOperationHistory);
exports.default = router;
//# sourceMappingURL=blockchain.routes.js.map