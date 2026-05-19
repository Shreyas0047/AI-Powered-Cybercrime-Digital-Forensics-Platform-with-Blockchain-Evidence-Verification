"use strict";
/**
 * Sandbox Session Model
 * Mongoose schema for desktop sandbox synchronization
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
exports.SandboxSession = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const sandboxSessionSchema = new mongoose_1.Schema({
    sessionId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    vmName: {
        type: String,
        required: true,
    },
    simulatorId: {
        type: String,
        required: true,
    },
    simulatorName: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ['pending', 'running', 'completed', 'failed', 'timeout'],
        default: 'pending',
        index: true,
    },
    startTime: {
        type: Date,
        required: true,
    },
    endTime: Date,
    duration: Number,
    exitCode: Number,
    eventsCollected: {
        type: Number,
        default: 0,
    },
    evidenceFiles: [{
            type: String,
        }],
    errorMessages: {
        type: [String],
        default: [],
    },
    syncedAt: {
        type: Date,
        default: Date.now,
    },
    // Execution summary from sandbox
    executionSummary: {
        simulatorId: String,
        simulatorName: String,
        startTime: Date,
        endTime: Date,
        exitCode: Number,
        duration: Number,
        eventsCollected: Number,
        findings: [mongoose_1.Schema.Types.Mixed],
        iocIndicators: [mongoose_1.Schema.Types.Mixed],
        artifacts: [String],
        syncedAt: Date,
    },
    // Heartbeat and health monitoring
    lastHeartbeat: Date,
    vmState: String,
    memoryUsage: Number,
    cpuUsage: Number,
    // Telemetry data
    telemetry: [{
            timestamp: Date,
            eventCount: Number,
            eventCounts: mongoose_1.Schema.Types.Mixed,
            anomalies: Number,
        }],
    recentEvents: [{
            id: String,
            timestamp: String,
            type: String,
            source: String,
            details: mongoose_1.Schema.Types.Mixed,
            receivedAt: Date,
        }],
    suspiciousEvents: [{
            timestamp: String,
            type: String,
            source: String,
            details: mongoose_1.Schema.Types.Mixed,
            flaggedAt: Date,
            reason: String,
        }],
    extractedIOCs: [{
            type: String,
            value: String,
            source: String,
        }],
    // Rollback status
    rollbackStatus: {
        completed: Boolean,
        success: Boolean,
        snapshotRestored: String,
        errors: [String],
        completedAt: Date,
    },
    // Additional metadata
    metadata: {
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
// Indexes
sandboxSessionSchema.index({ status: 1, startTime: -1 });
sandboxSessionSchema.index({ simulatorId: 1 });
sandboxSessionSchema.index({ syncedAt: -1 });
exports.SandboxSession = mongoose_1.default.model('SandboxSession', sandboxSessionSchema);
exports.default = exports.SandboxSession;
//# sourceMappingURL=sandbox-session.model.js.map