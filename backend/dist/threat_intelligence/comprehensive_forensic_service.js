"use strict";
/**
 * Comprehensive Forensic Analysis Service
 * Orchestrates all threat intelligence components
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.comprehensiveForensicService = exports.ComprehensiveForensicService = void 0;
const logger_1 = __importDefault(require("../config/logger"));
const uuid_1 = require("uuid");
const event_normalizer_1 = require("./event_normalizer");
const feature_extractor_1 = require("./feature_extractor");
const behavior_analyzer_1 = require("./behavior_analyzer");
const risk_engine_1 = require("./risk_engine");
const correlation_engine_v2_1 = require("./correlation_engine_v2");
const threat_classifier_1 = require("./threat_classifier");
const behavioral_heuristics_1 = require("./behavioral_heuristics");
const anomaly_detector_1 = require("./anomaly_detector");
const threat_profiler_1 = require("./threat_profiler");
const threat_explanation_1 = require("./threat_explanation");
class ComprehensiveForensicService {
    async analyzeSession(input) {
        const { sessionId, events } = input;
        logger_1.default.info(`[ComprehensiveForensic] Starting full analysis for session ${sessionId}`);
        const normalizedEvents = event_normalizer_1.eventNormalizer.normalize(events, sessionId);
        const features = feature_extractor_1.featureExtractor.extractFeatures(normalizedEvents);
        const behaviors = behavior_analyzer_1.behaviorAnalyzer.analyzeBehaviors(normalizedEvents, features);
        const riskScore = risk_engine_1.riskEngine.calculateRiskScore(features, behaviors);
        logger_1.default.info(`[ComprehensiveForensic] Base analysis complete - ${behaviors.length} behaviors detected`);
        const correlation = correlation_engine_v2_1.forensicCorrelationEngine.correlateEvents(normalizedEvents, features, sessionId);
        logger_1.default.info(`[ComprehensiveForensic] Correlation complete - ${correlation.attack_chains.length} chains, ${correlation.incidents.length} incidents`);
        const attackPatterns = [];
        const heuristics = behavioral_heuristics_1.behavioralHeuristicsEngine.analyzeHeuristics(normalizedEvents, features);
        logger_1.default.info(`[ComprehensiveForensic] Heuristics complete - ${heuristics.length} triggers`);
        const anomalyResult = anomaly_detector_1.anomalyDetectionLayer.detectAnomalies(normalizedEvents, features);
        logger_1.default.info(`[ComprehensiveForensic] Anomaly detection complete - ${anomalyResult.anomalies.length} anomalies`);
        const classification = threat_classifier_1.threatClassifier.classifyThreat(features, behaviors, attackPatterns, normalizedEvents);
        const profileMatch = threat_profiler_1.threatProfiler.matchProfile(features, behaviors);
        logger_1.default.info(`[ComprehensiveForensic] Classification: ${classification.predicted_threat} (${classification.confidence}%)`);
        const executionChain = threat_classifier_1.threatClassifier.buildExecutionChain(normalizedEvents);
        const mitreTactics = threat_classifier_1.threatClassifier.extractMitreTactics(classification.mitre_techniques);
        const explanation = threat_explanation_1.threatExplanationEngine.generateExplanation(sessionId, classification.predicted_threat, classification.confidence, features, behaviors, riskScore, correlation.attack_chains[0], anomalyResult.anomalies);
        const timeline = this.buildTimeline(normalizedEvents);
        const timelineSummary = this.generateTimelineSummary(timeline);
        const sessionAnalytics = this.generateSessionAnalytics(sessionId, features, normalizedEvents, correlation.process_tree);
        const executiveSummary = this.generateExecutiveSummary(classification.predicted_threat, classification.confidence, riskScore, behaviors);
        const riskAnalysis = this.generateRiskAnalysis(riskScore, features, anomalyResult);
        const recommendations = this.generateRecommendations(classification.predicted_threat, behaviors, correlation.attack_chains, anomalyResult.anomalies);
        const report = {
            report_id: `RPT-${sessionId}-${Date.now()}`,
            session_id: sessionId,
            generated_at: new Date(),
            version: '2.0.0',
            executive_summary: executiveSummary,
            threat_classification: classification,
            threat_profile: profileMatch,
            risk_analysis: riskAnalysis,
            attack_chain: correlation.attack_chains[0],
            correlated_incidents: correlation.incidents,
            evidence_graph: correlation.evidence_graph,
            detected_behaviors: behaviors,
            behavioral_heuristics_triggered: heuristics,
            anomalies_detected: anomalyResult.anomalies,
            forensic_timeline: timeline,
            timeline_summary: timelineSummary,
            session_analytics: sessionAnalytics,
            extracted_features: features,
            mitre_tactics: mitreTactics,
            mitre_techniques: [...new Set(classification.mitre_techniques)],
            evidence_relationships: correlation.relationships,
            suspicious_indicators: this.extractIndicators(features, behaviors, anomalyResult.anomalies),
            recommendations,
            explanation
        };
        logger_1.default.info(`[ComprehensiveForensic] Analysis complete for session ${sessionId}`);
        return report;
    }
    buildTimeline(normalizedEvents) {
        const sortedEvents = [...normalizedEvents].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        const stages = [
            { name: 'Initial Access & Execution', types: ['process_start'] },
            { name: 'File Operations', types: ['file_create', 'file_modify', 'file_delete', 'file_rename'] },
            { name: 'Registry Activity', types: ['registry_create', 'registry_modify'] },
            { name: 'Network Activity', types: ['network_connect', 'network_data_sent'] },
            { name: 'Behavioral Alerts', types: ['mass_file_modification', 'persistence_attempt'] }
        ];
        const groups = [];
        for (const stage of stages) {
            const stageEvents = sortedEvents.filter(e => stage.types.includes(e.normalizedType));
            if (stageEvents.length > 0) {
                groups.push({
                    group_id: (0, uuid_1.v4)(),
                    stage: stage.name,
                    start_time: new Date(stageEvents[0].timestamp),
                    end_time: new Date(stageEvents[stageEvents.length - 1].timestamp),
                    event_count: stageEvents.length,
                    events: stageEvents.map(e => ({
                        timestamp: new Date(e.timestamp),
                        eventType: e.normalizedType,
                        description: this.formatEventDescription(e),
                        severity: e.behavioralTags.includes('derived_behavior') ? 'high' : 'low',
                        process: e.metadata.processName,
                        details: e.metadata
                    })),
                    severity: stageEvents.some(e => e.behavioralTags.includes('derived_behavior')) ? 'high' : 'medium'
                });
            }
        }
        return groups;
    }
    formatEventDescription(event) {
        const path = event.metadata.path || event.metadata.target || '';
        const dest = event.metadata.destination;
        const port = event.metadata.port;
        switch (event.normalizedType) {
            case 'process_start':
                return `Process started: ${event.metadata.processName || 'unknown'}`;
            case 'file_create':
                return `File created: ${path.substring(0, 50)}`;
            case 'file_modify':
                return `File modified: ${path.substring(0, 50)}`;
            case 'registry_modify':
                return `Registry modified: ${path.substring(0, 40)}`;
            case 'network_connect':
                return `Network: ${dest}:${port}`;
            default:
                return `Event: ${event.normalizedType}`;
        }
    }
    generateTimelineSummary(timeline) {
        if (timeline.length === 0) {
            return {
                total_duration_ms: 0,
                stage_summaries: [],
                peak_activity_time: new Date(),
                peak_event_count: 0
            };
        }
        const totalDuration = timeline.reduce((sum, g) => sum + (g.end_time.getTime() - g.start_time.getTime()), 0);
        let peakEventCount = 0;
        let peakActivityTime = new Date();
        const stageSummaries = timeline.map(g => {
            if (g.event_count > peakEventCount) {
                peakEventCount = g.event_count;
                peakActivityTime = g.start_time;
            }
            return {
                stage: g.stage,
                event_count: g.event_count,
                duration_ms: g.end_time.getTime() - g.start_time.getTime(),
                severity: g.severity
            };
        });
        return {
            total_duration_ms: totalDuration,
            stage_summaries: stageSummaries,
            peak_activity_time: peakActivityTime,
            peak_event_count: peakEventCount
        };
    }
    generateSessionAnalytics(sessionId, features, events, processTree) {
        const processCounts = new Map();
        for (const event of events) {
            const name = event.metadata.processName || 'unknown';
            processCounts.set(name, (processCounts.get(name) || 0) + 1);
        }
        let mostActiveProcess = 'unknown';
        let maxCount = 0;
        for (const [name, count] of processCounts.entries()) {
            if (count > maxCount) {
                maxCount = count;
                mostActiveProcess = name;
            }
        }
        const directoryCounts = new Map();
        for (const event of events) {
            const path = event.metadata.path || event.metadata.target || '';
            if (path) {
                const dir = path.split(/[/\\]/).slice(0, 3).join('\\');
                directoryCounts.set(dir, (directoryCounts.get(dir) || 0) + 1);
            }
        }
        let mostModifiedDir = 'unknown';
        maxCount = 0;
        for (const [dir, count] of directoryCounts.entries()) {
            if (count > maxCount) {
                maxCount = count;
                mostModifiedDir = dir;
            }
        }
        const startTime = events.length > 0 ? new Date(events[0].timestamp).getTime() : 0;
        const endTime = events.length > 0 ? new Date(events[events.length - 1].timestamp).getTime() : 0;
        const duration = endTime - startTime;
        const minutes = duration / 60000 || 1;
        const intensityScore = Math.min(100, (features.totalEvents / minutes) * 2);
        return {
            session_id: sessionId,
            total_events: features.totalEvents,
            suspicious_event_count: features.suspiciousBehaviorCount,
            most_active_process: mostActiveProcess,
            most_modified_directory: mostModifiedDir,
            persistence_attempts: features.persistenceKeysModified,
            outbound_connections: features.outboundConnectionCount,
            peak_activity_period: `${Math.floor(minutes)}m window`,
            attack_intensity_score: Math.round(intensityScore),
            process_tree: processTree
        };
    }
    generateExecutiveSummary(classification, confidence, riskScore, behaviors) {
        const keyFindings = behaviors.slice(0, 3).map(b => b.description);
        return {
            overall_risk_level: riskScore.severity.toUpperCase(),
            threat_type: classification.predicted_threat,
            key_findings: keyFindings,
            recommendation: this.getRecommendation(classification.predicted_threat, riskScore.severity),
            confidence: classification.confidence
        };
    }
    generateRiskAnalysis(riskScore, features, anomalyResult) {
        const categoryScores = {
            file_operations: Math.min(100, features.fileModificationCount * 2),
            network_activity: Math.min(100, features.networkConnectionCount * 3),
            registry_operations: Math.min(100, features.registryModificationCount * 5),
            process_activity: Math.min(100, features.spawnedProcesses * 3),
            persistence: Math.min(100, features.persistenceKeysModified * 20)
        };
        const riskFactors = riskScore.contributingFactors?.slice(0, 5) || [];
        return {
            overall_risk_score: riskScore.totalScore,
            risk_level: riskScore.severity,
            confidence: riskScore.confidenceScore,
            risk_factors: riskFactors,
            category_scores: categoryScores
        };
    }
    generateRecommendations(classification, behaviors, chains, anomalies) {
        const recommendations = [];
        if (classification.predicted_threat === 'ransomware-like') {
            recommendations.push('Isolate affected system immediately to prevent further encryption');
            recommendations.push('Check for backup availability and integrity');
            recommendations.push('Document ransom note content for analysis');
            recommendations.push('Review file modification timeline to determine scope');
        }
        if (classification.predicted_threat === 'spyware-like') {
            recommendations.push('Review browser credential storage locations');
            recommendations.push('Check for unauthorized data exfiltration');
            recommendations.push('Monitor for continued beaconing activity');
            recommendations.push('Scan for keylogger or screen capture tools');
        }
        if (classification.predicted_threat === 'trojan-like') {
            recommendations.push('Identify and disable persistence mechanisms');
            recommendations.push('Review newly created or modified services');
            recommendations.push('Check for backdoor access points');
            recommendations.push('Analyze dropped payloads if available');
        }
        if (behaviors.some(b => b.behaviorType.includes('persistence'))) {
            recommendations.push('Review and clean registry autorun entries');
            recommendations.push('Check scheduled tasks for unauthorized entries');
        }
        if (anomalies.length > 3) {
            recommendations.push('Investigate behavioral anomalies for additional threats');
            recommendations.push('Compare against known threat signatures');
        }
        if (recommendations.length === 0) {
            recommendations.push('Continue monitoring for anomalous behavior');
            recommendations.push('Document session for future reference');
        }
        return recommendations;
    }
    getRecommendation(classification, severity) {
        if (severity === 'critical' || severity === 'high') {
            return 'Immediate investigation and containment recommended';
        }
        return 'Monitor and conduct periodic review';
    }
    extractIndicators(features, behaviors, anomalies) {
        const indicators = [];
        if (features.fileModificationCount > 20) {
            indicators.push(`Mass file modification (${features.fileModificationCount})`);
        }
        if (features.renamedFilesCount > 3) {
            indicators.push(`File extension changes (${features.renamedFilesCount})`);
        }
        if (features.persistenceKeysModified > 0) {
            indicators.push(`Registry persistence (${features.persistenceKeysModified})`);
        }
        if (features.outboundConnectionCount > 3) {
            indicators.push(`Network beaconing (${features.outboundConnectionCount})`);
        }
        if (features.powershellExecutions > 2) {
            indicators.push(`PowerShell activity (${features.powershellExecutions})`);
        }
        for (const behavior of behaviors.slice(0, 3)) {
            indicators.push(behavior.behaviorType.replace(/_/g, ' '));
        }
        return [...new Set(indicators)].slice(0, 15);
    }
}
exports.ComprehensiveForensicService = ComprehensiveForensicService;
exports.comprehensiveForensicService = new ComprehensiveForensicService();
exports.default = exports.comprehensiveForensicService;
//# sourceMappingURL=comprehensive_forensic_service.js.map