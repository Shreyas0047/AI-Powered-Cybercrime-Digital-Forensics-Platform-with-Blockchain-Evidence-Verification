"use strict";
/**
 * Threat Explanation Engine
 * Generates human-readable forensic explanations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.threatExplanationEngine = exports.ThreatExplanationEngine = void 0;
class ThreatExplanationEngine {
    generateExplanation(sessionId, classification, confidence, features, behaviors, riskScore, attackChain, anomalies = []) {
        const classificationJustification = this.generateClassificationJustification(classification, confidence, features, behaviors);
        const confidenceRationale = this.generateConfidenceRationale(confidence, features, behaviors);
        const evidenceReasoning = this.generateEvidenceReasoning(features, behaviors, anomalies, attackChain);
        return {
            session_id: sessionId,
            analyst_summary: this.generateAnalystSummary(classification, features, riskScore),
            executive_summary: this.generateExecutiveSummary(classification, confidence, riskScore),
            technical_explanation: this.generateTechnicalExplanation(classification, features, behaviors, attackChain),
            evidence_reasoning: evidenceReasoning,
            classification_justification: classificationJustification,
            confidence_rationale: confidenceRationale
        };
    }
    generateClassificationJustification(classification, confidence, features, behaviors) {
        const behaviorDescriptions = {
            'ransomware-like': `classified as ransomware-like because the system detected rapid mass file modifications (${features.fileModificationCount} operations), file extension renaming patterns (${features.renamedFilesCount} files), and high-frequency filesystem activity characteristic of encryption behavior.`,
            'spyware-like': `classified as spyware-like because the system observed data collection patterns including process enumeration (${features.totalProcesses} processes), suspicious PowerShell usage (${features.powershellExecutions} executions), and network beaconing to multiple destinations (${features.outboundConnectionCount} connections).`,
            'trojan-like': `classified as trojan-like because the system detected multi-stage execution patterns with child process spawning (${features.spawnedProcesses} processes), registry persistence attempts (${features.persistenceKeysModified} keys), and suspicious file operations.`,
            'worm-like': `classified as worm-like because the system identified lateral movement simulation with high network activity (${features.networkConnectionCount} connections), multiple target destinations (${features.uniqueDestinationIPs.length} unique IPs), and rapid process spawning (${features.spawnedProcesses} processes).`,
            'credential-stealer-like': `classified as credential-stealer-like because the system detected privilege escalation attempts (${features.privilegeEscalationAttempts}), credential harvesting patterns, and registry modifications targeting authentication stores.`,
            'benign': `classified as benign because the system did not detect sufficient behavioral indicators to characterize the activity as malicious. The activity level was low (${features.totalEvents} events) with minimal suspicious behaviors.`,
            'unknown': `classified as unknown because the system did not detect enough behavioral indicators to confidently classify the threat type. The activity may be atypical or insufficient for pattern matching.`
        };
        return `This execution was ${behaviorDescriptions[classification]}`;
    }
    generateConfidenceRationale(confidence, features, behaviors) {
        let rationale = `The ${confidence}% confidence score is based on: `;
        const factors = [];
        if (behaviors.length >= 3) {
            factors.push(`${behaviors.length} behavioral detections`);
        }
        if (features.totalEvents > 50) {
            factors.push(`comprehensive telemetry (${features.totalEvents} events)`);
        }
        if (features.suspiciousBehaviorCount > 3) {
            factors.push(`${features.suspiciousBehaviorCount} suspicious behavior indicators`);
        }
        if (features.fileModificationCount > 20 || features.networkConnectionCount > 5) {
            factors.push('significant activity metrics');
        }
        if (features.persistenceKeysModified > 0) {
            factors.push('persistence mechanism detected');
        }
        if (factors.length === 0) {
            factors.push('limited behavioral indicators available');
        }
        rationale += factors.join(', ') + '.';
        if (confidence < 50) {
            rationale += ' The classification has lower confidence due to limited event data or ambiguous behavioral patterns.';
        }
        else if (confidence > 80) {
            rationale += ' The high confidence reflects strong behavioral correlation and multiple matching detection patterns.';
        }
        return rationale;
    }
    generateEvidenceReasoning(features, behaviors, anomalies, attackChain) {
        const reasoning = [];
        if (features.fileModificationCount > 20) {
            reasoning.push({
                finding: 'High volume of file modifications',
                evidence: `${features.fileModificationCount} file modifications detected`,
                conclusion: 'Indicates potential file encryption or data manipulation activity'
            });
        }
        if (features.renamedFilesCount > 3) {
            reasoning.push({
                finding: 'File extension changes detected',
                evidence: `${features.renamedFilesCount} files renamed`,
                conclusion: 'Suggests encryption simulation or file masquerading'
            });
        }
        if (features.persistenceKeysModified > 0) {
            reasoning.push({
                finding: 'Registry persistence modifications',
                evidence: `${features.persistenceKeysModified} registry keys modified for persistence`,
                conclusion: 'Attemp to establish persistent access on the system'
            });
        }
        if (features.outboundConnectionCount > 3) {
            reasoning.push({
                finding: 'Outbound network connections',
                evidence: `${features.outboundConnectionCount} outbound connections to ${features.uniqueDestinationIPs.length} unique destinations`,
                conclusion: 'Suggests potential command & control communication or data exfiltration'
            });
        }
        if (features.privilegeEscalationAttempts > 0) {
            reasoning.push({
                finding: 'Privilege escalation indicators',
                evidence: `${features.privilegeEscalationAttempts} privilege escalation attempt(s)`,
                conclusion: 'Indicates attempt to gain elevated system access'
            });
        }
        if (anomalies.length > 0) {
            reasoning.push({
                finding: 'Behavioral anomalies detected',
                evidence: `${anomalies.length} anomalies identified in execution patterns`,
                conclusion: 'Execution deviates from normal system behavior patterns'
            });
        }
        if (attackChain && attackChain.stages.length > 0) {
            reasoning.push({
                finding: 'Multi-stage attack pattern',
                evidence: `Attack chain reconstructed with ${attackChain.stages.length} stages`,
                conclusion: 'Indicates coordinated multi-phase attack execution'
            });
        }
        return reasoning;
    }
    generateAnalystSummary(classification, features, riskScore) {
        const threatNames = {
            'ransomware-like': 'Ransomware-like',
            'spyware-like': 'Spyware-like',
            'trojan-like': 'Trojan-like',
            'worm-like': 'Worm-like',
            'credential-stealer-like': 'Credential Stealer-like',
            'benign': 'Benign',
            'unknown': 'Unknown'
        };
        return `Analysis of this forensic session identified ${threatNames[classification]} threat behavior. ` +
            `The system processed ${features.totalEvents} events including ${features.fileModificationCount} file operations, ` +
            `${features.networkConnectionCount} network connections, and ${features.registryModificationCount} registry modifications. ` +
            `Risk assessment: ${riskScore.severity.toUpperCase()} (${riskScore.totalScore}/100)`;
    }
    generateExecutiveSummary(classification, confidence, riskScore) {
        const summary = {
            'ransomware-like': 'This session exhibited behavior consistent with ransomware activity, including mass file modifications and encryption patterns.',
            'spyware-like': 'This session showed characteristics of spyware/stealer behavior with data collection and exfiltration patterns.',
            'trojan-like': 'This session displayed trojan-like behavior with multi-stage execution and persistence mechanisms.',
            'worm-like': 'This session demonstrated worm-like propagation patterns with network scanning and lateral movement.',
            'credential-stealer-like': 'This session showed credential harvesting behavior with privilege escalation and registry access.',
            'benign': 'This session did not exhibit significant malicious behavior and appears to be normal system activity.',
            'unknown': 'This session did not produce enough behavioral indicators to determine the threat type with confidence.'
        };
        return `${summary[classification]} ` +
            `Overall confidence in classification: ${confidence}%. ` +
            `Risk level: ${riskScore.severity.toUpperCase()}. ` +
            `Immediate review recommended for high-severity detections.`;
    }
    generateTechnicalExplanation(classification, features, behaviors, attackChain) {
        let explanation = `Technical analysis reveals ${classification} characteristics. `;
        explanation += `Process analysis: ${features.totalProcesses} total processes, ${features.spawnedProcesses} spawned. `;
        explanation += `File activity: ${features.fileCreateCount} created, ${features.fileModificationCount} modified, ${features.fileDeleteCount} deleted. `;
        explanation += `Network: ${features.outboundConnectionCount} outbound connections to ${features.uniqueDestinationIPs.length} destinations. `;
        explanation += `Registry: ${features.registryModificationCount} modifications, ${features.persistenceKeysModified} persistence attempts. `;
        if (behaviors.length > 0) {
            explanation += `Behavioral detections (${behaviors.length}): `;
            explanation += behaviors.slice(0, 3).map(b => b.behaviorType.replace(/_/g, ' ')).join(', ');
            explanation += '.';
        }
        if (attackChain && attackChain.stages.length > 0) {
            explanation += ` Attack chain reconstructed with ${attackChain.stages.length} stages: `;
            explanation += attackChain.stages.map(s => s.stage_name).join(' -> ');
            explanation += '.';
        }
        return explanation;
    }
}
exports.ThreatExplanationEngine = ThreatExplanationEngine;
exports.threatExplanationEngine = new ThreatExplanationEngine();
exports.default = exports.threatExplanationEngine;
//# sourceMappingURL=threat_explanation.js.map