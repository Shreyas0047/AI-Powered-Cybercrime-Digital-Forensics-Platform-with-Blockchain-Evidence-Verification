"use strict";
/**
 * Evidence Model - Enhanced Enterprise Edition
 * Comprehensive digital forensic evidence management
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
exports.Evidence = exports.EvidenceStatus = exports.EvidenceSource = exports.EvidenceType = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// ============================================
// EVIDENCE TYPE ENUM
// ============================================
var EvidenceType;
(function (EvidenceType) {
    EvidenceType["FILE"] = "file";
    EvidenceType["MEMORY_DUMP"] = "memory_dump";
    EvidenceType["NETWORK_CAPTURE"] = "network_capture";
    EvidenceType["LOG"] = "log";
    EvidenceType["SCREENSHOT"] = "screenshot";
    EvidenceType["REGISTRY_DUMP"] = "registry_dump";
    EvidenceType["PROCESS_SNAPSHOT"] = "process_snapshot";
    EvidenceType["PACKAGE"] = "package";
    EvidenceType["MALWARE_SAMPLE"] = "malware_sample";
    EvidenceType["REPORT"] = "report";
    EvidenceType["OTHER"] = "other";
})(EvidenceType || (exports.EvidenceType = EvidenceType = {}));
// ============================================
// EVIDENCE SOURCE ENUM
// ============================================
var EvidenceSource;
(function (EvidenceSource) {
    EvidenceSource["MANUAL_UPLOAD"] = "manual_upload";
    EvidenceSource["SANDBOX_EXECUTION"] = "sandbox_execution";
    EvidenceSource["NETWORK_CAPTURE"] = "network_capture";
    EvidenceSource["ENDPOINT_COLLECTION"] = "endpoint_collection";
    EvidenceSource["IMPORTED"] = "imported";
    EvidenceSource["API_RECEIVED"] = "api_received";
})(EvidenceSource || (exports.EvidenceSource = EvidenceSource = {}));
// ============================================
// EVIDENCE STATUS ENUM
// ============================================
var EvidenceStatus;
(function (EvidenceStatus) {
    EvidenceStatus["UPLOADING"] = "uploading";
    EvidenceStatus["PROCESSING"] = "processing";
    EvidenceStatus["READY"] = "ready";
    EvidenceStatus["ANALYZING"] = "analyzing";
    EvidenceStatus["VERIFIED"] = "verified";
    EvidenceStatus["ARCHIVED"] = "archived";
    EvidenceStatus["DELETED"] = "deleted";
})(EvidenceStatus || (exports.EvidenceStatus = EvidenceStatus = {}));
// ============================================
// EVIDENCE SCHEMA
// ============================================
const evidenceSchema = new mongoose_1.Schema({
    // Core identification
    evidenceId: {
        type: String,
        required: true,
        unique: true,
    },
    // Investigation reference
    investigationId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Investigation',
        required: true,
    },
    // Basic info
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500,
    },
    description: {
        type: String,
        maxlength: 10000,
    },
    // Classification
    type: {
        type: String,
        enum: Object.values(EvidenceType),
        default: EvidenceType.OTHER,
        index: true,
    },
    source: {
        type: String,
        enum: Object.values(EvidenceSource),
        default: EvidenceSource.MANUAL_UPLOAD,
    },
    status: {
        type: String,
        enum: Object.values(EvidenceStatus),
        default: EvidenceStatus.UPLOADING,
        index: true,
    },
    // File information
    filePath: {
        type: String,
        required: true,
    },
    fileName: {
        type: String,
        required: true,
    },
    fileSize: {
        type: Number,
        required: true,
    },
    mimeType: {
        type: String,
        required: true,
    },
    // Integrity hashes
    hash: {
        sha256: {
            type: String,
        },
        md5: String,
        sha1: String,
    },
    fingerprint: {
        type: String,
        index: true,
    },
    fileMetadata: {
        originalName: String,
        extension: String,
        mimeType: String,
        size: Number,
        createdAt: Date,
        modifiedAt: Date,
        encoding: String,
    },
    // Ownership and tracking
    collectedAt: {
        type: Date,
        required: true,
        default: Date.now,
    },
    collectedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    uploadedAt: {
        type: Date,
        default: Date.now,
    },
    uploadedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    uploadedFrom: {
        ipAddress: String,
        hostname: String,
        agent: String,
    },
    // Verification
    verified: {
        type: Boolean,
        default: false,
    },
    verifiedAt: Date,
    verifiedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    verificationStatus: {
        type: String,
        enum: ['pending', 'verified', 'failed', 'modified'],
        default: 'pending',
    },
    // Chain of custody
    chainOfCustody: [{
            timestamp: {
                type: Date,
                default: Date.now,
            },
            action: {
                type: String,
                required: true,
            },
            userId: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'User',
                required: true,
            },
            userName: String,
            details: String,
            location: String,
            hash: String,
        }],
    custodyComplete: {
        type: Boolean,
        default: false,
    },
    // Analysis
    analysisCompleted: {
        type: Boolean,
        default: false,
    },
    analysisSummary: String,
    aiAnalysis: {
        threatType: String,
        confidence: Number,
        indicators: [String],
        recommendations: [String],
    },
    threatClassification: {
        category: String,
        family: String,
        severity: String,
    },
    // Retention
    retentionUntil: Date,
    archiveRequested: {
        type: Boolean,
        default: false,
    },
    archivedAt: Date,
    archiveLocation: String,
    // Tags and metadata
    tags: [{
            type: String,
            trim: true,
            lowercase: true,
        }],
    customMetadata: {
        type: mongoose_1.Schema.Types.Mixed,
        // User-provided metadata (manual input)
    },
    metadata: {
        type: mongoose_1.Schema.Types.Mixed,
        // System-generated metadata (auto-populated)
    },
    // External references
    externalIds: [String],
    sandboxSessionId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'SandboxSession',
    },
    originalReportId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Report',
    },
    // Associated files (for packages)
    containsFiles: [{
            name: String,
            path: String,
            size: Number,
            hash: String,
        }],
    packageManifest: String,
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
// INDEXES
// ============================================
// Compound indexes
evidenceSchema.index({ investigationId: 1, type: 1 });
evidenceSchema.index({ investigationId: 1, status: 1 });
evidenceSchema.index({ 'hash.sha256': 1 });
evidenceSchema.index({ tags: 1 });
evidenceSchema.index({ createdAt: -1 });
evidenceSchema.index({ collectedBy: 1, createdAt: -1 });
evidenceSchema.index({ verified: 1, status: 1 });
evidenceSchema.index({ source: 1, type: 1 });
// Text search
evidenceSchema.index({
    name: 'text',
    description: 'text',
    tags: 'text',
});
// ============================================
// METHODS
// ============================================
// Add chain of custody entry
evidenceSchema.methods.addCustodyEntry = function (action, userId, userName, details, location) {
    this.chainOfCustody.push({
        timestamp: new Date(),
        action,
        userId,
        userName,
        details,
        location,
    });
    return this.save();
};
// Verify integrity
evidenceSchema.methods.verify = function (userId) {
    this.verified = true;
    this.verifiedAt = new Date();
    this.verifiedBy = userId;
    this.verificationStatus = 'verified';
    return this.save();
};
// Mark as analyzed
evidenceSchema.methods.markAnalyzed = function (analysisSummary) {
    this.analysisCompleted = true;
    this.analysisSummary = analysisSummary;
    this.status = EvidenceStatus.VERIFIED;
    return this.save();
};
// ============================================
// EXPORT
// ============================================
exports.Evidence = mongoose_1.default.model('Evidence', evidenceSchema);
exports.default = exports.Evidence;
//# sourceMappingURL=evidence.model.js.map