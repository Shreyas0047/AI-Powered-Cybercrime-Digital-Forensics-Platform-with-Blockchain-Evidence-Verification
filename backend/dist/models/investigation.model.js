"use strict";
/**
 * Investigation Model - Enhanced Enterprise Edition
 * Centralized cyber forensic investigation management
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
exports.Investigation = exports.InvestigationPhase = exports.InvestigationCategory = exports.InvestigationPriority = exports.InvestigationStatus = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// ============================================
// INVESTIGATION STATUS ENUM
// ============================================
var InvestigationStatus;
(function (InvestigationStatus) {
    InvestigationStatus["PENDING"] = "pending";
    InvestigationStatus["ACTIVE"] = "active";
    InvestigationStatus["ANALYZING"] = "analyzing";
    InvestigationStatus["ESCALATED"] = "escalated";
    InvestigationStatus["RESOLVED"] = "resolved";
    InvestigationStatus["CLOSED"] = "closed";
    InvestigationStatus["ARCHIVED"] = "archived";
})(InvestigationStatus || (exports.InvestigationStatus = InvestigationStatus = {}));
// ============================================
// INVESTIGATION PRIORITY ENUM
// ============================================
var InvestigationPriority;
(function (InvestigationPriority) {
    InvestigationPriority["CRITICAL"] = "critical";
    InvestigationPriority["HIGH"] = "high";
    InvestigationPriority["MEDIUM"] = "medium";
    InvestigationPriority["LOW"] = "low";
})(InvestigationPriority || (exports.InvestigationPriority = InvestigationPriority = {}));
// ============================================
// INVESTIGATION CATEGORY
// ============================================
var InvestigationCategory;
(function (InvestigationCategory) {
    InvestigationCategory["MALWARE"] = "malware";
    InvestigationCategory["DATA_BREACH"] = "data_breach";
    InvestigationCategory["PHISHING"] = "phishing";
    InvestigationCategory["INTRUSION"] = "intrusion";
    InvestigationCategory["RANSOMWARE"] = "ransomware";
    InvestigationCategory["Insider_THREAT"] = "insider_threat";
    InvestigationCategory["DDoS"] = "ddos";
    InvestigationCategory["Espionage"] = "espionage";
    InvestigationCategory["FRAUD"] = "fraud";
    InvestigationCategory["OTHER"] = "other";
})(InvestigationCategory || (exports.InvestigationCategory = InvestigationCategory = {}));
// ============================================
// INVESTIGATION PHASE
// ============================================
var InvestigationPhase;
(function (InvestigationPhase) {
    InvestigationPhase["IDENTIFICATION"] = "identification";
    InvestigationPhase["CONTAINMENT"] = "containment";
    InvestigationPhase["ERADICATION"] = "eradication";
    InvestigationPhase["RECOVERY"] = "recovery";
    InvestigationPhase["LESSONS_LEARNED"] = "lessons_learned";
})(InvestigationPhase || (exports.InvestigationPhase = InvestigationPhase = {}));
// ============================================
// INVESTIGATION SCHEMA
// ============================================
const investigationSchema = new mongoose_1.Schema({
    // Core identification
    caseNumber: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500,
    },
    name: {
        type: String,
        trim: true,
        maxlength: 500,
    },
    description: {
        type: String,
        required: true,
        maxlength: 10000,
    },
    // Classification
    category: {
        type: String,
        enum: Object.values(InvestigationCategory),
        default: InvestigationCategory.OTHER,
    },
    status: {
        type: String,
        enum: Object.values(InvestigationStatus),
        default: InvestigationStatus.PENDING,
    },
    priority: {
        type: String,
        enum: Object.values(InvestigationPriority),
        default: InvestigationPriority.MEDIUM,
        index: true,
    },
    threatLevel: {
        type: String,
        enum: ['critical', 'high', 'medium', 'low', 'unknown'],
        default: 'medium',
    },
    phase: {
        type: String,
        enum: Object.values(InvestigationPhase),
    },
    // Assignment
    leadAnalyst: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    assignedAnalysts: [{
            userId: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'User',
            },
            role: {
                type: String,
                enum: ['lead', 'contributor', 'reviewer'],
            },
            assignedAt: {
                type: Date,
                default: Date.now,
            },
            assignedBy: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'User',
            },
        }],
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    // Timestamps
    startedAt: {
        type: Date,
    },
    resolvedAt: {
        type: Date,
    },
    closedAt: {
        type: Date,
    },
    // Evidence and reports
    evidenceIds: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Evidence',
        }],
    evidenceCount: {
        type: Number,
        default: 0,
    },
    reportIds: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Report',
        }],
    reportCount: {
        type: Number,
        default: 0,
    },
    sandboxSessionIds: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'SandboxSession',
        }],
    alertIds: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Alert',
        }],
    // Related entities
    relatedCases: [{
            type: String, // References to other case numbers
        }],
    iocIndicators: [{
            type: String, // Indicators of Compromise
        }],
    // Workflow tracking
    workflow: [{
            step: String,
            completed: {
                type: Boolean,
                default: false,
            },
            completedAt: Date,
            completedBy: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'User',
            },
            notes: String,
        }],
    timeline: [{
            timestamp: {
                type: Date,
                default: Date.now,
            },
            action: String,
            userId: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'User',
            },
            userName: String,
            details: String,
            metadata: mongoose_1.Schema.Types.Mixed,
        }],
    // Metadata
    tags: [{
            type: String,
            trim: true,
            lowercase: true,
        }],
    notes: {
        type: String,
        maxlength: 5000,
    },
    metadata: {
        type: mongoose_1.Schema.Types.Mixed,
    },
    resolution: {
        summary: String,
        rootCause: String,
        recommendations: [String],
        lessonsLearned: String,
    },
    // External references
    externalCaseIds: [String],
    relatedAlerts: [String],
    // AI Analysis
    aiAnalysisCompleted: {
        type: Boolean,
        default: false,
    },
    aiAnalysisSummary: String,
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
// Compound indexes for common queries
investigationSchema.index({ status: 1, priority: 1 });
investigationSchema.index({ createdAt: -1 });
investigationSchema.index({ leadAnalyst: 1, status: 1 });
investigationSchema.index({ assignedAnalysts: 1 });
investigationSchema.index({ category: 1, status: 1 });
investigationSchema.index({ tags: 1 });
investigationSchema.index({ priority: 1, createdAt: -1 });
investigationSchema.index({ 'timeline.timestamp': -1 });
// Text search index
investigationSchema.index({
    title: 'text',
    description: 'text',
    caseNumber: 'text',
    tags: 'text',
});
// ============================================
// METHODS
// ============================================
// Add timeline entry
investigationSchema.methods.addTimelineEntry = function (action, userId, userName, details, metadata) {
    this.timeline.push({
        timestamp: new Date(),
        action,
        userId: userId,
        userName,
        details,
        metadata,
    });
    return this.save();
};
// Update status with timestamp
investigationSchema.methods.updateStatus = function (newStatus, userId) {
    this.status = newStatus;
    switch (newStatus) {
        case InvestigationStatus.ACTIVE:
            this.startedAt = this.startedAt || new Date();
            break;
        case InvestigationStatus.RESOLVED:
            this.resolvedAt = new Date();
            break;
        case InvestigationStatus.CLOSED:
        case InvestigationStatus.ARCHIVED:
            this.closedAt = new Date();
            break;
    }
    return this.save();
};
// ============================================
// EXPORT
// ============================================
exports.Investigation = mongoose_1.default.model('Investigation', investigationSchema);
exports.default = exports.Investigation;
//# sourceMappingURL=investigation.model.js.map