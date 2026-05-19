"use strict";
/**
 * Risk Scoring Engine
 * Calculates threat scores based on behavioral analysis
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.riskEngine = exports.RiskEngine = void 0;
const threat_models_1 = require("./threat_models");
const fileOperationRules = [
    { factor: 'fileModificationCount', threshold: 50, score: 30, description: 'Mass file modifications detected' },
    { factor: 'fileModificationCount', threshold: 100, score: 40, description: 'Extremely high file modification count' },
    { factor: 'renamedFilesCount', threshold: 10, score: 25, description: 'Multiple file renames (possible encryption)' },
    { factor: 'suspiciousExtensionsCount', threshold: 5, score: 20, description: 'Suspicious executable files created' },
    { factor: 'fileDeleteCount', threshold: 20, score: 25, description: 'Mass file deletion detected' },
    { factor: 'fileCreateCount', threshold: 30, score: 15, description: 'High file creation activity' }
];
const registryOperationRules = [
    { factor: 'persistenceKeysModified', threshold: 1, score: 20, description: 'Registry persistence mechanism detected' },
    { factor: 'persistenceKeysModified', threshold: 3, score: 30, description: 'Multiple persistence mechanisms' },
    { factor: 'registryModificationCount', threshold: 10, score: 15, description: 'Excessive registry modifications' },
    { factor: 'registryModificationCount', threshold: 20, score: 25, description: 'Mass registry modifications' }
];
const networkOperationRules = [
    { factor: 'outboundConnectionCount', threshold: 5, score: 20, description: 'Multiple outbound connections' },
    { factor: 'outboundConnectionCount', threshold: 10, score: 30, description: 'Excessive outbound connections' },
    { factor: 'suspiciousPortsUsed', threshold: 1, score: 25, description: 'Connection to suspicious port' },
    { factor: 'suspiciousPortsUsed', threshold: 3, score: 35, description: 'Multiple suspicious port connections' },
    { factor: 'uniqueDestinationIPs', threshold: 5, score: 15, description: 'Multiple unique destinations' },
    { factor: 'uniqueDestinationIPs', threshold: 10, score: 25, description: 'Mass network targets' }
];
const processOperationRules = [
    { factor: 'rapidProcessSpawnRate', threshold: 5, score: 15, description: 'Rapid process spawning detected' },
    { factor: 'rapidProcessSpawnRate', threshold: 10, score: 25, description: 'Extremely rapid process spawning' },
    { factor: 'spawnedProcesses', threshold: 20, score: 15, description: 'Many spawned processes' },
    { factor: 'powershellExecutions', threshold: 5, score: 25, description: 'Excessive PowerShell executions' },
    { factor: 'powershellExecutions', threshold: 10, score: 35, description: 'Mass PowerShell executions' },
    { factor: 'cmdExecutions', threshold: 10, score: 20, description: 'Excessive CMD executions' },
    { factor: 'wmiExecutions', threshold: 1, score: 20, description: 'WMI execution detected' },
    { factor: 'privilegeEscalationAttempts', threshold: 1, score: 30, description: 'Privilege escalation attempt detected' }
];
const persistenceRules = [
    { factor: 'persistenceKeysModified', threshold: 1, score: 20, description: 'Persistence mechanism established' },
    { factor: 'persistenceKeysModified', threshold: 3, score: 30, description: 'Multiple persistence mechanisms' }
];
const behaviorSeverityScores = {
    critical: 30,
    high: 20,
    medium: 10,
    low: 5,
    info: 0
};
class RiskEngine {
    calculateRiskScore(features, findings) {
        const contributingFactors = [];
        const breakdown = {
            fileOperations: 0,
            registryOperations: 0,
            networkOperations: 0,
            processOperations: 0,
            persistenceAttempts: 0
        };
        const fileOpsScore = this.applyRules(features, fileOperationRules, contributingFactors);
        breakdown.fileOperations = fileOpsScore;
        const registryOpsScore = this.applyRules(features, registryOperationRules, contributingFactors);
        breakdown.registryOperations = registryOpsScore;
        const networkOpsScore = this.applyRules(features, networkOperationRules, contributingFactors);
        breakdown.networkOperations = networkOpsScore;
        const processOpsScore = this.applyRules(features, processOperationRules, contributingFactors);
        breakdown.processOperations = processOpsScore;
        const persistenceScore = this.applyRules(features, persistenceRules, contributingFactors);
        breakdown.persistenceAttempts = persistenceScore;
        let behaviorScore = 0;
        for (const finding of findings) {
            const severityScore = behaviorSeverityScores[finding.severity] || 0;
            const confidenceMultiplier = finding.confidence / 100;
            behaviorScore += Math.round(severityScore * confidenceMultiplier);
        }
        behaviorScore = Math.min(behaviorScore, 50);
        const suspiciousBehaviorScore = features.suspiciousBehaviorCount * 5;
        const totalScore = Math.min(100, fileOpsScore +
            registryOpsScore +
            networkOpsScore +
            processOpsScore +
            persistenceScore +
            behaviorScore +
            suspiciousBehaviorScore);
        const confidenceScore = this.calculateConfidenceScore(features, findings);
        const severity = this.mapScoreToSeverity(totalScore);
        return {
            totalScore,
            severity,
            confidenceScore,
            contributingFactors,
            breakdown
        };
    }
    applyRules(features, rules, factors) {
        let score = 0;
        for (const rule of rules) {
            const value = features[rule.factor] || 0;
            if (value >= rule.threshold) {
                const ruleScore = rule.score;
                score += ruleScore;
                factors.push({
                    factor: rule.factor,
                    score: ruleScore,
                    description: rule.description
                });
            }
        }
        return score;
    }
    calculateConfidenceScore(features, findings) {
        let confidence = 50;
        if (findings.length > 0) {
            const avgConfidence = findings.reduce((sum, f) => sum + f.confidence, 0) / findings.length;
            confidence += avgConfidence * 0.3;
        }
        if (features.totalEvents > 100) {
            confidence += 10;
        }
        else if (features.totalEvents > 50) {
            confidence += 5;
        }
        if (features.suspiciousBehaviorCount > 5) {
            confidence += 10;
        }
        return Math.min(100, Math.max(0, Math.round(confidence)));
    }
    mapScoreToSeverity(score) {
        if (score >= 81)
            return threat_models_1.RiskSeverity.CRITICAL;
        if (score >= 51)
            return threat_models_1.RiskSeverity.HIGH;
        if (score >= 21)
            return threat_models_1.RiskSeverity.MEDIUM;
        if (score >= 1)
            return threat_models_1.RiskSeverity.LOW;
        return threat_models_1.RiskSeverity.INFO;
    }
}
exports.RiskEngine = RiskEngine;
exports.riskEngine = new RiskEngine();
exports.default = exports.riskEngine;
//# sourceMappingURL=risk_engine.js.map