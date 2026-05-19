"use strict";
/**
 * Behavioral Analytics Service
 * Analyze suspicious behavior and detect anomalies in forensic data
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.behavioralAnalyticsService = exports.BehavioralAnalyticsService = exports.AnomalyStatus = exports.AnomalySeverity = exports.BehavioralCategory = void 0;
const models_1 = require("../models");
const uuid_1 = require("uuid");
var BehavioralCategory;
(function (BehavioralCategory) {
    BehavioralCategory["PROCESS_EXECUTION"] = "process_execution";
    BehavioralCategory["REGISTRY_ACTIVITY"] = "registry_activity";
    BehavioralCategory["FILESYSTEM_BEHAVIOR"] = "filesystem_behavior";
    BehavioralCategory["NETWORK_ACTIVITY"] = "network_activity";
    BehavioralCategory["PERSISTENCE_MECHANISM"] = "persistence_mechanism";
    BehavioralCategory["PRIVILEGE_ESCALATION"] = "privilege_escalation";
    BehavioralCategory["LATERAL_MOVEMENT"] = "lateral_movement";
    BehavioralCategory["DATA_EXFILTRATION"] = "data_exfiltration";
    BehavioralCategory["COMMAND_EXECUTION"] = "command_execution";
    BehavioralCategory["SUSPICIOUS_DOWNLOAD"] = "suspicious_download";
})(BehavioralCategory || (exports.BehavioralCategory = BehavioralCategory = {}));
var AnomalySeverity;
(function (AnomalySeverity) {
    AnomalySeverity["CRITICAL"] = "critical";
    AnomalySeverity["HIGH"] = "high";
    AnomalySeverity["MEDIUM"] = "medium";
    AnomalySeverity["LOW"] = "low";
    AnomalySeverity["INFO"] = "info";
})(AnomalySeverity || (exports.AnomalySeverity = AnomalySeverity = {}));
var AnomalyStatus;
(function (AnomalyStatus) {
    AnomalyStatus["NEW"] = "new";
    AnomalyStatus["INVESTIGATING"] = "investigating";
    AnomalyStatus["CONFIRMED"] = "confirmed";
    AnomalyStatus["FALSE_POSITIVE"] = "false_positive";
    AnomalyStatus["MITIGATED"] = "mitigated";
})(AnomalyStatus || (exports.AnomalyStatus = AnomalyStatus = {}));
class BehavioralAnalyticsService {
    behavioralPatterns = [
        {
            patternId: 'PATTERN-001',
            category: BehavioralCategory.PERSISTENCE_MECHANISM,
            name: 'Registry Run Key Persistence',
            description: 'Suspicious registry modification for persistence',
            indicators: ['HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', 'reg add'],
            mitreTactics: ['persistence'],
            severityWeight: 75,
            detectionRules: ['registry_write', 'autorun_key'],
        },
        {
            patternId: 'PATTERN-002',
            category: BehavioralCategory.PROCESS_EXECUTION,
            name: 'Suspicious Process Injection',
            description: 'Process injection or suspicious execution chain',
            indicators: ['VirtualAllocEx', 'WriteProcessMemory', 'CreateRemoteThread'],
            mitreTactics: ['defense_evasion', 'execution'],
            severityWeight: 85,
            detectionRules: ['process_injection', 'memory_manipulation'],
        },
        {
            patternId: 'PATTERN-003',
            category: BehavioralCategory.COMMAND_EXECUTION,
            name: 'Encoded Command Execution',
            description: 'Use of encoded or obfuscated commands',
            indicators: ['-enc', 'base64', 'FromBase64String'],
            mitreTactics: ['defense_evasion'],
            severityWeight: 65,
            detectionRules: ['encoded_command', 'obfuscation'],
        },
        {
            patternId: 'PATTERN-004',
            category: BehavioralCategory.NETWORK_ACTIVITY,
            name: 'Suspicious Network Behavior',
            description: 'Unusual outbound network communication',
            indicators: ['high_port', 'dns_query', 'unusual_destination'],
            mitreTactics: ['command_and_control', 'exfiltration'],
            severityWeight: 70,
            detectionRules: ['network_anomaly', 'c2_indicators'],
        },
        {
            patternId: 'PATTERN-005',
            category: BehavioralCategory.DATA_EXFILTRATION,
            name: 'Large Data Transfer',
            description: 'Large volume data transfer to external destination',
            indicators: ['large_upload', 'archive_creation', 'compressed_transfer'],
            mitreTactics: ['exfiltration'],
            severityWeight: 80,
            detectionRules: ['data_volume', 'archive_creation'],
        },
        {
            patternId: 'PATTERN-006',
            category: BehavioralCategory.FILESYSTEM_BEHAVIOR,
            name: 'Suspicious File Operation',
            description: 'Suspicious file modification or creation',
            indicators: ['overwrite_system', 'hidden_extension', 'temp_execution'],
            mitreTactics: ['impact', 'collection'],
            severityWeight: 60,
            detectionRules: ['file_anomaly', 'hidden_files'],
        },
    ];
    /**
     * Analyze process behavior
     */
    async analyzeProcessBehavior(evidenceId) {
        const evidence = await models_1.Evidence.findById(evidenceId);
        if (!evidence) {
            throw new Error('Evidence not found');
        }
        // Gather telemetry for this evidence
        const telemetry = await models_1.TelemetryEvent.find({
            evidenceId,
            timestamp: { $gte: new Date(Date.now() - 3600000) }, // Last hour
        }).lean();
        // Analyze process behavior
        const actions = [];
        let networkConnections = 0;
        let registryWrites = 0;
        let fileOperations = 0;
        const suspiciousIndicators = [];
        const riskFactors = [];
        for (const event of telemetry) {
            if (event.eventType.includes('network'))
                networkConnections++;
            if (event.eventType.includes('registry'))
                registryWrites++;
            if (event.eventType.includes('file'))
                fileOperations++;
            actions.push(event.eventType);
            // Check against patterns
            for (const pattern of this.behavioralPatterns) {
                const matches = this.matchPattern(event, pattern);
                if (matches) {
                    suspiciousIndicators.push(pattern.name);
                    riskFactors.push(`${pattern.category}: ${pattern.name}`);
                }
            }
        }
        // Calculate threat score
        const baseScore = Math.min(100, suspiciousIndicators.length * 20 + riskFactors.length * 10);
        const networkRisk = Math.min(20, networkConnections > 5 ? 20 : networkConnections * 4);
        const registryRisk = Math.min(20, registryWrites > 3 ? 20 : registryWrites * 6);
        const threatScore = Math.min(100, baseScore + networkRisk + registryRisk);
        return {
            processId: evidenceId,
            processName: evidence.name,
            actions: [...new Set(actions)],
            networkConnections,
            registryWrites,
            fileOperations,
            suspiciousIndicators: [...new Set(suspiciousIndicators)],
            threatScore,
            riskFactors: [...new Set(riskFactors)],
        };
    }
    /**
     * Detect anomalies in evidence
     */
    async detectAnomalies(evidenceId) {
        const anomalies = [];
        const evidence = await models_1.Evidence.findById(evidenceId);
        if (!evidence) {
            return anomalies;
        }
        // Check integrity anomalies
        if (evidence.metadata?.integrityState === 'modified') {
            anomalies.push({
                anomalyId: (0, uuid_1.v4)(),
                severity: AnomalySeverity.CRITICAL,
                category: BehavioralCategory.FILESYSTEM_BEHAVIOR,
                title: 'Evidence Integrity Mismatch',
                description: 'Evidence file hash does not match recorded fingerprint',
                evidence: [{ type: 'evidence', id: evidenceId, value: evidence.name }],
                indicators: ['hash_mismatch', 'integrity_failure'],
                confidence: 95,
                detectedAt: new Date(),
                threatScore: 90,
                status: AnomalyStatus.NEW,
                enrichment: {
                    relatedIocs: [],
                    behavioralPattern: 'Evidence Integrity Violation',
                    mitreTactics: ['impact'],
                    riskFactors: ['Evidence tampering detected', 'Hash mismatch on critical evidence'],
                },
            });
        }
        // Check telemetry for behavioral anomalies
        const telemetry = await models_1.TelemetryEvent.find({ evidenceId }).limit(100).lean();
        const behavioralAnomalies = this.analyzeBehavioralAnomalies(telemetry);
        anomalies.push(...behavioralAnomalies);
        // Check for suspicious process patterns
        for (const pattern of this.behavioralPatterns) {
            const matches = this.checkPatternMatch(evidence, telemetry, pattern);
            if (matches) {
                anomalies.push(this.createAnomalyFromPattern(pattern, evidenceId, matches));
            }
        }
        return anomalies;
    }
    /**
     * Analyze behavioral anomalies from telemetry
     */
    analyzeBehavioralAnomalies(telemetry) {
        const anomalies = [];
        // Check for unusual telemetry volume
        const eventCounts = new Map();
        for (const event of telemetry) {
            eventCounts.set(event.eventType, (eventCounts.get(event.eventType) || 0) + 1);
        }
        // Detect volume anomalies
        for (const [eventType, count] of eventCounts) {
            if (count > 50) {
                anomalies.push({
                    anomalyId: (0, uuid_1.v4)(),
                    severity: AnomalySeverity.MEDIUM,
                    category: this.categorizeEventType(eventType),
                    title: `High Volume ${eventType} Activity`,
                    description: `Unusually high count of ${eventType} events detected`,
                    evidence: [{ type: 'telemetry', id: eventType, value: `${count} events` }],
                    indicators: ['high_volume', 'unusual_frequency'],
                    confidence: 70,
                    detectedAt: new Date(),
                    threatScore: 40,
                    status: AnomalyStatus.NEW,
                    enrichment: {
                        relatedIocs: [],
                        mitreTactics: ['discovery'],
                        riskFactors: [`${count} ${eventType} events in short period`],
                    },
                });
            }
        }
        return anomalies;
    }
    /**
     * Match pattern against telemetry
     */
    matchPattern(event, pattern) {
        for (const indicator of pattern.indicators) {
            if (JSON.stringify(event).includes(indicator)) {
                return true;
            }
        }
        return false;
    }
    /**
     * Check if evidence matches pattern
     */
    checkPatternMatch(evidence, telemetry, pattern) {
        const matches = [];
        // Check evidence metadata
        if (evidence.metadata) {
            const metaStr = JSON.stringify(evidence.metadata);
            for (const indicator of pattern.indicators) {
                if (metaStr.toLowerCase().includes(indicator.toLowerCase())) {
                    matches.push(`Evidence: ${indicator}`);
                }
            }
        }
        // Check telemetry
        for (const event of telemetry) {
            const eventStr = JSON.stringify(event);
            for (const indicator of pattern.indicators) {
                if (eventStr.toLowerCase().includes(indicator.toLowerCase())) {
                    matches.push(`Telemetry: ${indicator}`);
                }
            }
        }
        return matches;
    }
    /**
     * Create anomaly from pattern match
     */
    createAnomalyFromPattern(pattern, evidenceId, matches) {
        const severityMap = {
            critical: AnomalySeverity.CRITICAL,
            high: AnomalySeverity.HIGH,
            medium: AnomalySeverity.MEDIUM,
            low: AnomalySeverity.LOW,
        };
        const severity = pattern.severityWeight >= 80 ? AnomalySeverity.CRITICAL :
            pattern.severityWeight >= 60 ? AnomalySeverity.HIGH :
                pattern.severityWeight >= 40 ? AnomalySeverity.MEDIUM :
                    AnomalySeverity.LOW;
        return {
            anomalyId: (0, uuid_1.v4)(),
            severity,
            category: pattern.category,
            title: pattern.name,
            description: pattern.description,
            evidence: [{ type: 'evidence', id: evidenceId, value: pattern.patternId }],
            indicators: matches,
            confidence: Math.min(95, 50 + matches.length * 15),
            detectedAt: new Date(),
            threatScore: pattern.severityWeight,
            status: AnomalyStatus.NEW,
            enrichment: {
                relatedIocs: [],
                behavioralPattern: pattern.patternId,
                mitreTactics: pattern.mitreTactics,
                riskFactors: pattern.indicators.slice(0, 3),
            },
        };
    }
    /**
     * Categorize event type to behavioral category
     */
    categorizeEventType(eventType) {
        if (eventType.includes('registry'))
            return BehavioralCategory.REGISTRY_ACTIVITY;
        if (eventType.includes('network') || eventType.includes('connection'))
            return BehavioralCategory.NETWORK_ACTIVITY;
        if (eventType.includes('file'))
            return BehavioralCategory.FILESYSTEM_BEHAVIOR;
        if (eventType.includes('process'))
            return BehavioralCategory.PROCESS_EXECUTION;
        if (eventType.includes('command') || eventType.includes('cmd'))
            return BehavioralCategory.COMMAND_EXECUTION;
        return BehavioralCategory.PROCESS_EXECUTION;
    }
    /**
     * Get behavioral patterns
     */
    getBehavioralPatterns() {
        return this.behavioralPatterns;
    }
    /**
     * Analyze behavioral baseline
     */
    async analyzeBehavioralBaseline(investigationId) {
        const evidence = await models_1.Evidence.find({ investigationId }).lean();
        const evidenceIds = evidence.map(e => e._id);
        const telemetry = await models_1.TelemetryEvent.find({
            evidenceId: { $in: evidenceIds },
        }).sort({ timestamp: 1 }).limit(500).lean();
        // Build baseline counts
        const baseline = {};
        const eventByType = {};
        for (const event of telemetry) {
            if (!eventByType[event.eventType]) {
                eventByType[event.eventType] = [];
            }
            eventByType[event.eventType].push(event.timestamp.getTime());
        }
        for (const [eventType, timestamps] of Object.entries(eventByType)) {
            baseline[eventType] = {
                count: timestamps.length,
                avgInterval: timestamps.length > 1
                    ? (timestamps[timestamps.length - 1] - timestamps[0]) / (timestamps.length - 1) / 1000
                    : 0,
            };
        }
        // Identify deviations (events that deviate significantly from baseline)
        const deviations = [];
        for (const event of telemetry) {
            const eventBaseline = baseline[event.eventType];
            if (eventBaseline && eventBaseline.count > 10) {
                // Check for timestamp anomalies
                if (event.metadata?.timestamp_analysis) {
                    const analysis = event.metadata.timestamp_analysis;
                    if (analysis.suspicious_timing) {
                        deviations.push(`${event.eventType}: Suspicious timing at ${event.timestamp}`);
                    }
                }
            }
        }
        return { baseline, deviations };
    }
}
exports.BehavioralAnalyticsService = BehavioralAnalyticsService;
exports.behavioralAnalyticsService = new BehavioralAnalyticsService();
exports.default = exports.behavioralAnalyticsService;
//# sourceMappingURL=behavioral-analytics.service.js.map