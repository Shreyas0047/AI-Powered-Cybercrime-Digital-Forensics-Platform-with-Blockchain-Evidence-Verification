"use strict";
/**
 * Threat Classifier
 * Classifies threats based ONLY on behavioral analysis, not filenames
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.threatClassifier = exports.ThreatClassifier = void 0;
const threat_models_1 = require("./threat_models");
const DETECTION_RULES = [
    {
        id: 'RULE_RANSOMWARE_FILE_BURST',
        name: 'Ransomware File Activity Burst',
        category: 'ransomware-like',
        severity: threat_models_1.BehaviorSeverity.CRITICAL,
        description: 'Detects mass file modification/encryption behavior',
        mitre_techniques: ['T1486', 'T1489', 'T1490'],
        weight: 30,
        conditions: [
            { field: 'fileModificationCount', operator: 'gt', value: 20 },
            { field: 'renamedFilesCount', operator: 'gt', value: 5 }
        ]
    },
    {
        id: 'RULE_RANSOMWARE_EXTENSION_CHANGE',
        name: 'Ransomware Extension Modification',
        category: 'ransomware-like',
        severity: threat_models_1.BehaviorSeverity.CRITICAL,
        description: 'Detects rapid extension renaming (encryption simulation)',
        mitre_techniques: ['T1486'],
        weight: 25,
        conditions: [
            { field: 'renamedFilesCount', operator: 'gte', value: 3 }
        ]
    },
    {
        id: 'RULE_RANSOMWARE_NOTE',
        name: 'Ransom Note Creation',
        category: 'ransomware-like',
        severity: threat_models_1.BehaviorSeverity.CRITICAL,
        description: 'Detects ransom note file creation',
        mitre_techniques: ['T1486'],
        weight: 35,
        conditions: [
            { field: 'suspiciousBehaviorCount', operator: 'gte', value: 1 }
        ]
    },
    {
        id: 'RULE_SPYWARE_PROCESS_ENUM',
        name: 'Spyware Process Enumeration',
        category: 'spyware-like',
        severity: threat_models_1.BehaviorSeverity.HIGH,
        description: 'Detects process enumeration for information gathering',
        mitre_techniques: ['T1082', 'T1056'],
        weight: 20,
        conditions: [
            { field: 'totalProcesses', operator: 'gt', value: 10 },
            { field: 'powershellExecutions', operator: 'gte', value: 2 }
        ]
    },
    {
        id: 'RULE_SPYWARE_BROWSER_DATA',
        name: 'Spyware Browser Data Access',
        category: 'spyware-like',
        severity: threat_models_1.BehaviorSeverity.HIGH,
        description: 'Detects access to browser/credential locations',
        mitre_techniques: ['T1555', 'T1083'],
        weight: 25,
        conditions: [
            { field: 'fileCreateCount', operator: 'gte', value: 5 },
            { field: 'registryModificationCount', operator: 'gte', value: 3 }
        ]
    },
    {
        id: 'RULE_SPYWARE_BEACONING',
        name: 'Spyware Network Beaconing',
        category: 'spyware-like',
        severity: threat_models_1.BehaviorSeverity.HIGH,
        description: 'Detects periodic network beacon patterns',
        mitre_techniques: ['T1071', 'T1041'],
        weight: 20,
        conditions: [
            { field: 'outboundConnectionCount', operator: 'gte', value: 3 },
            { field: 'uniqueDestinationIPs', operator: 'gte', value: 2 }
        ]
    },
    {
        id: 'RULE_TROJAN_DROPPER',
        name: 'Trojan Dropper Behavior',
        category: 'trojan-like',
        severity: threat_models_1.BehaviorSeverity.HIGH,
        description: 'Detects multi-stage dropper/execution chain',
        mitre_techniques: ['T1059', 'T1204.002', 'T1105'],
        weight: 25,
        conditions: [
            { field: 'spawnedProcesses', operator: 'gte', value: 3 },
            { field: 'fileCreateCount', operator: 'gte', value: 5 }
        ]
    },
    {
        id: 'RULE_TROJAN_PERSISTENCE',
        name: 'Trojan Registry Persistence',
        category: 'trojan-like',
        severity: threat_models_1.BehaviorSeverity.HIGH,
        description: 'Detects autorun/persistence registry modifications',
        mitre_techniques: ['T1547.001', 'T1547'],
        weight: 25,
        conditions: [
            { field: 'persistenceKeysModified', operator: 'gte', value: 1 }
        ]
    },
    {
        id: 'RULE_TROJAN_HIDDEN_FILES',
        name: 'Trojan Hidden File Operations',
        category: 'trojan-like',
        severity: threat_models_1.BehaviorSeverity.MEDIUM,
        description: 'Detects hidden temporary file creation',
        mitre_techniques: ['T1071', 'T1105'],
        weight: 15,
        conditions: [
            { field: 'fileCreateCount', operator: 'gte', value: 3 },
            { field: 'suspiciousExtensionsCount', operator: 'gte', value: 2 }
        ]
    },
    {
        id: 'RULE_WORM_LATERAL_MOVEMENT',
        name: 'Worm Lateral Movement Simulation',
        category: 'worm-like',
        severity: threat_models_1.BehaviorSeverity.HIGH,
        description: 'Detects simulated lateral movement patterns',
        mitre_techniques: ['T1021', 'T1021.004', 'T1210'],
        weight: 25,
        conditions: [
            { field: 'outboundConnectionCount', operator: 'gte', value: 8 },
            { field: 'uniqueDestinationIPs', operator: 'gte', value: 4 }
        ]
    },
    {
        id: 'RULE_WORM_NETWORK_SCAN',
        name: 'Worm Network Scanning',
        category: 'worm-like',
        severity: threat_models_1.BehaviorSeverity.HIGH,
        description: 'Detects rapid network connection attempts',
        mitre_techniques: ['T1021', 'T1105'],
        weight: 20,
        conditions: [
            { field: 'networkConnectionCount', operator: 'gt', value: 15 },
            { field: 'rapidProcessSpawnRate', operator: 'gt', value: 3 }
        ]
    },
    {
        id: 'RULE_WORM_PROPAGATION',
        name: 'Worm Replication Pattern',
        category: 'worm-like',
        severity: threat_models_1.BehaviorSeverity.HIGH,
        description: 'Detects multi-directory file replication',
        mitre_techniques: ['T1105', 'T1021.004'],
        weight: 20,
        conditions: [
            { field: 'fileCreateCount', operator: 'gt', value: 20 },
            { field: 'spawnedProcesses', operator: 'gte', value: 5 }
        ]
    },
    {
        id: 'RULE_CREDENTIAL_ACCESS',
        name: 'Credential Access Attempt',
        category: 'credential-stealer-like',
        severity: threat_models_1.BehaviorSeverity.HIGH,
        description: 'Detects credential harvesting behavior',
        mitre_techniques: ['T1003', 'T1003.001', 'T1555', 'T1056.001'],
        weight: 30,
        conditions: [
            { field: 'privilegeEscalationAttempts', operator: 'gte', value: 1 },
            { field: 'registryModificationCount', operator: 'gte', value: 3 }
        ]
    },
    {
        id: 'RULE_CREDENTIAL_KEYLOG',
        name: 'Keylogging Simulation',
        category: 'credential-stealer-like',
        severity: threat_models_1.BehaviorSeverity.HIGH,
        description: 'Detects keylogging-like behavior',
        mitre_techniques: ['T1056.001', 'T1056'],
        weight: 25,
        conditions: [
            { field: 'powershellExecutions', operator: 'gte', value: 5 },
            { field: 'suspiciousBehaviorCount', operator: 'gte', value: 2 }
        ]
    },
    {
        id: 'RULE_PERSISTENCE_AUTORUN',
        name: 'Persistence Autorun Detection',
        category: 'trojan-like',
        severity: threat_models_1.BehaviorSeverity.MEDIUM,
        description: 'Detects registry autorun persistence',
        mitre_techniques: ['T1547.001', 'T1037', 'T1547'],
        weight: 20,
        conditions: [
            { field: 'persistenceKeysModified', operator: 'gte', value: 1 }
        ]
    },
    {
        id: 'RULE_NETWORK_BEACONING',
        name: 'Network Beaconing Pattern',
        category: 'spyware-like',
        severity: threat_models_1.BehaviorSeverity.MEDIUM,
        description: 'Detects regular interval network connections',
        mitre_techniques: ['T1071', 'T1071.004'],
        weight: 15,
        conditions: [
            { field: 'outboundConnectionCount', operator: 'gte', value: 5 },
            { field: 'uniqueDestinationIPs', operator: 'gte', value: 1 }
        ]
    }
];
class ThreatClassifier {
    classifyThreat(features, behaviors, patterns, events) {
        const ruleMatches = this.evaluateDetectionRules(features);
        const triggeredRules = ruleMatches.filter(r => r.matched);
        const reasons = [];
        const evidence = [];
        const techniques = [];
        for (const match of triggeredRules) {
            const rule = DETECTION_RULES.find(r => r.id === match.rule_id);
            if (rule) {
                reasons.push(rule.description);
                techniques.push(...rule.mitre_techniques);
                if (match.matched_value !== undefined) {
                    evidence.push(`${rule.name}: ${match.matched_value}`);
                }
            }
        }
        for (const behavior of behaviors) {
            reasons.push(`Behavioral detection: ${behavior.description}`);
            techniques.push(...behavior.mitreTechniques);
        }
        const categoryScores = this.calculateCategoryScores(triggeredRules, features);
        const predicted_threat = this.determineThreatType(categoryScores, features);
        const confidence = this.calculateConfidence(categoryScores, triggeredRules.length, features);
        const uniqueTechniques = [...new Set(techniques)];
        return {
            predicted_threat,
            confidence,
            reasons: reasons.slice(0, 10),
            supporting_evidence: evidence.slice(0, 10),
            mitre_techniques: uniqueTechniques.slice(0, 15)
        };
    }
    evaluateDetectionRules(features) {
        const matches = [];
        for (const rule of DETECTION_RULES) {
            const allConditionsMet = rule.conditions.every(condition => {
                return this.evaluateCondition(features, condition);
            });
            matches.push({
                rule_id: rule.id,
                rule_name: rule.name,
                matched: allConditionsMet,
                confidence_boost: allConditionsMet ? rule.weight : 0
            });
        }
        return matches;
    }
    evaluateCondition(features, condition) {
        const fieldValue = features[condition.field];
        if (fieldValue === undefined || fieldValue === null) {
            return false;
        }
        switch (condition.operator) {
            case 'gt':
                return fieldValue > condition.value;
            case 'lt':
                return fieldValue < condition.value;
            case 'gte':
                return fieldValue >= condition.value;
            case 'lte':
                return fieldValue <= condition.value;
            case 'eq':
                return fieldValue === condition.value;
            case 'contains':
                return String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase());
            case 'in':
                return Array.isArray(condition.value) && condition.value.includes(fieldValue);
            default:
                return false;
        }
    }
    calculateCategoryScores(triggeredRules, features) {
        const scores = {
            'ransomware-like': 0,
            'spyware-like': 0,
            'trojan-like': 0,
            'worm-like': 0,
            'credential-stealer-like': 0
        };
        for (const match of triggeredRules) {
            if (match.matched) {
                const rule = DETECTION_RULES.find(r => r.id === match.rule_id);
                if (rule) {
                    scores[rule.category] += match.confidence_boost;
                }
            }
        }
        if (features.suspiciousBehaviorCount > 5) {
            const baseScore = Math.min(features.suspiciousBehaviorCount * 3, 20);
            scores['ransomware-like'] += baseScore;
            scores['trojan-like'] += baseScore;
        }
        if (features.outboundConnectionCount > 10) {
            scores['worm-like'] += 15;
            scores['spyware-like'] += 10;
        }
        if (features.privilegeEscalationAttempts > 0) {
            scores['credential-stealer-like'] += 20;
        }
        return scores;
    }
    determineThreatType(categoryScores, features) {
        let maxScore = 0;
        let topCategory = 'unknown';
        for (const [category, score] of Object.entries(categoryScores)) {
            if (score > maxScore) {
                maxScore = score;
                topCategory = category;
            }
        }
        const totalActivity = features.fileModificationCount + features.fileCreateCount +
            features.networkConnectionCount + features.registryModificationCount;
        if (totalActivity < 5 && maxScore < 15) {
            return 'benign';
        }
        if (maxScore < 10) {
            return 'unknown';
        }
        return topCategory;
    }
    calculateConfidence(categoryScores, triggeredCount, features) {
        let confidence = 30;
        confidence += triggeredCount * 5;
        const maxScore = Math.max(...Object.values(categoryScores));
        if (maxScore > 50)
            confidence += 25;
        else if (maxScore > 30)
            confidence += 15;
        else if (maxScore > 15)
            confidence += 10;
        if (features.totalEvents > 100)
            confidence += 10;
        else if (features.totalEvents > 50)
            confidence += 5;
        if (features.suspiciousBehaviorCount > 3)
            confidence += 15;
        else if (features.suspiciousBehaviorCount > 0)
            confidence += 5;
        return Math.min(99, Math.max(0, confidence));
    }
    buildExecutionChain(events) {
        const sortedEvents = [...events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        const chain = [];
        let step = 1;
        const significantEvents = sortedEvents.filter(e => e.normalizedType.includes('process') ||
            e.normalizedType.includes('file') && e.normalizedType !== 'file_modify' ||
            e.normalizedType.includes('network') ||
            e.behavioralTags.includes('derived_behavior')).slice(0, 20);
        for (const event of significantEvents) {
            const action = this.describeEventAction(event);
            chain.push({
                step: step++,
                timestamp: new Date(event.timestamp),
                action,
                process: event.metadata.processName || 'unknown',
                details: this.getEventDetails(event)
            });
        }
        return chain;
    }
    describeEventAction(event) {
        const type = event.normalizedType;
        if (type.includes('process_start'))
            return 'Process Started';
        if (type.includes('file_create'))
            return 'File Created';
        if (type.includes('file_rename'))
            return 'File Renamed';
        if (type.includes('file_delete'))
            return 'File Deleted';
        if (type.includes('registry'))
            return 'Registry Modified';
        if (type.includes('network_connect'))
            return 'Network Connection';
        if (type.includes('network_data_sent'))
            return 'Data Exfiltrated';
        if (type.includes('mass_file_modification'))
            return 'Mass File Operation';
        if (type.includes('persistence_attempt'))
            return 'Persistence Established';
        if (type.includes('ransom_note'))
            return 'Ransom Note Created';
        return 'System Activity';
    }
    getEventDetails(event) {
        const path = event.metadata.path || event.metadata.target || '';
        const dest = event.metadata.destination;
        const port = event.metadata.port;
        if (path)
            return path.substring(0, 80);
        if (dest && port)
            return `${dest}:${port}`;
        if (dest)
            return dest;
        return event.normalizedType;
    }
    extractMitreTactics(techniques) {
        const tacticsSet = new Set();
        for (const techId of techniques) {
            const technique = threat_models_1.MITRE_TECHNIQUES[techId];
            if (technique) {
                tacticsSet.add(technique.tactic);
            }
        }
        return [...tacticsSet];
    }
}
exports.ThreatClassifier = ThreatClassifier;
exports.threatClassifier = new ThreatClassifier();
exports.default = exports.threatClassifier;
//# sourceMappingURL=threat_classifier.js.map