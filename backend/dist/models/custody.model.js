"use strict";
/**
 * Chain of Custody Model
 * Immutable evidence tracking and custody chain management
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
exports.VerificationReport = exports.TamperInvestigation = exports.VerificationHistory = exports.EvidenceLineage = exports.ChainOfCustody = exports.IntegrityStatus = exports.CustodyEventType = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// ============================================
// CUSTODY EVENT TYPES
// ============================================
var CustodyEventType;
(function (CustodyEventType) {
    CustodyEventType["EVIDENCE_CREATED"] = "evidence_created";
    CustodyEventType["EVIDENCE_UPLOADED"] = "evidence_uploaded";
    CustodyEventType["VERIFICATION_REGISTERED"] = "verification_registered";
    CustodyEventType["BLOCKCHAIN_SYNCED"] = "blockchain_synced";
    CustodyEventType["INVESTIGATION_LINKED"] = "investigation_linked";
    CustodyEventType["ANALYST_ACCESSED"] = "analyst_accessed";
    CustodyEventType["INTEGRITY_CHECKED"] = "integrity_checked";
    CustodyEventType["VERIFICATION_COMPLETED"] = "verification_completed";
    CustodyEventType["VERIFICATION_FAILED"] = "verification_failed";
    CustodyEventType["TAMPER_DETECTED"] = "tamper_detected";
    CustodyEventType["EVIDENCE_MODIFIED"] = "evidence_modified";
    CustodyEventType["EVIDENCE_EXPORTED"] = "evidence_exported";
    CustodyEventType["EVIDENCE_ARCHIVED"] = "evidence_archived";
    CustodyEventType["CUSTODY_TRANSFERRED"] = "custody_transferred";
    CustodyEventType["BLOCKCHAIN_CONFIRMED"] = "blockchain_confirmed";
    CustodyEventType["RECONCILIATION_COMPLETED"] = "reconciliation_completed";
})(CustodyEventType || (exports.CustodyEventType = CustodyEventType = {}));
var IntegrityStatus;
(function (IntegrityStatus) {
    IntegrityStatus["VERIFIED"] = "verified";
    IntegrityStatus["PENDING_VERIFICATION"] = "pending_verification";
    IntegrityStatus["SYNCING"] = "syncing";
    IntegrityStatus["INTEGRITY_MISMATCH"] = "integrity_mismatch";
    IntegrityStatus["TAMPER_SUSPECTED"] = "tamper_suspected";
    IntegrityStatus["VERIFICATION_FAILED"] = "verification_failed";
    IntegrityStatus["BLOCKCHAIN_UNAVAILABLE"] = "blockchain_unavailable";
})(IntegrityStatus || (exports.IntegrityStatus = IntegrityStatus = {}));
// ============================================
// CUSTODY EVENT SCHEMA
// ============================================
const custodyEventSchema = new mongoose_1.Schema({
    eventId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    evidenceId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Evidence',
        required: true,
        index: true,
    },
    eventType: {
        type: String,
        enum: Object.values(CustodyEventType),
        required: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true,
    },
    performedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    performedByName: {
        type: String,
        required: true,
    },
    // Event details
    details: {
        type: String,
        required: true,
    },
    // Related entities
    investigationId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Investigation',
    },
    transactionHash: String,
    blockNumber: Number,
    // Integrity state at event time
    integrityStatus: {
        type: String,
        enum: Object.values(IntegrityStatus),
    },
    previousEventHash: String,
    currentEventHash: String,
    // Metadata
    metadata: {
        ipAddress: String,
        userAgent: String,
        location: String,
        deviceId: String,
    },
}, { _id: false });
// ============================================
// CHAIN OF CUSTODY SCHEMA
// ============================================
const chainOfCustodySchema = new mongoose_1.Schema({
    evidenceId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Evidence',
        required: true,
        unique: true,
        index: true,
    },
    chainId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    // Current state
    currentHolder: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    currentHolderName: String,
    custodyStatus: {
        type: String,
        enum: ['active', 'transferred', 'archived'],
        default: 'active',
    },
    // Integrity
    integrityStatus: {
        type: String,
        enum: Object.values(IntegrityStatus),
        default: IntegrityStatus.PENDING_VERIFICATION,
    },
    lastIntegrityCheck: Date,
    lastVerifiedAt: Date,
    // Blockchain
    blockchainVerified: {
        type: Boolean,
        default: false,
    },
    blockchainTxHash: String,
    blockchainBlockNumber: Number,
    // Chain events
    events: [custodyEventSchema],
    // Statistics
    eventCount: {
        type: Number,
        default: 0,
    },
    verificationCount: {
        type: Number,
        default: 0,
    },
    lastEventAt: Date,
    // Hash chain for immutability
    chainHash: {
        type: String,
        index: true,
    },
    genesisHash: String,
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
// EVIDENCE LINEAGE SCHEMA
// ============================================
const evidenceLineageSchema = new mongoose_1.Schema({
    evidenceId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Evidence',
        required: true,
        unique: true,
        index: true,
    },
    // Parent evidence (if derived)
    parentEvidenceId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Evidence',
    },
    // Child evidence (evidence derived from this)
    childEvidenceIds: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Evidence',
        }],
    // Lineage type
    lineageType: {
        type: String,
        enum: ['original', 'derived', 'extracted', 'processed', 'correlated'],
        default: 'original',
    },
    // Creation context
    derivationMethod: String,
    extractionSource: String,
    // Linked telemetry
    linkedTelemetryIds: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'TelemetryEvent',
        }],
    // Linked IOCs
    linkedIocIds: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'IOC',
        }],
    // AI analysis linkage
    analysisJobId: String,
    analysisConfidence: Number,
    // Visualization position
    graphPosition: {
        x: Number,
        y: Number,
    },
    // Cluster info
    clusterId: String,
    clusterLabel: String,
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
// VERIFICATION HISTORY SCHEMA
// ============================================
const verificationHistorySchema = new mongoose_1.Schema({
    verificationId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    evidenceId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Evidence',
        required: true,
        index: true,
    },
    verificationType: {
        type: String,
        enum: ['hash', 'blockchain', 'integrity', 'reconciliation'],
        required: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true,
    },
    performedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    performedByName: String,
    // Result
    status: {
        type: String,
        enum: ['success', 'failed', 'pending', 'mismatch'],
        required: true,
    },
    expectedHash: String,
    actualHash: String,
    hashMatch: Boolean,
    // Blockchain
    transactionHash: String,
    blockNumber: Number,
    confirmations: Number,
    // Details
    verificationTime: Number,
    details: String,
    // Reconciliation
    reconciliationIssueId: String,
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
// TAMPER INVESTIGATION SCHEMA
// ============================================
const tamperInvestigationSchema = new mongoose_1.Schema({
    investigationId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    evidenceId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Evidence',
        required: true,
        index: true,
    },
    // Detection info
    detectedAt: {
        type: Date,
        default: Date.now,
    },
    severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        required: true,
    },
    // Mismatch details
    expectedHash: String,
    actualHash: String,
    // Investigation
    status: {
        type: String,
        enum: ['open', 'investigating', 'resolved', 'false_positive', 'escalated'],
        default: 'open',
    },
    assignedTo: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    assignedToName: String,
    // Timeline
    events: [{
            timestamp: Date,
            action: String,
            performedBy: String,
            notes: String,
        }],
    // Findings
    findings: String,
    conclusion: String,
    // Related
    relatedAlerts: [String],
    linkedInvestigations: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Investigation',
        }],
    // Evidence drift analysis
    driftAnalysis: {
        firstDetectedAt: Date,
        lastConfirmedAt: Date,
        driftCount: Number,
        driftPattern: String,
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
// EXPORTABLE VERIFICATION REPORT SCHEMA
// ============================================
const verificationReportSchema = new mongoose_1.Schema({
    reportId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    investigationId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Investigation',
    },
    evidenceIds: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Evidence',
        }],
    // Report metadata
    reportType: {
        type: String,
        enum: ['integrity_report', 'chain_of_custody', 'tamper_analysis', 'full_forensic'],
        required: true,
    },
    generatedAt: {
        type: Date,
        default: Date.now,
    },
    generatedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    generatedByName: String,
    // Summary
    summary: {
        totalEvidence: Number,
        verifiedEvidence: Number,
        failedEvidence: Number,
        pendingEvidence: Number,
        tamperDetected: Number,
    },
    // Content
    content: {
        evidenceDetails: [{
                evidenceId: String,
                fileName: String,
                sha256Hash: String,
                integrityStatus: String,
                blockchainVerified: Boolean,
                lastVerifiedAt: Date,
            }],
        custodyTimeline: [{
                evidenceId: String,
                events: [custodyEventSchema],
            }],
        tamperAlerts: [{
                evidenceId: String,
                severity: String,
                description: String,
            }],
        blockchainReferences: [{
                evidenceId: String,
                transactionHash: String,
                blockNumber: Number,
            }],
    },
    // Signatures
    reportHash: String,
    digitalSignature: String,
    // Export
    exportedAt: Date,
    exportedBy: String,
    exportFormat: String,
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
exports.ChainOfCustody = mongoose_1.default.model('ChainOfCustody', chainOfCustodySchema);
exports.EvidenceLineage = mongoose_1.default.model('EvidenceLineage', evidenceLineageSchema);
exports.VerificationHistory = mongoose_1.default.model('VerificationHistory', verificationHistorySchema);
exports.TamperInvestigation = mongoose_1.default.model('TamperInvestigation', tamperInvestigationSchema);
exports.VerificationReport = mongoose_1.default.model('VerificationReport', verificationReportSchema);
exports.default = {
    ChainOfCustody: exports.ChainOfCustody,
    EvidenceLineage: exports.EvidenceLineage,
    VerificationHistory: exports.VerificationHistory,
    TamperInvestigation: exports.TamperInvestigation,
    VerificationReport: exports.VerificationReport,
};
//# sourceMappingURL=custody.model.js.map