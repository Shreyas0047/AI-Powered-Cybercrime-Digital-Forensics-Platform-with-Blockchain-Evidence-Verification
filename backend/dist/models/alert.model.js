"use strict";
/**
 * Alert Model - Enhanced Enterprise Edition
 * Comprehensive alert and incident management
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
exports.Alert = exports.AlertSource = exports.AlertStatus = exports.AlertSeverity = exports.AlertType = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// ============================================
// ALERT TYPE ENUM
// ============================================
var AlertType;
(function (AlertType) {
    AlertType["SYSTEM"] = "system";
    AlertType["SECURITY"] = "security";
    AlertType["INVESTIGATION"] = "investigation";
    AlertType["SANDBOX"] = "sandbox";
    AlertType["EVIDENCE"] = "evidence";
    AlertType["THREAT_INTEL"] = "threat_intel";
    AlertType["NETWORK"] = "network";
    AlertType["ENDPOINT"] = "endpoint";
})(AlertType || (exports.AlertType = AlertType = {}));
// ============================================
// ALERT SEVERITY ENUM
// ============================================
var AlertSeverity;
(function (AlertSeverity) {
    AlertSeverity["CRITICAL"] = "critical";
    AlertSeverity["HIGH"] = "high";
    AlertSeverity["MEDIUM"] = "medium";
    AlertSeverity["LOW"] = "low";
    AlertSeverity["INFO"] = "info";
})(AlertSeverity || (exports.AlertSeverity = AlertSeverity = {}));
// ============================================
// ALERT STATUS ENUM
// ============================================
var AlertStatus;
(function (AlertStatus) {
    AlertStatus["NEW"] = "new";
    AlertStatus["ACKNOWLEDGED"] = "acknowledged";
    AlertStatus["IN_PROGRESS"] = "in_progress";
    AlertStatus["ESCALATED"] = "escalated";
    AlertStatus["RESOLVED"] = "resolved";
    AlertStatus["FALSE_POSITIVE"] = "false_positive";
    AlertStatus["CLOSED"] = "closed";
})(AlertStatus || (exports.AlertStatus = AlertStatus = {}));
// ============================================
// ALERT SOURCE ENUM
// ============================================
var AlertSource;
(function (AlertSource) {
    AlertSource["SANDBOX"] = "sandbox";
    AlertSource["SIEM"] = "siem";
    AlertSource["IDS"] = "ids";
    AlertSource["FIREWALL"] = "firewall";
    AlertSource["ENDPOINT"] = "endpoint";
    AlertSource["NETWORK"] = "network";
    AlertSource["MANUAL"] = "manual";
    AlertSource["AI"] = "ai";
    AlertSource["API"] = "api";
})(AlertSource || (exports.AlertSource = AlertSource = {}));
// ============================================
// ALERT SCHEMA
// ============================================
const alertSchema = new mongoose_1.Schema({
    // Core identification
    alertId: {
        type: String,
        unique: true,
        index: true,
    },
    // Basic info
    title: {
        type: String,
        required: true,
        maxlength: 500,
    },
    description: {
        type: String,
        required: true,
        maxlength: 5000,
    },
    // Classification
    type: {
        type: String,
        enum: Object.values(AlertType),
        required: true,
        index: true,
    },
    severity: {
        type: String,
        enum: Object.values(AlertSeverity),
        required: true,
        index: true,
    },
    status: {
        type: String,
        enum: Object.values(AlertStatus),
        default: AlertStatus.NEW,
        index: true,
    },
    source: {
        type: String,
        enum: Object.values(AlertSource),
        required: true,
    },
    // Investigation reference
    investigationId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Investigation',
    },
    investigationCaseNumber: String,
    // Timestamps
    detectedAt: {
        type: Date,
        required: true,
        default: Date.now,
        index: true,
    },
    acknowledgedAt: Date,
    resolvedAt: Date,
    closedAt: Date,
    // Assignment
    assignedTo: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        index: true,
    },
    assignedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    assignedAt: Date,
    // Acknowledgement
    acknowledgedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    acknowledgmentNote: String,
    // Resolution
    resolution: {
        summary: String,
        rootCause: String,
        actionTaken: String,
        falsePositive: Boolean,
        escalated: Boolean,
    },
    resolvedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    // Technical details
    sourceIp: String,
    destinationIp: String,
    sourcePort: Number,
    destinationPort: Number,
    protocol: String,
    hostname: String,
    processName: String,
    filePath: String,
    // Indicators of compromise
    iocIndicators: [{
            type: String,
            value: String,
            source: String,
            confidence: Number,
            firstSeen: Date,
            lastSeen: Date,
        }],
    mitreTechniques: [String],
    // Related entities
    relatedAlertIds: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Alert',
        }],
    relatedEvidenceIds: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Evidence',
        }],
    relatedSandboxSessionId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'SandboxSession',
    },
    // Context and metadata
    tags: [{
            type: String,
            trim: true,
            lowercase: true,
        }],
    metadata: {
        type: mongoose_1.Schema.Types.Mixed,
    },
    rawLog: String,
    // AI Analysis
    aiAnalysisCompleted: {
        type: Boolean,
        default: false,
    },
    aiAnalysis: {
        threatType: String,
        confidence: Number,
        recommendedActions: [String],
        similarAlerts: [String],
    },
    // Escalation
    escalationLevel: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
    },
    escalatedTo: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    escalatedAt: Date,
    escalationReason: String,
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
alertSchema.index({ severity: 1, status: 1 });
alertSchema.index({ detectedAt: -1 });
alertSchema.index({ assignedTo: 1, status: 1 });
alertSchema.index({ investigationId: 1, status: 1 });
alertSchema.index({ type: 1, severity: 1 });
alertSchema.index({ tags: 1 });
alertSchema.index({ source: 1, detectedAt: -1 });
alertSchema.index({ resolvedBy: 1, resolvedAt: -1 });
// TTL index - auto-delete after 1 year (optional, can be removed)
alertSchema.index({ detectedAt: 1 }, { expireAfterSeconds: 31536000 });
// ============================================
// METHODS
// ============================================
// Acknowledge alert
alertSchema.methods.acknowledge = function (userId, note) {
    this.status = AlertStatus.ACKNOWLEDGED;
    this.acknowledgedAt = new Date();
    this.acknowledgedBy = userId;
    this.acknowledgmentNote = note;
    return this.save();
};
// Assign alert
alertSchema.methods.assignTo = function (userId, assignedBy) {
    this.assignedTo = userId;
    this.assignedBy = assignedBy;
    this.assignedAt = new Date();
    return this.save();
};
// Resolve alert
alertSchema.methods.resolve = function (userId, resolution) {
    this.status = AlertStatus.RESOLVED;
    this.resolvedAt = new Date();
    this.resolvedBy = userId;
    this.resolution = resolution;
    return this.save();
};
// Escalate alert
alertSchema.methods.escalate = function (userId, reason) {
    this.status = AlertStatus.ESCALATED;
    this.escalatedTo = userId;
    this.escalatedAt = new Date();
    this.escalationReason = reason;
    this.escalationLevel += 1;
    return this.save();
};
// ============================================
// EXPORT
// ============================================
exports.Alert = mongoose_1.default.model('Alert', alertSchema);
exports.default = exports.Alert;
//# sourceMappingURL=alert.model.js.map