/**
 * Audit Log Model
 * Tracks all user actions for compliance and security
 */

import mongoose, { Schema } from 'mongoose';

const auditLogSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  action: {
    type: String,
    required: true,
    index: true,
  },
  entityType: {
    type: String,
    index: true,
  },
  entityId: {
    type: String,
  },
  details: {
    type: Schema.Types.Mixed,
    default: {},
  },
  ipAddress: {
    type: String,
  },
  userAgent: {
    type: String,
  },
  status: {
    type: String,
    enum: ['success', 'failed'],
    default: 'success',
    index: true,
  },
  errorMessage: {
    type: String,
  },
}, {
  timestamps: { createdAt: 'timestamp', updatedAt: false },
  toJSON: {
    transform: (doc: any, ret: any) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
});

// Indexes for querying
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });

// Static methods for logging
auditLogSchema.statics.log = async function(data: {
  userId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  status?: 'success' | 'failed';
  errorMessage?: string;
}) {
  return this.create(data);
};

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;