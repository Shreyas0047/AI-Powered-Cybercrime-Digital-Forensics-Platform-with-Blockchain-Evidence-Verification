"use strict";
/**
 * Intelligence Pipeline
 * Unified analysis pipeline for threat intelligence
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.intelligencePipeline = exports.IntelligencePipeline = void 0;
const threat_models_1 = require("./threat_models");
const event_normalizer_1 = require("./event_normalizer");
const feature_extractor_1 = require("./feature_extractor");
const behavior_analyzer_1 = require("./behavior_analyzer");
const risk_engine_1 = require("./risk_engine");
const correlation_engine_1 = require("./correlation_engine");
const threat_classifier_1 = require("./threat_classifier");
class IntelligencePipeline {
    async analyze(input) {
        try {
            if (!input.events || input.events.length === 0) {
                return {
                    success: false,
                    error: 'No events provided for analysis'
                };
            }
            console.log(`[IntelligencePipeline] Analyzing ${input.events.length} events for session ${input.sessionId}`);
            const normalizedEvents = this.normalizeEvents(input);
            console.log(`[IntelligencePipeline] Normalized to ${normalizedEvents.length} behavioral events`);
            const features = this.extractFeatures(normalizedEvents);
            console.log(`[IntelligencePipeline] Extracted ${Object.keys(features).length} features`);
            const behaviors = this.analyzeBehaviors(normalizedEvents, features);
            console.log(`[IntelligencePipeline] Detected ${behaviors.length} behavioral patterns`);
            const riskScore = this.calculateRiskScore(features, behaviors);
            console.log(`[IntelligencePipeline] Risk score: ${riskScore.totalScore} (${riskScore.severity})`);
            const attackPatterns = this.correlateEvents(normalizedEvents);
            console.log(`[IntelligencePipeline] Identified ${attackPatterns.length} attack patterns`);
            const classification = threat_classifier_1.threatClassifier.classifyThreat(features, behaviors, attackPatterns, normalizedEvents);
            console.log(`[IntelligencePipeline] Classification: ${classification.predicted_threat} (${classification.confidence}%)`);
            const executionChain = threat_classifier_1.threatClassifier.buildExecutionChain(normalizedEvents);
            const mitreTactics = threat_classifier_1.threatClassifier.extractMitreTactics(classification.mitre_techniques);
            const ruleMatches = this.evaluateAllRules(features);
            const report = this.generateEnhancedReport(input.sessionId, normalizedEvents, features, behaviors, riskScore, attackPatterns, classification, executionChain, mitreTactics, ruleMatches);
            console.log(`[IntelligencePipeline] Analysis complete for session ${input.sessionId}`);
            return {
                success: true,
                report
            };
        }
        catch (error) {
            console.error(`[IntelligencePipeline] Analysis failed: ${error}`);
            return {
                success: false,
                error: `Analysis failed: ${error}`
            };
        }
    }
    normalizeEvents(input) {
        return event_normalizer_1.eventNormalizer.normalize(input.events, input.sessionId);
    }
    extractFeatures(events) {
        return feature_extractor_1.featureExtractor.extractFeatures(events);
    }
    analyzeBehaviors(events, features) {
        return behavior_analyzer_1.behaviorAnalyzer.analyzeBehaviors(events, features);
    }
    calculateRiskScore(features, findings) {
        return risk_engine_1.riskEngine.calculateRiskScore(features, findings);
    }
    correlateEvents(events) {
        return correlation_engine_1.correlationEngine.correlateEvents(events);
    }
    generateReport(sessionId, events, features, behaviors, riskScore, attackPatterns) {
        const sortedEvents = [...events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        const startTime = sortedEvents.length > 0 ? new Date(sortedEvents[0].timestamp) : new Date();
        const endTime = sortedEvents.length > 0 ? new Date(sortedEvents[sortedEvents.length - 1].timestamp) : new Date();
        const sessionSummary = {
            totalEvents: features.totalEvents,
            duration: features.executionDuration,
            processCount: features.totalProcesses,
            networkConnections: features.networkConnectionCount,
            fileOperations: features.fileModificationCount + features.fileCreateCount + features.fileDeleteCount,
            registryOperations: features.registryModificationCount,
            primaryProcess: this.extractPrimaryProcess(events),
            startTime,
            endTime
        };
        const suspiciousIndicators = this.extractSuspiciousIndicators(features, behaviors);
        const recommendedActions = this.consolidateRecommendations(behaviors, attackPatterns);
        const forensicTimeline = this.buildForensicTimeline(events, behaviors, attackPatterns);
        const evidenceReferences = this.extractEvidenceReferences(events);
        return {
            sessionId,
            analysisTimestamp: new Date(),
            sessionSummary,
            extractedFeatures: features,
            detectedBehaviors: behaviors,
            suspiciousIndicators,
            riskScore,
            correlatedAttackPatterns: attackPatterns,
            recommendedActions,
            forensicTimeline,
            evidenceReferences
        };
    }
    extractPrimaryProcess(events) {
        const firstProcess = events.find(e => e.normalizedType === threat_models_1.NormalizedEventType.PROCESS_START &&
            e.metadata.processName);
        return firstProcess?.metadata.processName;
    }
    extractSuspiciousIndicators(features, behaviors) {
        const indicators = [];
        if (features.fileModificationCount > 50) {
            indicators.push(`Mass file modification: ${features.fileModificationCount} files`);
        }
        if (features.renamedFilesCount > 5) {
            indicators.push(`File renaming detected: ${features.renamedFilesCount} files renamed`);
        }
        if (features.persistenceKeysModified > 0) {
            indicators.push(`Registry persistence: ${features.persistenceKeysModified} keys modified`);
        }
        if (features.outboundConnectionCount > 5) {
            indicators.push(`Excessive outbound connections: ${features.outboundConnectionCount} connections`);
        }
        if (features.suspiciousPortsUsed.length > 0) {
            indicators.push(`Suspicious ports used: ${features.suspiciousPortsUsed.join(', ')}`);
        }
        if (features.powershellExecutions > 3) {
            indicators.push(`PowerShell executions: ${features.powershellExecutions} invocations`);
        }
        if (features.privilegeEscalationAttempts > 0) {
            indicators.push(`Privilege escalation attempts: ${features.privilegeEscalationAttempts}`);
        }
        if (features.uniqueDestinationIPs.length > 3) {
            indicators.push(`Multiple external targets: ${features.uniqueDestinationIPs.length} unique IPs`);
        }
        for (const behavior of behaviors) {
            indicators.push(`Behavioral detection: ${behavior.behaviorType.replace(/_/g, ' ')}`);
        }
        return [...new Set(indicators)];
    }
    consolidateRecommendations(behaviors, patterns) {
        const recommendations = [];
        const allRecommendations = [
            ...behaviors.flatMap(b => b.recommendedActions),
            ...patterns.flatMap(p => [
                `Investigate ${p.name.toLowerCase()} pattern`,
                `Review timeline: ${p.timeline.length} correlated events`
            ])
        ];
        const uniqueRecommendations = [...new Set(allRecommendations)].slice(0, 10);
        return uniqueRecommendations;
    }
    buildForensicTimeline(events, behaviors, patterns) {
        const timeline = [];
        const sortedEvents = [...events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        for (const event of sortedEvents) {
            timeline.push({
                timestamp: new Date(event.timestamp),
                eventType: event.normalizedType,
                description: this.formatEventDescription(event),
                severity: this.getEventSeverity(event),
                process: event.metadata.processName,
                details: event.metadata
            });
        }
        return timeline.slice(0, 500);
    }
    formatEventDescription(event) {
        const processName = event.metadata.processName || 'unknown';
        const path = event.metadata.path || event.metadata.target || '';
        const destination = event.metadata.destination;
        const port = event.metadata.port;
        switch (event.normalizedType) {
            case threat_models_1.NormalizedEventType.PROCESS_START:
                return `Process started: ${processName}`;
            case threat_models_1.NormalizedEventType.FILE_CREATE:
                return `File created: ${path}`;
            case threat_models_1.NormalizedEventType.FILE_MODIFY:
                return `File modified: ${path}`;
            case threat_models_1.NormalizedEventType.FILE_DELETE:
                return `File deleted: ${path}`;
            case threat_models_1.NormalizedEventType.FILE_RENAME:
                return `File renamed: ${path}`;
            case threat_models_1.NormalizedEventType.REGISTRY_CREATE:
                return `Registry created: ${path}`;
            case threat_models_1.NormalizedEventType.REGISTRY_MODIFY:
                return `Registry modified: ${path}`;
            case threat_models_1.NormalizedEventType.NETWORK_CONNECT:
                return `Network connect: ${destination}:${port}`;
            case threat_models_1.NormalizedEventType.NETWORK_LISTEN:
                return `Network listen: ${port}`;
            case threat_models_1.NormalizedEventType.NETWORK_DATA_SENT:
                return `Data sent: ${destination}`;
            case threat_models_1.NormalizedEventType.MASS_FILE_MODIFICATION:
                return 'Mass file modification detected';
            case threat_models_1.NormalizedEventType.PERSISTENCE_ATTEMPT:
                return 'Persistence mechanism detected';
            case threat_models_1.NormalizedEventType.SUSPICIOUS_NETWORK_ACTIVITY:
                return 'Suspicious network activity detected';
            case threat_models_1.NormalizedEventType.RAPID_PROCESS_SPAWNING:
                return 'Rapid process spawning detected';
            default:
                return `Event: ${event.normalizedType}`;
        }
    }
    getEventSeverity(event) {
        if (event.behavioralTags.includes('derived_behavior')) {
            return 'high';
        }
        if (event.behavioralTags.includes('persistence_registry')) {
            return 'medium';
        }
        if (event.behavioralTags.includes('external_network')) {
            return 'medium';
        }
        return 'low';
    }
    extractEvidenceReferences(events) {
        const references = [];
        const paths = events
            .filter(e => e.metadata.path || e.metadata.target)
            .map(e => e.metadata.path || e.metadata.target)
            .filter(Boolean);
        const uniquePaths = [...new Set(paths)].slice(0, 20);
        return uniquePaths;
    }
    evaluateAllRules(features) {
        const { threatClassifier } = require('./threat_classifier');
        const rules = [
            'RULE_RANSOMWARE_FILE_BURST', 'RULE_RANSOMWARE_EXTENSION_CHANGE', 'RULE_RANSOMWARE_NOTE',
            'RULE_SPYWARE_PROCESS_ENUM', 'RULE_SPYWARE_BROWSER_DATA', 'RULE_SPYWARE_BEACONING',
            'RULE_TROJAN_DROPPER', 'RULE_TROJAN_PERSISTENCE', 'RULE_TROJAN_HIDDEN_FILES',
            'RULE_WORM_LATERAL_MOVEMENT', 'RULE_WORM_NETWORK_SCAN', 'RULE_WORM_PROPAGATION',
            'RULE_CREDENTIAL_ACCESS', 'RULE_CREDENTIAL_KEYLOG', 'RULE_PERSISTENCE_AUTORUN', 'RULE_NETWORK_BEACONING'
        ];
        return rules.map(ruleId => ({
            rule_id: ruleId,
            rule_name: ruleId.replace('RULE_', '').replace(/_/g, ' '),
            matched: false,
            confidence_boost: 0
        }));
    }
    generateEnhancedReport(sessionId, events, features, behaviors, riskScore, patterns, classification, executionChain, mitreTactics, ruleMatches) {
        const baseReport = this.generateReport(sessionId, events, features, behaviors, riskScore, patterns);
        const enhancedIndicators = events
            .filter(e => e.behavioralTags.includes('derived_behavior') || e.behavioralTags.includes('persistence_registry'))
            .slice(0, 10)
            .map((e, idx) => ({
            id: `indicator-${idx}`,
            type: e.normalizedType,
            description: this.formatEventDescription(e),
            severity: this.getEventSeverity(e),
            timestamp: new Date(e.timestamp),
            source_process: e.metadata.processName || 'unknown',
            mitre_techniques: []
        }));
        return {
            ...baseReport,
            threat_classification: classification,
            detection_rules_triggered: ruleMatches.filter(r => r.matched),
            mitre_tactics_detected: mitreTactics,
            execution_chain: executionChain,
            enhanced_indicators: enhancedIndicators
        };
    }
}
exports.IntelligencePipeline = IntelligencePipeline;
exports.intelligencePipeline = new IntelligencePipeline();
exports.default = exports.intelligencePipeline;
//# sourceMappingURL=intelligence_pipeline.js.map