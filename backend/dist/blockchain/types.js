"use strict";
/**
 * Blockchain Types and Interfaces
 * Type definitions for blockchain evidence verification
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockchainEventType = exports.EvidenceIntegrityState = exports.VerificationStatus = void 0;
var VerificationStatus;
(function (VerificationStatus) {
    VerificationStatus["PENDING"] = "pending";
    VerificationStatus["VERIFIED"] = "verified";
    VerificationStatus["FAILED"] = "failed";
    VerificationStatus["MODIFIED"] = "modified";
    VerificationStatus["ON_CHAIN"] = "on_chain";
    VerificationStatus["SYNCING"] = "syncing";
})(VerificationStatus || (exports.VerificationStatus = VerificationStatus = {}));
var EvidenceIntegrityState;
(function (EvidenceIntegrityState) {
    EvidenceIntegrityState["INTACT"] = "intact";
    EvidenceIntegrityState["MODIFIED"] = "modified";
    EvidenceIntegrityState["UNKNOWN"] = "unknown";
    EvidenceIntegrityState["VERIFICATION_FAILED"] = "verification_failed";
})(EvidenceIntegrityState || (exports.EvidenceIntegrityState = EvidenceIntegrityState = {}));
var BlockchainEventType;
(function (BlockchainEventType) {
    BlockchainEventType["EVIDENCE_REGISTERED"] = "evidence_registered";
    BlockchainEventType["EVIDENCE_VERIFIED"] = "evidence_verified";
    BlockchainEventType["VERIFICATION_FAILED"] = "verification_failed";
    BlockchainEventType["HASH_MISMATCH"] = "hash_mismatch";
    BlockchainEventType["TAMPER_DETECTED"] = "tamper_detected";
    BlockchainEventType["CHAIN_SYNC_COMPLETE"] = "chain_sync_complete";
})(BlockchainEventType || (exports.BlockchainEventType = BlockchainEventType = {}));
//# sourceMappingURL=types.js.map