"use strict";
/**
 * Blockchain Evidence Model
 * MongoDB schema for blockchain-verified evidence records
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
exports.EvidencePackageHash = exports.BlockchainAudit = exports.EvidenceIntegrity = exports.BlockchainVerification = exports.EvidenceIntegrityState = exports.BlockchainVerificationStatus = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const types_1 = require("../types");
// ============================================
// VERIFICATION STATUS ENUM
// ============================================
exports.BlockchainVerificationStatus = types_1.VerificationStatus;
// ============================================
// EVIDENCE INTEGRITY STATE
// ============================================
exports.EvidenceIntegrityState = types_1.EvidenceIntegrityState;
// ============================================
// VERIFICATION RECORD
// ============================================
const verificationRecordSchema = new mongoose_1.Schema({
    id: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    hash: { type: String, required: true },
    status: {
        type: String,
        enum: Object.values(exports.BlockchainVerificationStatus),
        required: true,
    },
    method: {
        type: String,
        enum: ['local', 'blockchain', 'both'],
        default: 'local',
    },
    verifiedBy: { type: String, required: true },
    details: String,
}, { _id: false });
// ============================================
// TAMPER ALERT
// ============================================
const tamperAlertSchema = new mongoose_1.Schema({
    id: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    evidenceId: { type: String, required: true },
    detectedAt: { type: Date, required: true },
    expectedHash: { type: String, required: true },
    actualHash: { type: String, required: true },
    severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'critical',
    },
    acknowledged: { type: Boolean, default: false },
    acknowledgedBy: String,
    acknowledgedAt: Date,
    notes: String,
}, { _id: false });
// ============================================
// BLOCKCHAIN VERIFICATION SCHEMA
// ============================================
const blockchainVerificationSchema = new mongoose_1.Schema({
    evidenceId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Evidence',
        required: true,
        index: true,
    },
    // Evidence fingerprint
    fingerprint: {
        type: String,
        required: true,
        index: true,
    },
    algorithm: {
        type: String,
        enum: ['sha256', 'sha3-256'],
        default: 'sha256',
    },
    // Blockchain verification
    transactionHash: {
        type: String,
        index: true,
    },
    blockNumber: Number,
    blockTimestamp: Date,
    chainId: Number,
    // Status
    status: {
        type: String,
        enum: Object.values(exports.BlockchainVerificationStatus),
        default: exports.BlockchainVerificationStatus.PENDING,
        index: true,
    },
    // Verification result
    verificationResult: {
        type: Boolean,
        default: false,
    },
    verificationDetails: String,
    // Metadata
    verifiedAt: Date,
    verifiedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    // Previous chain reference
    previousFingerprint: String,
    chainPosition: {
        type: Number,
        default: 0,
    },
}, {
    timestamps: true,
    toJSON: {
        transform: (doc, ret) => {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            return ret;
        },
    },
});
// ============================================
// EVIDENCE INTEGRITY RECORD SCHEMA
// ============================================
const evidenceIntegritySchema = new mongoose_1.Schema({
    evidenceId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Evidence',
        required: true,
        unique: true,
    },
    // Hash information
    currentHash: {
        type: String,
        required: true,
        index: true,
    },
    previousHash: String,
    // Integrity state
    integrityState: {
        type: String,
        enum: Object.values(exports.EvidenceIntegrityState),
        default: exports.EvidenceIntegrityState.UNKNOWN,
    },
    // Verification tracking
    lastVerifiedAt: Date,
    lastVerificationStatus: {
        type: String,
        enum: Object.values(exports.BlockchainVerificationStatus),
    },
    // History
    verificationHistory: [verificationRecordSchema],
    tamperAlerts: [tamperAlertSchema],
    // Blockchain links
    blockchainVerified: {
        type: Boolean,
        default: false,
    },
    blockchainTxHash: String,
    blockchainBlockNumber: Number,
}, {
    timestamps: true,
    toJSON: {
        transform: (doc, ret) => {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            return ret;
        },
    },
});
// ============================================
// BLOCKCHAIN AUDIT LOG SCHEMA
// ============================================
const blockchainAuditSchema = new mongoose_1.Schema({
    evidenceId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Evidence',
        index: true,
    },
    // Event information
    eventType: {
        type: String,
        required: true,
        index: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true,
    },
    // Transaction info
    transactionHash: String,
    blockNumber: Number,
    // Details
    details: {
        type: String,
        required: true,
    },
    // Performed by
    performedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    // Metadata
    metadata: mongoose_1.Schema.Types.Mixed,
}, {
    timestamps: true,
    toJSON: {
        transform: (doc, ret) => {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            return ret;
        },
    },
});
// ============================================
// EVIDENCE PACKAGE HASH SCHEMA
// ============================================
const evidencePackageHashSchema = new mongoose_1.Schema({
    packageId: {
        type: String,
        required: true,
        unique: true,
    },
    // Investigation reference
    investigationId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Investigation',
        required: true,
        index: true,
    },
    // Package hashes
    rootHash: {
        type: String,
        required: true,
    },
    evidenceHashes: [{
            evidenceId: String,
            hash: String,
            fileName: String,
        }],
    manifestHash: String,
    // Metadata
    evidenceCount: {
        type: Number,
        default: 0,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    // Verification
    verificationCount: {
        type: Number,
        default: 0,
    },
    lastVerifiedAt: Date,
    lastVerificationStatus: {
        type: String,
        enum: Object.values(exports.BlockchainVerificationStatus),
    },
    // Blockchain
    blockchainRegistered: {
        type: Boolean,
        default: false,
    },
    transactionHash: String,
    blockNumber: Number,
}, {
    timestamps: true,
    toJSON: {
        transform: (doc, ret) => {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            return ret;
        },
    },
});
// ============================================
// CREATE MODELS
// ============================================
exports.BlockchainVerification = mongoose_1.default.model('BlockchainVerification', blockchainVerificationSchema);
exports.EvidenceIntegrity = mongoose_1.default.model('EvidenceIntegrity', evidenceIntegritySchema);
exports.BlockchainAudit = mongoose_1.default.model('BlockchainAudit', blockchainAuditSchema);
exports.EvidencePackageHash = mongoose_1.default.model('EvidencePackageHash', evidencePackageHashSchema);
// ============================================
// INDEXES
// ============================================
blockchainAuditSchema.index({ evidenceId: 1, eventType: 1 });
blockchainAuditSchema.index({ timestamp: -1 });
blockchainAuditSchema.index({ transactionHash: 1 });
evidenceIntegritySchema.index({ integrityState: 1 });
evidenceIntegritySchema.index({ lastVerifiedAt: -1 });
evidencePackageHashSchema.index({ rootHash: 1 });
blockchainVerificationSchema.index({ fingerprint: 1, status: 1 });
blockchainVerificationSchema.index({ blockNumber: -1 });
exports.default = {
    BlockchainVerification: exports.BlockchainVerification,
    EvidenceIntegrity: exports.EvidenceIntegrity,
    BlockchainAudit: exports.BlockchainAudit,
    EvidencePackageHash: exports.EvidencePackageHash,
};
//# sourceMappingURL=blockchain.model.js.map