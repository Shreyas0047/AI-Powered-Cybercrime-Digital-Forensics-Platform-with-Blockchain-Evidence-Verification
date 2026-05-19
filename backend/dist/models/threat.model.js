"use strict";
/**
 * IOC (Indicator of Compromise) Model
 * Threat intelligence data models
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
exports.ThreatAnalytics = exports.ThreatEnrichment = exports.ThreatCorrelation = exports.IOC = exports.MITRETactics = exports.IOCStatus = exports.IOCSeverity = exports.IOCTypes = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// ============================================
// IOC TYPES
// ============================================
var IOCTypes;
(function (IOCTypes) {
    IOCTypes["IP_ADDRESS"] = "ip_address";
    IOCTypes["DOMAIN"] = "domain";
    IOCTypes["URL"] = "url";
    IOCTypes["FILE_HASH"] = "file_hash";
    IOCTypes["PROCESS_NAME"] = "process_name";
    IOCTypes["REGISTRY_KEY"] = "registry_key";
    IOCTypes["FILE_PATH"] = "file_path";
    IOCTypes["COMMAND_LINE"] = "command_line";
    IOCTypes["EMAIL"] = "email";
    IOCTypes["MUTEX"] = "mutex";
    IOCTypes["YARA_RULE"] = "yara_rule";
    IOCTypes["BEHAVIORAL"] = "behavioral";
})(IOCTypes || (exports.IOCTypes = IOCTypes = {}));
var IOCSeverity;
(function (IOCSeverity) {
    IOCSeverity["CRITICAL"] = "critical";
    IOCSeverity["HIGH"] = "high";
    IOCSeverity["MEDIUM"] = "medium";
    IOCSeverity["LOW"] = "low";
    IOCSeverity["INFO"] = "info";
})(IOCSeverity || (exports.IOCSeverity = IOCSeverity = {}));
var IOCStatus;
(function (IOCStatus) {
    IOCStatus["ACTIVE"] = "active";
    IOCStatus["INACTIVE"] = "inactive";
    IOCStatus["OBSOLETE"] = "obsolete";
    IOCStatus["FALSE_POSITIVE"] = "false_positive";
})(IOCStatus || (exports.IOCStatus = IOCStatus = {}));
var MITRETactics;
(function (MITRETactics) {
    MITRETactics["RECONNAISSANCE"] = "reconnaissance";
    MITRETactics["RESOURCE_DEVELOPMENT"] = "resource_development";
    MITRETactics["INITIAL_ACCESS"] = "initial_access";
    MITRETactics["EXECUTION"] = "execution";
    MITRETactics["PERSISTENCE"] = "persistence";
    MITRETactics["PRIVILEGE_ESCALATION"] = "privilege_escalation";
    MITRETactics["DEFENSE_EVASION"] = "defense_evasion";
    MITRETactics["CREDENTIAL_ACCESS"] = "credential_access";
    MITRETactics["DISCOVERY"] = "discovery";
    MITRETactics["LATERAL_MOVEMENT"] = "lateral_movement";
    MITRETactics["COLLECTION"] = "collection";
    MITRETactics["COMMAND_AND_CONTROL"] = "command_and_control";
    MITRETactics["EXFILTRATION"] = "exfiltration";
    MITRETactics["IMPACT"] = "impact";
})(MITRETactics || (exports.MITRETactics = MITRETactics = {}));
// ============================================
// IOC SCHEMA
// ============================================
const iocSchema = new mongoose_1.Schema({
    iocId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    // IOC type and value
    type: {
        type: String,
        enum: Object.values(IOCTypes),
        required: true,
        index: true,
    },
    value: {
        type: String,
        required: true,
        index: true,
    },
    // Classification
    severity: {
        type: String,
        enum: Object.values(IOCSeverity),
        default: IOCSeverity.MEDIUM,
        index: true,
    },
    status: {
        type: String,
        enum: Object.values(IOCStatus),
        default: IOCStatus.ACTIVE,
        index: true,
    },
    // Context
    category: {
        type: String,
        required: true,
        index: true,
    },
    description: String,
    // Source
    source: {
        type: String,
        required: true,
    },
    confidence: {
        type: Number,
        min: 0,
        max: 100,
        default: 50,
    },
    // MITRE ATT&CK mapping
    mitreTactics: [{
            type: String,
            enum: Object.values(MITRETactics),
        }],
    mitreTechniques: [String],
    // Related entities
    linkedEvidence: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Evidence',
        }],
    linkedInvestigations: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Investigation',
        }],
    // Behavioral signature
    behavioralSignature: {
        processTree: [String],
        networkPatterns: [String],
        registryPatterns: [String],
        filePatterns: [String],
    },
    // Statistics
    firstSeenAt: {
        type: Date,
        default: Date.now,
    },
    lastSeenAt: {
        type: Date,
        default: Date.now,
    },
    occurrenceCount: {
        type: Number,
        default: 1,
    },
    // Threat scoring
    threatScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
    },
    // Tags
    tags: [String],
    // Analyst notes
    analystNotes: String,
    // Created by
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    // Reputation
    falsePositiveCount: {
        type: Number,
        default: 0,
    },
    verifiedCount: {
        type: Number,
        default: 0,
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
// THREAT CORRELATION SCHEMA
// ============================================
const threatCorrelationSchema = new mongoose_1.Schema({
    correlationId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    // Correlation type
    correlationType: {
        type: String,
        enum: ['ioc_match', 'behavioral_pattern', 'telemetry_similarity', 'investigation_link', 'time_correlation'],
        required: true,
    },
    // Entities involved
    entities: [{
            entityType: {
                type: String,
                enum: ['evidence', 'ioc', 'investigation', 'telemetry', 'alert'],
            },
            entityId: String,
            entityValue: String,
        }],
    // Correlation strength
    strength: {
        type: Number,
        min: 0,
        max: 100,
        required: true,
    },
    // Details
    description: String,
    // Related investigations
    linkedInvestigations: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Investigation',
        }],
    // Evidence cluster
    clusterId: String,
    clusterLabel: String,
    // Visualization data
    graphData: {
        nodes: [{
                id: String,
                type: String,
                label: String,
            }],
        edges: [{
                source: String,
                target: String,
                relationship: String,
            }],
    },
    // Detection
    detectedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    detectedAt: {
        type: Date,
        default: Date.now,
    },
    // Status
    status: {
        type: String,
        enum: ['new', 'investigating', 'confirmed', 'dismissed'],
        default: 'new',
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
// THREAT ENRICHMENT SCHEMA
// ============================================
const threatEnrichmentSchema = new mongoose_1.Schema({
    enrichmentId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    // Target entity
    targetType: {
        type: String,
        enum: ['evidence', 'ioc', 'investigation', 'alert'],
        required: true,
    },
    targetId: {
        type: String,
        required: true,
        index: true,
    },
    // Enrichment data
    enrichmentType: {
        type: String,
        enum: ['ioc_lookup', 'behavioral_analysis', 'historical_correlation', 'threat_actor_mapping', 'geolocation', 'reputation_check'],
        required: true,
    },
    // Results
    matchedIocs: [{
            iocId: String,
            iocType: String,
            iocValue: String,
            severity: String,
            confidence: Number,
        }],
    relatedEntities: [{
            entityType: String,
            entityId: String,
            relationship: String,
            relevanceScore: Number,
        }],
    behavioralContext: {
        pattern: String,
        anomalies: [String],
        riskIndicators: [String],
    },
    // Threat context
    threatContext: {
        threatActor: String,
        attackCampaign: String,
        associatedMalware: [String],
        associatedTTPs: [String],
    },
    // Enrichment metadata
    enrichedAt: {
        type: Date,
        default: Date.now,
    },
    confidence: {
        type: Number,
        min: 0,
        max: 100,
    },
    rawData: mongoose_1.Schema.Types.Mixed,
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
// THREAT ANALYTICS SCHEMA
// ============================================
const threatAnalyticsSchema = new mongoose_1.Schema({
    analyticsId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    // Analytics type
    analyticsType: {
        type: String,
        enum: ['trend', 'heatmap', 'distribution', 'correlation', 'anomaly'],
        required: true,
    },
    // Time range
    timeRange: {
        start: Date,
        end: Date,
    },
    // Data
    data: {
        labels: [String],
        values: [Number],
        series: [{
                name: String,
                data: [Number],
            }],
    },
    // Filters
    filters: {
        severity: [String],
        iocTypes: [String],
        categories: [String],
        investigations: [String],
    },
    // Visualization
    visualizationConfig: {
        chartType: String,
        colorScheme: [String],
        thresholds: [{
                value: Number,
                color: String,
                label: String,
            }],
    },
    generatedAt: {
        type: Date,
        default: Date.now,
    },
    generatedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
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
// CREATE MODELS
// ============================================
exports.IOC = mongoose_1.default.model('IOC', iocSchema);
exports.ThreatCorrelation = mongoose_1.default.model('ThreatCorrelation', threatCorrelationSchema);
exports.ThreatEnrichment = mongoose_1.default.model('ThreatEnrichment', threatEnrichmentSchema);
exports.ThreatAnalytics = mongoose_1.default.model('ThreatAnalytics', threatAnalyticsSchema);
// ============================================
// INDEXES
// ============================================
iocSchema.index({ type: 1, status: 1 });
iocSchema.index({ severity: 1, status: 1 });
iocSchema.index({ category: 1, severity: 1 });
iocSchema.index({ value: 'text' });
iocSchema.index({ threatScore: -1 });
iocSchema.index({ lastSeenAt: -1 });
iocSchema.index({ tags: 1 });
threatCorrelationSchema.index({ correlationType: 1, status: 1 });
threatCorrelationSchema.index({ strength: -1 });
threatCorrelationSchema.index({ 'entities.entityId': 1 });
threatCorrelationSchema.index({ clusterId: 1 });
threatEnrichmentSchema.index({ targetType: 1, targetId: 1 });
threatEnrichmentSchema.index({ enrichmentType: 1, enrichedAt: -1 });
threatAnalyticsSchema.index({ analyticsType: 1, generatedAt: -1 });
exports.default = {
    IOC: exports.IOC,
    ThreatCorrelation: exports.ThreatCorrelation,
    ThreatEnrichment: exports.ThreatEnrichment,
    ThreatAnalytics: exports.ThreatAnalytics,
};
//# sourceMappingURL=threat.model.js.map