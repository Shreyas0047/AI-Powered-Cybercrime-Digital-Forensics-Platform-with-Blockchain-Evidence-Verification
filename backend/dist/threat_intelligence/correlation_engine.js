"use strict";
/**
 * Correlation Engine
 * Correlates telemetry events to identify multi-stage attack patterns
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.correlationEngine = exports.CorrelationEngine = void 0;
const uuid_1 = require("uuid");
const threat_models_1 = require("./threat_models");
const attackSignatures = [
    {
        name: 'Multi-Stage Intrusion Pattern',
        description: 'Process creates files, opens network connection, and establishes persistence',
        severity: threat_models_1.BehaviorSeverity.HIGH,
        requiredSequence: [
            threat_models_1.NormalizedEventType.PROCESS_START,
            threat_models_1.NormalizedEventType.FILE_CREATE,
            threat_models_1.NormalizedEventType.NETWORK_CONNECT,
            threat_models_1.NormalizedEventType.REGISTRY_MODIFY
        ],
        minConfidence: 70,
        extractSteps: (events) => {
            const steps = [];
            let order = 1;
            const processStart = events.find(e => e.normalizedType === threat_models_1.NormalizedEventType.PROCESS_START);
            if (processStart) {
                steps.push({
                    order: order++,
                    timestamp: processStart.timestamp,
                    event: processStart,
                    description: `Initial process: ${processStart.metadata.processName || 'unknown'}`
                });
            }
            const fileCreate = events.find(e => e.normalizedType === threat_models_1.NormalizedEventType.FILE_CREATE);
            if (fileCreate) {
                steps.push({
                    order: order++,
                    timestamp: fileCreate.timestamp,
                    event: fileCreate,
                    description: `File created: ${fileCreate.metadata.path || 'unknown'}`
                });
            }
            const networkConnect = events.find(e => e.normalizedType === threat_models_1.NormalizedEventType.NETWORK_CONNECT);
            if (networkConnect) {
                steps.push({
                    order: order++,
                    timestamp: networkConnect.timestamp,
                    event: networkConnect,
                    description: `Network connection to ${networkConnect.metadata.destination || 'unknown'}`
                });
            }
            const registryModify = events.find(e => e.normalizedType === threat_models_1.NormalizedEventType.REGISTRY_MODIFY ||
                e.normalizedType === threat_models_1.NormalizedEventType.REGISTRY_CREATE);
            if (registryModify) {
                steps.push({
                    order: order++,
                    timestamp: registryModify.timestamp,
                    event: registryModify,
                    description: `Registry modified for persistence: ${registryModify.metadata.path || 'unknown'}`
                });
            }
            return steps;
        }
    },
    {
        name: 'Data Exfiltration Pattern',
        description: 'Suspicious process collects data and sends to external destination',
        severity: threat_models_1.BehaviorSeverity.CRITICAL,
        requiredSequence: [
            threat_models_1.NormalizedEventType.PROCESS_START,
            threat_models_1.NormalizedEventType.FILE_CREATE,
            threat_models_1.NormalizedEventType.NETWORK_DATA_SENT
        ],
        minConfidence: 60,
        extractSteps: (events) => {
            const steps = [];
            let order = 1;
            const processStart = events.find(e => e.normalizedType === threat_models_1.NormalizedEventType.PROCESS_START);
            if (processStart) {
                steps.push({
                    order: order++,
                    timestamp: processStart.timestamp,
                    event: processStart,
                    description: `Collector process started: ${processStart.metadata.processName || 'unknown'}`
                });
            }
            const files = events.filter(e => e.normalizedType === threat_models_1.NormalizedEventType.FILE_CREATE ||
                e.normalizedType === threat_models_1.NormalizedEventType.FILE_MODIFY).slice(0, 3);
            for (const file of files) {
                steps.push({
                    order: order++,
                    timestamp: file.timestamp,
                    event: file,
                    description: `Data collected: ${file.metadata.path || file.metadata.target || 'unknown'}`
                });
            }
            const networkSend = events.find(e => e.normalizedType === threat_models_1.NormalizedEventType.NETWORK_DATA_SENT);
            if (networkSend) {
                steps.push({
                    order: order++,
                    timestamp: networkSend.timestamp,
                    event: networkSend,
                    description: `Data exfiltrated to: ${networkSend.metadata.destination || 'unknown'}`
                });
            }
            return steps;
        }
    },
    {
        name: 'Privilege Escalation Chain',
        description: 'Process attempts privilege escalation followed by persistence',
        severity: threat_models_1.BehaviorSeverity.HIGH,
        requiredSequence: [
            threat_models_1.NormalizedEventType.PROCESS_START,
            threat_models_1.NormalizedEventType.PROCESS_START,
            threat_models_1.NormalizedEventType.REGISTRY_MODIFY
        ],
        minConfidence: 50,
        extractSteps: (events) => {
            const steps = [];
            let order = 1;
            const processes = events.filter(e => e.normalizedType === threat_models_1.NormalizedEventType.PROCESS_START).slice(0, 3);
            for (const process of processes) {
                steps.push({
                    order: order++,
                    timestamp: process.timestamp,
                    event: process,
                    description: `Process executed: ${process.metadata.processName || 'unknown'}`
                });
            }
            const registryModify = events.find(e => e.normalizedType === threat_models_1.NormalizedEventType.REGISTRY_MODIFY ||
                e.normalizedType === threat_models_1.NormalizedEventType.REGISTRY_CREATE);
            if (registryModify && registryModify.behavioralTags.includes('persistence_registry')) {
                steps.push({
                    order: order++,
                    timestamp: registryModify.timestamp,
                    event: registryModify,
                    description: `Persistence established: ${registryModify.metadata.path || 'unknown'}`
                });
            }
            return steps;
        }
    },
    {
        name: 'Ransomware Execution Pattern',
        description: 'Mass file modification with encryption indicators and network beaconing',
        severity: threat_models_1.BehaviorSeverity.CRITICAL,
        requiredSequence: [
            threat_models_1.NormalizedEventType.MASS_FILE_MODIFICATION,
            threat_models_1.NormalizedEventType.FILE_RENAME,
            threat_models_1.NormalizedEventType.NETWORK_CONNECT
        ],
        minConfidence: 75,
        extractSteps: (events) => {
            const steps = [];
            let order = 1;
            const massFileMod = events.find(e => e.normalizedType === threat_models_1.NormalizedEventType.MASS_FILE_MODIFICATION);
            if (massFileMod) {
                steps.push({
                    order: order++,
                    timestamp: massFileMod.timestamp,
                    event: massFileMod,
                    description: 'Mass file modification detected (possible encryption)'
                });
            }
            const fileRenames = events.filter(e => e.normalizedType === threat_models_1.NormalizedEventType.FILE_RENAME).slice(0, 3);
            for (const rename of fileRenames) {
                steps.push({
                    order: order++,
                    timestamp: rename.timestamp,
                    event: rename,
                    description: `File renamed: ${rename.metadata.target || rename.metadata.path || 'unknown'}`
                });
            }
            const networkConnect = events.find(e => e.normalizedType === threat_models_1.NormalizedEventType.NETWORK_CONNECT);
            if (networkConnect) {
                steps.push({
                    order: order++,
                    timestamp: networkConnect.timestamp,
                    event: networkConnect,
                    description: `Outbound connection (possible C2): ${networkConnect.metadata.destination || 'unknown'}`
                });
            }
            const ransomNote = events.find(e => e.normalizedType === threat_models_1.NormalizedEventType.RANSOM_NOTE_CREATION);
            if (ransomNote) {
                steps.push({
                    order: order++,
                    timestamp: ransomNote.timestamp,
                    event: ransomNote,
                    description: 'Ransom note created - ransomware behavior confirmed'
                });
            }
            return steps;
        }
    },
    {
        name: 'Lateral Movement Pattern',
        description: 'Multiple internal network connections followed by process spawning',
        severity: threat_models_1.BehaviorSeverity.HIGH,
        requiredSequence: [
            threat_models_1.NormalizedEventType.NETWORK_CONNECT,
            threat_models_1.NormalizedEventType.NETWORK_CONNECT,
            threat_models_1.NormalizedEventType.PROCESS_START
        ],
        minConfidence: 55,
        extractSteps: (events) => {
            const steps = [];
            let order = 1;
            const internalConnections = events.filter(e => e.normalizedType === threat_models_1.NormalizedEventType.NETWORK_CONNECT &&
                e.behavioralTags.includes('internal_network')).slice(0, 5);
            for (const conn of internalConnections) {
                steps.push({
                    order: order++,
                    timestamp: conn.timestamp,
                    event: conn,
                    description: `Internal network connection: ${conn.metadata.destination || 'unknown'}`
                });
            }
            const processStart = events.find(e => e.normalizedType === threat_models_1.NormalizedEventType.PROCESS_START &&
                e.behavioralTags.includes('script_execution'));
            if (processStart) {
                steps.push({
                    order: order++,
                    timestamp: processStart.timestamp,
                    event: processStart,
                    description: `Remote execution: ${processStart.metadata.processName || 'unknown'}`
                });
            }
            return steps;
        }
    }
];
class CorrelationEngine {
    correlateEvents(events) {
        const patterns = [];
        for (const signature of attackSignatures) {
            try {
                const hasRequiredEvents = this.checkRequiredSequence(events, signature.requiredSequence);
                if (hasRequiredEvents) {
                    const steps = signature.extractSteps(events);
                    if (steps.length >= 2) {
                        const confidence = this.calculatePatternConfidence(steps, signature.requiredSequence.length);
                        if (confidence >= signature.minConfidence) {
                            const pattern = {
                                id: (0, uuid_1.v4)(),
                                name: signature.name,
                                description: signature.description,
                                severity: signature.severity,
                                events: steps.map(s => s.event),
                                timeline: steps,
                                confidence
                            };
                            patterns.push(pattern);
                        }
                    }
                }
            }
            catch (error) {
                console.error(`Error matching attack signature ${signature.name}: ${error}`);
            }
        }
        return this.deduplicatePatterns(patterns);
    }
    checkRequiredSequence(events, required) {
        const eventTypes = new Set(events.map(e => e.normalizedType));
        return required.every(type => eventTypes.has(type));
    }
    calculatePatternConfidence(steps, requiredCount) {
        const baseConfidence = (steps.length / requiredCount) * 70;
        const timelineConfidence = steps.length > 2 ? 20 : 10;
        return Math.min(100, Math.round(baseConfidence + timelineConfidence));
    }
    deduplicatePatterns(patterns) {
        const uniqueNames = new Set();
        const deduplicated = [];
        const sortedPatterns = [...patterns].sort((a, b) => {
            const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
            return severityOrder[a.severity] - severityOrder[b.severity];
        });
        for (const pattern of sortedPatterns) {
            if (!uniqueNames.has(pattern.name)) {
                uniqueNames.add(pattern.name);
                deduplicated.push(pattern);
            }
        }
        return deduplicated;
    }
}
exports.CorrelationEngine = CorrelationEngine;
exports.correlationEngine = new CorrelationEngine();
exports.default = exports.correlationEngine;
//# sourceMappingURL=correlation_engine.js.map