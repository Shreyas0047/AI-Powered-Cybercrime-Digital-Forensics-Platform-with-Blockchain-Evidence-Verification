/**
 * Telemetry Event Model
 * Stores normalized sandbox telemetry for analytics and correlation.
 */

import mongoose, { Schema } from 'mongoose';

const telemetryEventSchema = new Schema({
  evidenceId: {
    type: Schema.Types.ObjectId,
    ref: 'Evidence',
    index: true,
  },
  investigationId: {
    type: Schema.Types.ObjectId,
    ref: 'Investigation',
    index: true,
  },
  sessionId: {
    type: String,
    index: true,
  },
  eventType: {
    type: String,
    required: true,
    index: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: { expireAfterSeconds: 2592000 },
  },
  processId: String,
  processName: String,
  metadata: {
    type: Schema.Types.Mixed,
  },
  raw: {
    type: Schema.Types.Mixed,
  },
}, {
  timestamps: true,
});

telemetryEventSchema.index({ evidenceId: 1, timestamp: -1 });
telemetryEventSchema.index({ investigationId: 1, timestamp: -1 });
telemetryEventSchema.index({ eventType: 1, timestamp: -1 });

export const TelemetryEvent = mongoose.model('TelemetryEvent', telemetryEventSchema);
export default TelemetryEvent;
