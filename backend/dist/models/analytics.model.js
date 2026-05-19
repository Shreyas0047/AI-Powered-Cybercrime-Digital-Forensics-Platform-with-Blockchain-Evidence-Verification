"use strict";
/**
 * Analytics Model - Enterprise Dashboard Data
 * Centralized metrics and analytics for investigation platform
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
exports.InvestigationMetrics = exports.DailySummary = exports.Analytics = exports.MetricType = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// ============================================
// ANALYTICS METRIC TYPES
// ============================================
var MetricType;
(function (MetricType) {
    MetricType["INVESTIGATION_COUNT"] = "investigation_count";
    MetricType["INVESTIGATION_STATUS"] = "investigation_status";
    MetricType["EVIDENCE_COUNT"] = "evidence_count";
    MetricType["ALERT_COUNT"] = "alert_count";
    MetricType["ALERT_SEVERITY"] = "alert_severity";
    MetricType["SANDBOX_EXECUTIONS"] = "sandbox_executions";
    MetricType["THREAT_CLASSIFICATION"] = "threat_classification";
    MetricType["ANALYST_ACTIVITY"] = "analyst_activity";
    MetricType["RESPONSE_TIME"] = "response_time";
    MetricType["RESOLUTION_RATE"] = "resolution_rate";
})(MetricType || (exports.MetricType = MetricType = {}));
// ============================================
// ANALYTICS SCHEMA
// ============================================
const analyticsSchema = new mongoose_1.Schema({
    // Metric identification
    metricType: {
        type: String,
        enum: Object.values(MetricType),
        required: true,
        index: true,
    },
    metricName: {
        type: String,
        required: true,
        index: true,
    },
    // Time period
    period: {
        type: String,
        enum: ['hourly', 'daily', 'weekly', 'monthly', 'yearly'],
        required: true,
    },
    startDate: {
        type: Date,
        required: true,
    },
    endDate: {
        type: Date,
        required: true,
    },
    // Values
    value: {
        type: Number,
        required: true,
    },
    previousValue: Number,
    change: Number,
    changePercentage: Number,
    // Breakdown
    breakdown: {
        type: Map,
        of: Number,
    },
    // Metadata
    metadata: {
        type: mongoose_1.Schema.Types.Mixed,
    },
    // Computed at
    computedAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
});
// TTL - keep analytics for 2 years
analyticsSchema.index({ createdAt: 1 }, { expireAfterSeconds: 63072000 });
// Compound indexes
analyticsSchema.index({ metricType: 1, period: 1, startDate: -1 });
analyticsSchema.index({ metricName: 1, computedAt: -1 });
// ============================================
// DAILY SUMMARY SCHEMA
// ============================================
const dailySummarySchema = new mongoose_1.Schema({
    date: {
        type: Date,
        required: true,
        unique: true,
        index: true,
    },
    // Investigation stats
    investigations: {
        total: Number,
        created: Number,
        closed: Number,
        active: Number,
        byStatus: Map,
        byPriority: Map,
        byCategory: Map,
    },
    // Evidence stats
    evidence: {
        total: Number,
        uploaded: Number,
        verified: Number,
        byType: Map,
    },
    // Alert stats
    alerts: {
        total: Number,
        created: Number,
        resolved: Number,
        open: Number,
        bySeverity: Map,
        byType: Map,
    },
    // Sandbox stats
    sandbox: {
        totalExecutions: Number,
        successful: Number,
        failed: Number,
        bySimulator: Map,
    },
    // User activity
    userActivity: {
        activeUsers: Number,
        sessionsCreated: Number,
        actionsPerformed: Map,
    },
    // Performance metrics
    performance: {
        avgInvestigationTime: Number,
        avgAlertResponseTime: Number,
        avgEvidenceProcessingTime: Number,
    },
}, {
    timestamps: true,
});
// ============================================
// INVESTIGATION METRICS
// ============================================
const investigationMetricsSchema = new mongoose_1.Schema({
    investigationId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Investigation',
        required: true,
        index: true,
    },
    // Time tracking
    createdAt: Date,
    firstActionAt: Date,
    firstEvidenceAt: Date,
    firstReportAt: Date,
    resolvedAt: Date,
    closedAt: Date,
    // Duration metrics (in minutes)
    timeToFirstAction: Number,
    timeToFirstEvidence: Number,
    timeToFirstReport: Number,
    totalActiveTime: Number,
    // Activity metrics
    evidenceAdded: Number,
    reportsGenerated: Number,
    alertsLinked: Number,
    timelineEntries: Number,
    // Analyst metrics
    primaryAnalyst: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    contributingAnalysts: [{
            userId: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'User',
            },
            hoursSpent: Number,
            actionsCount: Number,
        }],
    totalAnalystHours: Number,
    // Complexity
    evidenceCount: Number,
    iocCount: Number,
    findingCount: Number,
}, {
    timestamps: true,
});
// TTL - keep investigation metrics for 5 years
investigationMetricsSchema.index({ createdAt: 1 }, { expireAfterSeconds: 157680000 });
investigationMetricsSchema.index({ investigationId: 1 });
investigationMetricsSchema.index({ primaryAnalyst: 1, createdAt: -1 });
// ============================================
// EXPORT MODELS
// ============================================
exports.Analytics = mongoose_1.default.model('Analytics', analyticsSchema);
exports.DailySummary = mongoose_1.default.model('DailySummary', dailySummarySchema);
exports.InvestigationMetrics = mongoose_1.default.model('InvestigationMetrics', investigationMetricsSchema);
exports.default = {
    Analytics: exports.Analytics,
    DailySummary: exports.DailySummary,
    InvestigationMetrics: exports.InvestigationMetrics,
};
//# sourceMappingURL=analytics.model.js.map