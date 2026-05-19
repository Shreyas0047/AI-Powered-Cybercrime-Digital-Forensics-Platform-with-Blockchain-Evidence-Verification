/**
 * Investigation Model - Enhanced Enterprise Edition
 * Centralized cyber forensic investigation management
 */

import mongoose, { Schema } from 'mongoose';

// ============================================
// INVESTIGATION STATUS ENUM
// ============================================

export enum InvestigationStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  ANALYZING = 'analyzing',
  ESCALATED = 'escalated',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  ARCHIVED = 'archived',
}

// ============================================
// INVESTIGATION PRIORITY ENUM
// ============================================

export enum InvestigationPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

// ============================================
// INVESTIGATION CATEGORY
// ============================================

export enum InvestigationCategory {
  MALWARE = 'malware',
  DATA_BREACH = 'data_breach',
  PHISHING = 'phishing',
  INTRUSION = 'intrusion',
  RANSOMWARE = 'ransomware',
  Insider_THREAT = 'insider_threat',
  DDoS = 'ddos',
  Espionage = 'espionage',
  FRAUD = 'fraud',
  OTHER = 'other',
}

// ============================================
// INVESTIGATION PHASE
// ============================================

export enum InvestigationPhase {
  IDENTIFICATION = 'identification',
  CONTAINMENT = 'containment',
  ERADICATION = 'eradication',
  RECOVERY = 'recovery',
  LESSONS_LEARNED = 'lessons_learned',
}

// ============================================
// INVESTIGATION WORKFLOW STEPS
// ============================================

export interface InvestigationWorkflowStep {
  step: string;
  completed: boolean;
  completedAt?: Date;
  completedBy?: string;
  notes?: string;
}

// ============================================
// INVESTIGATION TIMELINE ENTRY
// ============================================

export interface InvestigationTimelineEntry {
  timestamp: Date;
  action: string;
  userId: string;
  userName: string;
  details: string;
  metadata?: Record<string, any>;
}

// ============================================
// INVESTIGATION ANALYST ASSIGNMENT
// ============================================

export interface AnalystAssignment {
  userId: string;
  role: 'lead' | 'contributor' | 'reviewer';
  assignedAt: Date;
  assignedBy: string;
}

// ============================================
// INVESTIGATION SCHEMA
// ============================================

const investigationSchema = new Schema({
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
    index: true,
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
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  assignedAnalysts: [{
    userId: {
      type: Schema.Types.ObjectId,
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
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  }],
  createdBy: {
    type: Schema.Types.ObjectId,
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
    type: Schema.Types.ObjectId,
    ref: 'Evidence',
  }],
  evidenceCount: {
    type: Number,
    default: 0,
  },
  reportIds: [{
    type: Schema.Types.ObjectId,
    ref: 'Report',
  }],
  reportCount: {
    type: Number,
    default: 0,
  },
  sandboxSessionIds: [{
    type: Schema.Types.ObjectId,
    ref: 'SandboxSession',
  }],
  alertIds: [{
    type: Schema.Types.ObjectId,
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
      type: Schema.Types.ObjectId,
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
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    userName: String,
    details: String,
    metadata: Schema.Types.Mixed,
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
    type: Schema.Types.Mixed,
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
    transform: (doc: any, ret: any) => {
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
investigationSchema.index({ caseNumber: 1 });
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
investigationSchema.methods.addTimelineEntry = function(
  action: string,
  userId: string,
  userName: string,
  details: string,
  metadata?: Record<string, any>
) {
  this.timeline.push({
    timestamp: new Date(),
    action,
    userId: userId as any,
    userName,
    details,
    metadata,
  });
  return this.save();
};

// Update status with timestamp
investigationSchema.methods.updateStatus = function(
  newStatus: InvestigationStatus,
  userId: string
) {
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

export const Investigation = mongoose.model('Investigation', investigationSchema);
export default Investigation;
