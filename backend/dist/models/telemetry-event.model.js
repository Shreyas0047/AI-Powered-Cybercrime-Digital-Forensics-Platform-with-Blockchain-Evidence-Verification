"use strict";
/**
 * Telemetry Event Model
 * Stores normalized sandbox telemetry for analytics and correlation.
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
exports.TelemetryEvent = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const telemetryEventSchema = new mongoose_1.Schema({
    evidenceId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Evidence',
        index: true,
    },
    investigationId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
        type: mongoose_1.Schema.Types.Mixed,
    },
    raw: {
        type: mongoose_1.Schema.Types.Mixed,
    },
}, {
    timestamps: true,
});
telemetryEventSchema.index({ evidenceId: 1, timestamp: -1 });
telemetryEventSchema.index({ investigationId: 1, timestamp: -1 });
telemetryEventSchema.index({ eventType: 1, timestamp: -1 });
exports.TelemetryEvent = mongoose_1.default.model('TelemetryEvent', telemetryEventSchema);
exports.default = exports.TelemetryEvent;
//# sourceMappingURL=telemetry-event.model.js.map