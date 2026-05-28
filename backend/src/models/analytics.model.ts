/**
 * Analytics Model - Enterprise Dashboard Data
 * Centralized metrics and analytics for investigation platform
 */

import mongoose, { Schema } from 'mongoose';

// ============================================
// ANALYTICS METRIC TYPES
// ============================================

export enum MetricType {
  INVESTIGATION_COUNT = 'investigation_count',
  INVESTIGATION_STATUS = 'investigation_status',
  EVIDENCE_COUNT = 'evidence_count',
  ALERT_COUNT = 'alert_count',
  ALERT_SEVERITY = 'alert_severity',
  SANDBOX_EXECUTIONS = 'sandbox_executions',
  THREAT_CLASSIFICATION = 'threat_classification',
  ANALYST_ACTIVITY = 'analyst_activity',
  RESPONSE_TIME = 'response_time',
  RESOLUTION_RATE = 'resolution_rate',
}

// ============================================
// DASHBOARD STATISTICS
// ============================================

export interface DashboardStats {
  totalInvestigations: number;
  activeInvestigations: number;
  criticalPriority: number;
  highPriority: number;
  totalEvidence: number;
  unverifiedEvidence: number;
  totalAlerts: number;
  criticalAlerts: number;
  openAlerts: number;
  sandboxSessionsToday: number;
  avgResolutionTime: number;
}

// ============================================
// TIME-SERIES METRIC
// ============================================

export interface TimeSeriesMetric {
  timestamp: Date;
  value: number;
  metadata?: Record<string, any>;
}

// ============================================
// ANALYTICS SCHEMA
// ============================================

const analyticsSchema = new Schema({
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
    type: Schema.Types.Mixed,
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

const dailySummarySchema = new Schema({
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

const investigationMetricsSchema = new Schema({
  investigationId: {
    type: Schema.Types.ObjectId,
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
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  contributingAnalysts: [{
    userId: {
      type: Schema.Types.ObjectId,
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

investigationMetricsSchema.index({ primaryAnalyst: 1, createdAt: -1 });

// ============================================
// EXPORT MODELS
// ============================================

export const Analytics = mongoose.model('Analytics', analyticsSchema);
export const DailySummary = mongoose.model('DailySummary', dailySummarySchema);
export const InvestigationMetrics = mongoose.model('InvestigationMetrics', investigationMetricsSchema);

export default {
  Analytics,
  DailySummary,
  InvestigationMetrics,
};