"use strict";
/**
 * Report Model - Enhanced Enterprise Edition
 * Comprehensive forensic report management
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
exports.Report = exports.ReportSeverity = exports.ReportStatus = exports.ReportType = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// ============================================
// REPORT TYPE ENUM
// ============================================
var ReportType;
(function (ReportType) {
    ReportType["INVESTIGATION"] = "investigation";
    ReportType["EVIDENCE"] = "evidence";
    ReportType["THREAT_ANALYSIS"] = "threat_analysis";
    ReportType["EXECUTIVE"] = "executive";
    ReportType["TECHNICAL"] = "technical";
    ReportType["INCIDENT"] = "incident";
    ReportType["MALWARE"] = "malware";
    ReportType["SANDBOX"] = "sandbox";
})(ReportType || (exports.ReportType = ReportType = {}));
// ============================================
// REPORT STATUS ENUM
// ============================================
var ReportStatus;
(function (ReportStatus) {
    ReportStatus["DRAFT"] = "draft";
    ReportStatus["IN_REVIEW"] = "in_review";
    ReportStatus["APPROVED"] = "approved";
    ReportStatus["PUBLISHED"] = "published";
    ReportStatus["REJECTED"] = "rejected";
    ReportStatus["ARCHIVED"] = "archived";
})(ReportStatus || (exports.ReportStatus = ReportStatus = {}));
// ============================================
// REPORT SEVERITY
// ============================================
var ReportSeverity;
(function (ReportSeverity) {
    ReportSeverity["CRITICAL"] = "critical";
    ReportSeverity["HIGH"] = "high";
    ReportSeverity["MEDIUM"] = "medium";
    ReportSeverity["LOW"] = "low";
    ReportSeverity["INFORMATIONAL"] = "informational";
})(ReportSeverity || (exports.ReportSeverity = ReportSeverity = {}));
// ============================================
// REPORT SCHEMA
// ============================================
const reportSchema = new mongoose_1.Schema({
    // Core identification
    reportId: {
        type: String,
        unique: true,
        index: true,
    },
    // Investigation reference
    investigationId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Investigation',
        required: true,
        index: true,
    },
    investigationCaseNumber: String,
    // Basic info
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500,
    },
    summary: {
        type: String,
        required: true,
        maxlength: 5000,
    },
    // Classification
    type: {
        type: String,
        enum: Object.values(ReportType),
        required: true,
        index: true,
    },
    status: {
        type: String,
        enum: Object.values(ReportStatus),
        default: ReportStatus.DRAFT,
        index: true,
    },
    severity: {
        type: String,
        enum: Object.values(ReportSeverity),
    },
    // Content
    executiveSummary: {
        overview: String,
        keyFindings: [String],
        riskLevel: String,
        recommendedActions: [String],
        timeline: String,
    },
    findings: [{
            id: String,
            category: String,
            severity: String,
            title: String,
            description: String,
            timestamp: Date,
            indicators: [String],
            evidence: [String],
            recommendations: [String],
            mitreTactics: [String],
            mitreTechniques: [String],
        }],
    technicalDetails: [{
            section: String,
            content: String,
            code: String,
            logs: [String],
            screenshots: [String],
        }],
    recommendations: [{
            priority: String,
            description: String,
            rationale: String,
            implemented: Boolean,
        }],
    iocIndicators: [{
            type: String,
            value: String,
            description: String,
            context: String,
        }],
    // Timeline
    timeline: [{
            timestamp: Date,
            event: String,
            description: String,
            source: String,
        }],
    affectedSystems: [String],
    affectedUsers: [String],
    // AI Analysis
    aiAnalysisCompleted: {
        type: Boolean,
        default: false,
    },
    aiAnalysis: {
        summary: String,
        threatClassification: {
            category: String,
            family: String,
            confidence: Number,
        },
        behavioralIndicators: [String],
        recommendations: [String],
        similarThreats: [String],
        riskScore: Number,
    },
    // Authorship
    generatedAt: {
        type: Date,
        default: Date.now,
    },
    generatedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    reviewedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    reviewedAt: Date,
    approvedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    approvedAt: Date,
    // Versioning
    version: {
        type: String,
        default: '1.0.0',
    },
    versionNotes: String,
    previousVersions: [{
            version: String,
            generatedAt: Date,
            generatedBy: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'User',
            },
            changes: String,
        }],
    // Publication
    published: {
        type: Boolean,
        default: false,
    },
    publishedAt: Date,
    publishedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    // Related entities
    evidenceIds: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Evidence',
        }],
    sandboxSessionId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'SandboxSession',
    },
    // Export formats
    exportFormats: [{
            format: String,
            path: String,
            generatedAt: Date,
        }],
    // Tags
    tags: [{
            type: String,
            trim: true,
            lowercase: true,
        }],
    // Custom fields
    customFields: {
        type: mongoose_1.Schema.Types.Mixed,
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
// INDEXES
// ============================================
reportSchema.index({ investigationId: 1, type: 1 });
reportSchema.index({ investigationId: 1, status: 1 });
reportSchema.index({ status: 1 });
reportSchema.index({ generatedAt: -1 });
reportSchema.index({ generatedBy: 1 });
reportSchema.index({ tags: 1 });
reportSchema.index({ severity: 1, status: 1 });
reportSchema.index({ published: 1, status: 1 });
// Text search
reportSchema.index({
    title: 'text',
    summary: 'text',
    tags: 'text',
});
// ============================================
// METHODS
// ============================================
// Submit for review
reportSchema.methods.submitForReview = function () {
    this.status = ReportStatus.IN_REVIEW;
    return this.save();
};
// Approve report
reportSchema.methods.approve = function (userId) {
    this.status = ReportStatus.APPROVED;
    this.approvedAt = new Date();
    this.approvedBy = userId;
    return this.save();
};
// Publish report
reportSchema.methods.publish = function (userId) {
    this.status = ReportStatus.PUBLISHED;
    this.published = true;
    this.publishedAt = new Date();
    this.publishedBy = userId;
    return this.save();
};
// Add finding
reportSchema.methods.addFinding = function (finding) {
    this.findings.push(finding);
    return this.save();
};
// ============================================
// EXPORT
// ============================================
exports.Report = mongoose_1.default.model('Report', reportSchema);
exports.default = exports.Report;
//# sourceMappingURL=report.model.js.map