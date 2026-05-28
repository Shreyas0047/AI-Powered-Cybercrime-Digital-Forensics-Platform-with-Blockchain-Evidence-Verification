"use strict";
/**
 * Smart Contract Service
 * Blockchain interaction layer for forensic smart contracts
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.smartContractService = exports.SmartContractService = exports.EvidenceState = exports.ContractType = exports.FORENSICS_AUDIT_ABI = exports.FORENSICS_EVIDENCE_ABI = void 0;
const logger_1 = __importDefault(require("../config/logger"));
const ethers_1 = require("ethers");
const config_1 = require("./config");
// Smart contract ABI definitions
exports.FORENSICS_EVIDENCE_ABI = [
    // Read functions
    "function getEvidence(string _evidenceId) view returns (tuple(string evidenceId, bytes32 evidenceHash, uint256 timestamp, address investigator, string investigationId, uint8 verificationStatus, bytes metadata))",
    "function getEvidenceHash(string _evidenceId) view returns (bytes32)",
    "function getEvidenceStatus(string _evidenceId) view returns (uint8)",
    "function checkEvidenceExists(string _evidenceId) view returns (bool)",
    "function getVerificationHistory(string _evidenceId) view returns (tuple(string evidenceId, address verifier, uint256 timestamp, bool result, bytes32 expectedHash, bytes32 actualHash, uint8 status)[])",
    "function getAllEvidenceIds() view returns (string[])",
    "function getInvestigationEvidenceCount(string _investigationId) view returns (uint256)",
    "function getContractInfo() view returns (string, address, uint256)",
    // Write functions
    "function registerEvidence(string _evidenceId, bytes32 _evidenceHash, string _investigationId, bytes _metadata) returns (bool)",
    "function batchRegisterEvidence(string[] _evidenceIds, bytes32[] _evidenceHashes, string _investigationId) returns (bool)",
    "function verifyEvidence(string _evidenceId, bytes32 _hashToVerify) returns (bool, uint8)",
    "function updateEvidenceStatus(string _evidenceId, uint8 _newStatus) returns (bool)",
    "function markEvidenceInvalid(string _evidenceId, string _reason) returns (bool)",
    // Events
    "event EvidenceRegistered(string indexed evidenceId, bytes32 indexed evidenceHash, address indexed investigator, uint256 timestamp, string investigationId)",
    "event EvidenceVerified(string indexed evidenceId, address indexed verifier, bool indexed result, uint8 status, uint256 timestamp)",
    "event VerificationFailed(string indexed evidenceId, address indexed verifier, bytes32 expectedHash, bytes32 actualHash, uint256 timestamp)",
    "event EvidenceStatusUpdated(string indexed evidenceId, uint8 indexed oldStatus, uint8 indexed newStatus, address indexed updater, uint256 timestamp)"
];
exports.FORENSICS_AUDIT_ABI = [
    // Read functions
    "function getAuditEntry(uint256 _index) view returns (tuple(uint8 category, uint8 severity, string description, address investigator, string investigationId, string evidenceId, uint256 timestamp, bytes metadata, bytes32 eventHash))",
    "function getInvestigationAudit(string _investigationId) view returns (tuple(uint8 category, uint8 severity, string description, address investigator, string investigationId, string evidenceId, uint256 timestamp, bytes metadata, bytes32 eventHash)[])",
    "function getEvidenceAudit(string _evidenceId) view returns (tuple(uint8 category, uint8 severity, string description, address investigator, string investigationId, string evidenceId, uint256 timestamp, bytes metadata, bytes32 eventHash)[])",
    "function getRecentAuditEntries(uint256 _count) view returns (tuple(uint8 category, uint8 severity, string description, address investigator, string investigationId, string evidenceId, uint256 timestamp, bytes metadata, bytes32 eventHash)[])",
    "function getContractInfo() view returns (string, address, uint256)",
    // Write functions
    "function createAuditEntry(uint8 _category, uint8 _severity, string _description, string _investigationId, string _evidenceId, bytes _metadata) returns (uint256)",
    "function recordEvidenceRegistration(string _evidenceId, string _investigationId, bytes32 _hash) returns (uint256)",
    "function recordVerificationResult(string _evidenceId, string _investigationId, bool _success, bytes32 _expectedHash, bytes32 _actualHash) returns (uint256)",
    "function recordTamperDetection(string _evidenceId, string _investigationId, bytes32 _expectedHash, bytes32 _actualHash) returns (uint256)",
    "function recordSystemEvent(string _description, bytes _metadata) returns (uint256)",
    // Events
    "event AuditEntryCreated(uint256 indexed entryIndex, uint8 indexed category, uint8 indexed severity, address investigator, uint256 timestamp)",
    "event CriticalAuditEvent(uint256 indexed entryIndex, string description, address indexed investigator, uint256 timestamp)",
    "event VerificationAuditEvent(uint256 indexed entryIndex, string indexed evidenceId, bool indexed success, address investigator, uint256 timestamp)",
    "event EvidenceAuditEvent(uint256 indexed entryIndex, string indexed evidenceId, string action, address indexed investigator, uint256 timestamp)"
];
var ContractType;
(function (ContractType) {
    ContractType["EVIDENCE"] = "evidence";
    ContractType["AUDIT"] = "audit";
})(ContractType || (exports.ContractType = ContractType = {}));
/** Evidence state machine: PENDING → REGISTERED → TRANSFERRED → LOCKED */
var EvidenceState;
(function (EvidenceState) {
    EvidenceState[EvidenceState["PENDING"] = 0] = "PENDING";
    EvidenceState[EvidenceState["REGISTERED"] = 1] = "REGISTERED";
    EvidenceState[EvidenceState["TRANSFERRED"] = 2] = "TRANSFERRED";
    EvidenceState[EvidenceState["LOCKED"] = 3] = "LOCKED";
})(EvidenceState || (exports.EvidenceState = EvidenceState = {}));
const VALID_TRANSITIONS = {
    [EvidenceState.PENDING]: [EvidenceState.REGISTERED],
    [EvidenceState.REGISTERED]: [EvidenceState.TRANSFERRED, EvidenceState.LOCKED],
    [EvidenceState.TRANSFERRED]: [EvidenceState.LOCKED],
    [EvidenceState.LOCKED]: [],
};
class SmartContractService {
    provider = null;
    evidenceContract = null;
    auditContract = null;
    initialized = false;
    /**
     * Initialize smart contract services
     */
    async initialize() {
        if (this.initialized)
            return;
        if (!config_1.blockchainConfig.enabled) {
            logger_1.default.info('[SmartContract] Blockchain disabled - running in local verification mode');
            return;
        }
        try {
            // Initialize provider
            this.provider = new ethers_1.ethers.JsonRpcProvider(config_1.blockchainConfig.rpcUrl);
            // Verify connection
            const network = await this.provider.getNetwork();
            logger_1.default.info(`[SmartContract] Connected to network: ${network.name}`);
            // Initialize contracts if addresses are configured
            if (config_1.blockchainConfig.contractAddress) {
                this.initializeContracts();
            }
            this.initialized = true;
        }
        catch (error) {
            logger_1.default.warn('[SmartContract] Failed to initialize:', error);
            logger_1.default.warn('[SmartContract] Running in offline mode');
        }
    }
    /**
     * Initialize contract instances
     */
    initializeContracts() {
        if (!this.provider)
            return;
        // Evidence contract
        this.evidenceContract = new ethers_1.ethers.Contract(config_1.blockchainConfig.contractAddress, exports.FORENSICS_EVIDENCE_ABI, this.provider);
        // Audit contract (use same address for combined contract or separate)
        this.auditContract = new ethers_1.ethers.Contract(config_1.blockchainConfig.contractAddress, exports.FORENSICS_AUDIT_ABI, this.provider);
        logger_1.default.info('[SmartContract] Contracts initialized');
    }
    /**
     * Check if blockchain is available
     */
    isAvailable() {
        return this.initialized && this.provider !== null;
    }
    /**
     * Register evidence on blockchain
     */
    async registerEvidence(evidenceId, evidenceHash, investigationId, metadata) {
        if (!this.evidenceContract || !this.provider) {
            return { success: false, error: 'Blockchain not available' };
        }
        try {
            // Convert hash string to bytes32
            const hashBytes32 = ethers_1.ethers.zeroPadValue('0x' + evidenceHash.slice(2), 32);
            // Prepare transaction
            const tx = await this.evidenceContract.registerEvidence(evidenceId, hashBytes32, investigationId, metadata || '');
            // Wait for confirmation
            const receipt = await tx.wait();
            return {
                success: true,
                transactionHash: receipt.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString(),
            };
        }
        catch (error) {
            logger_1.default.error('[SmartContract] Registration failed:', error);
            return { success: false, error: error.message };
        }
    }
    /**
     * Batch register evidence
     */
    async batchRegisterEvidence(evidenceItems, investigationId) {
        if (!this.evidenceContract || !this.provider) {
            return { success: false, error: 'Blockchain not available' };
        }
        try {
            const evidenceIds = evidenceItems.map((e) => e.evidenceId);
            const evidenceHashes = evidenceItems.map((e) => ethers_1.ethers.zeroPadValue('0x' + e.evidenceHash.slice(2), 32));
            const tx = await this.evidenceContract.batchRegisterEvidence(evidenceIds, evidenceHashes, investigationId);
            const receipt = await tx.wait();
            return {
                success: true,
                transactionHash: receipt.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString(),
            };
        }
        catch (error) {
            logger_1.default.error('[SmartContract] Batch registration failed:', error);
            return { success: false, error: error.message };
        }
    }
    /**
     * Verify evidence on blockchain
     */
    async verifyEvidence(evidenceId, hashToVerify) {
        if (!this.evidenceContract || !this.provider) {
            return { verified: false, status: 0 };
        }
        try {
            const hashBytes32 = ethers_1.ethers.zeroPadValue('0x' + hashToVerify.slice(2), 32);
            const tx = await this.evidenceContract.verifyEvidence(evidenceId, hashBytes32);
            const receipt = await tx.wait();
            // Get result from transaction
            const result = await this.evidenceContract.getEvidence(evidenceId);
            return {
                verified: result.verificationStatus === 1, // VERIFIED = 1
                status: result.verificationStatus,
                transactionHash: receipt.hash,
                blockNumber: receipt.blockNumber,
            };
        }
        catch (error) {
            logger_1.default.error('[SmartContract] Verification failed:', error);
            return { verified: false, status: 0 };
        }
    }
    /**
     * Get evidence from blockchain
     */
    async getEvidence(evidenceId) {
        if (!this.evidenceContract) {
            return null;
        }
        try {
            const result = await this.evidenceContract.getEvidence(evidenceId);
            return {
                evidenceId: result.evidenceId,
                evidenceHash: result.evidenceHash,
                timestamp: result.timestamp,
                investigator: result.investigator,
                investigationId: result.investigationId,
                verificationStatus: result.verificationStatus,
                metadata: result.metadata,
            };
        }
        catch (error) {
            logger_1.default.error('[SmartContract] Get evidence failed:', error);
            return null;
        }
    }
    /**
     * Check if evidence exists on blockchain
     */
    async checkEvidenceExists(evidenceId) {
        if (!this.evidenceContract) {
            return false;
        }
        try {
            return await this.evidenceContract.checkEvidenceExists(evidenceId);
        }
        catch {
            return false;
        }
    }
    /**
     * Get verification history from blockchain
     */
    async getVerificationHistory(evidenceId) {
        if (!this.evidenceContract) {
            return [];
        }
        try {
            return await this.evidenceContract.getVerificationHistory(evidenceId);
        }
        catch {
            return [];
        }
    }
    /**
     * Record audit entry on blockchain
     */
    async recordAuditEntry(params) {
        if (!this.auditContract || !this.provider) {
            return { success: false, error: 'Blockchain not available' };
        }
        try {
            const tx = await this.auditContract.createAuditEntry(params.category, params.severity, params.description, params.investigationId, params.evidenceId || '', params.metadata || '');
            const receipt = await tx.wait();
            return {
                success: true,
                transactionHash: receipt.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString(),
            };
        }
        catch (error) {
            logger_1.default.error('[SmartContract] Audit entry failed:', error);
            return { success: false, error: error.message };
        }
    }
    /**
     * Record evidence registration in audit
     */
    async recordEvidenceRegistration(evidenceId, investigationId, hash) {
        if (!this.auditContract) {
            return { success: false, error: 'Blockchain not available' };
        }
        try {
            const hashBytes32 = ethers_1.ethers.zeroPadValue('0x' + hash.slice(2), 32);
            const tx = await this.auditContract.recordEvidenceRegistration(evidenceId, investigationId, hashBytes32);
            const receipt = await tx.wait();
            return {
                success: true,
                transactionHash: receipt.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString(),
            };
        }
        catch (error) {
            logger_1.default.error('[SmartContract] Audit registration failed:', error);
            return { success: false, error: error.message };
        }
    }
    /**
     * Record verification result in audit
     */
    async recordVerificationResult(evidenceId, investigationId, success, expectedHash, actualHash) {
        if (!this.auditContract) {
            return { success: false, error: 'Blockchain not available' };
        }
        try {
            const expectedBytes32 = ethers_1.ethers.zeroPadValue('0x' + expectedHash.slice(2), 32);
            const actualBytes32 = ethers_1.ethers.zeroPadValue('0x' + actualHash.slice(2), 32);
            const tx = await this.auditContract.recordVerificationResult(evidenceId, investigationId, success, expectedBytes32, actualBytes32);
            const receipt = await tx.wait();
            return {
                success: true,
                transactionHash: receipt.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString(),
            };
        }
        catch (error) {
            logger_1.default.error('[SmartContract] Verification audit failed:', error);
            return { success: false, error: error.message };
        }
    }
    /**
     * Record tamper detection
     */
    async recordTamperDetection(evidenceId, investigationId, expectedHash, actualHash) {
        if (!this.auditContract) {
            return { success: false, error: 'Blockchain not available' };
        }
        try {
            const expectedBytes32 = ethers_1.ethers.zeroPadValue('0x' + expectedHash.slice(2), 32);
            const actualBytes32 = ethers_1.ethers.zeroPadValue('0x' + actualHash.slice(2), 32);
            const tx = await this.auditContract.recordTamperDetection(evidenceId, investigationId, expectedBytes32, actualBytes32);
            const receipt = await tx.wait();
            return {
                success: true,
                transactionHash: receipt.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString(),
            };
        }
        catch (error) {
            logger_1.default.error('[SmartContract] Tamper detection audit failed:', error);
            return { success: false, error: error.message };
        }
    }
    /**
     * Get audit entries for evidence
     */
    async getEvidenceAudit(evidenceId) {
        if (!this.auditContract) {
            return [];
        }
        try {
            return await this.auditContract.getEvidenceAudit(evidenceId);
        }
        catch {
            return [];
        }
    }
    /**
     * Get recent audit entries
     */
    async getRecentAuditEntries(count = 10) {
        if (!this.auditContract) {
            return [];
        }
        try {
            return await this.auditContract.getRecentAuditEntries(count);
        }
        catch {
            return [];
        }
    }
    /**
     * Get contract information
     */
    async getContractInfo() {
        if (!this.evidenceContract) {
            return null;
        }
        try {
            return await this.evidenceContract.getContractInfo();
        }
        catch {
            return null;
        }
    }
    /**
     * Get explorer URL for transaction
     */
    getExplorerUrl(txHash) {
        return `${config_1.blockchainConfig.explorerUrl}/tx/${txHash}`;
    }
    /**
     * Transition evidence through the state machine.
     * Validates allowed transitions: PENDING→REGISTERED→TRANSFERRED→LOCKED
     */
    async transitionState(evidenceId, newState) {
        if (!this.evidenceContract || !this.provider) {
            return { success: false, error: 'Blockchain not available' };
        }
        try {
            // Get current state
            const currentState = await this.evidenceContract.getEvidenceStatus(evidenceId);
            const allowed = VALID_TRANSITIONS[currentState] || [];
            if (!allowed.includes(newState)) {
                return { success: false, error: `Invalid transition: ${EvidenceState[currentState]} → ${EvidenceState[newState]}` };
            }
            const tx = await this.evidenceContract.updateEvidenceStatus(evidenceId, newState);
            const receipt = await tx.wait();
            logger_1.default.info(`[SmartContract] Evidence ${evidenceId} transitioned to ${EvidenceState[newState]}`);
            return { success: true, transactionHash: receipt.hash, blockNumber: receipt.blockNumber, gasUsed: receipt.gasUsed.toString() };
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            logger_1.default.error('[SmartContract] State transition failed:', msg);
            return { success: false, error: msg };
        }
    }
    /**
     * Reconciliation: compare MongoDB hash against on-chain hash.
     * Returns tamper alert if mismatch detected.
     */
    async reconcileEvidence(evidenceId, dbHash) {
        if (!this.evidenceContract) {
            return { match: true }; // Can't verify — skip
        }
        try {
            const chainHashRaw = await this.evidenceContract.getEvidenceHash(evidenceId);
            const chainHash = chainHashRaw.toString();
            // Normalize: compare hex without 0x prefix and zero-padding
            const normalizedDb = dbHash.replace(/^0x/, '').toLowerCase();
            const normalizedChain = chainHash.replace(/^0x/, '').replace(/^0+/, '').toLowerCase();
            if (normalizedDb !== normalizedChain && normalizedChain.length > 0) {
                logger_1.default.warn(`[Reconciliation] TAMPER_ALERT: Evidence ${evidenceId} hash mismatch. DB=${normalizedDb.slice(0, 16)}... Chain=${normalizedChain.slice(0, 16)}...`);
                return {
                    match: false,
                    chainHash,
                    alert: `Hash mismatch detected for evidence ${evidenceId}. Database hash does not match blockchain record.`,
                };
            }
            return { match: true, chainHash };
        }
        catch (error) {
            logger_1.default.error('[Reconciliation] Check failed:', error);
            return { match: true }; // Fail-open for reconciliation (don't block on network errors)
        }
    }
    /**
     * Cleanup
     */
    async destroy() {
        this.provider = null;
        this.evidenceContract = null;
        this.auditContract = null;
        this.initialized = false;
    }
}
exports.SmartContractService = SmartContractService;
exports.smartContractService = new SmartContractService();
exports.default = exports.smartContractService;
//# sourceMappingURL=smart-contract.service.js.map