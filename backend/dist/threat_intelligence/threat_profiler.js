"use strict";
/**
 * Threat Profiling System
 * Match behaviors to threat profiles
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.threatProfiler = exports.ThreatProfiler = void 0;
const PROFILE_DEFINITIONS = [
    {
        profile: 'ransomware-profile',
        display_name: 'Ransomware Profile',
        description: 'Characterized by mass file encryption, extension renaming, ransom notes',
        expected_behaviors: [
            'mass_file_modification',
            'file_extension_rename',
            'ransom_note_creation',
            'high_file_operation_count'
        ],
        scoring_weights: {
            fileModificationCount: 3.0,
            renamedFilesCount: 4.0,
            suspiciousBehaviorCount: 2.5,
            persistenceKeysModified: 1.0
        },
        mitre_patterns: ['T1486', 'T1489', 'T1490']
    },
    {
        profile: 'spyware-profile',
        display_name: 'Spyware Profile',
        description: 'Characterized by data collection, screen capture, keylogging simulation',
        expected_behaviors: [
            'process_enumeration',
            'browser_data_access',
            'clipboard_monitoring',
            'network_beaconing'
        ],
        scoring_weights: {
            totalProcesses: 2.0,
            powershellExecutions: 2.5,
            outboundConnectionCount: 2.0,
            registryModificationCount: 1.5
        },
        mitre_patterns: ['T1056', 'T1113', 'T1082', 'T1071']
    },
    {
        profile: 'trojan-profile',
        display_name: 'Trojan Profile',
        description: 'Characterized by multi-stage execution, persistence, hidden files',
        expected_behaviors: [
            'multi_stage_execution',
            'registry_persistence',
            'hidden_file_creation',
            'child_process_spawn'
        ],
        scoring_weights: {
            spawnedProcesses: 2.5,
            persistenceKeysModified: 3.0,
            fileCreateCount: 1.5,
            suspiciousExtensionsCount: 2.0
        },
        mitre_patterns: ['T1059', 'T1547.001', 'T1105']
    },
    {
        profile: 'worm-profile',
        display_name: 'Worm Profile',
        description: 'Characterized by rapid network scanning, lateral movement, multi-directory replication',
        expected_behaviors: [
            'network_scan',
            'lateral_movement',
            'multi_directory_replication',
            'rapid_process_spawn'
        ],
        scoring_weights: {
            networkConnectionCount: 3.0,
            uniqueDestinationIPs: 2.5,
            fileCreateCount: 2.0,
            spawnedProcesses: 2.0
        },
        mitre_patterns: ['T1021', 'T1210', 'T1105']
    },
    {
        profile: 'downloader-profile',
        display_name: 'Downloader Profile',
        description: 'Characterized by network downloads, temporary file creation, process spawning',
        expected_behaviors: [
            'network_download',
            'temp_file_creation',
            'process_spawn'
        ],
        scoring_weights: {
            outboundConnectionCount: 2.5,
            fileCreateCount: 2.0,
            spawnedProcesses: 1.5,
            suspiciousExtensionsCount: 1.5
        },
        mitre_patterns: ['T1105', 'T1059', 'T1204']
    },
    {
        profile: 'persistence-heavy-profile',
        display_name: 'Persistence-Heavy Profile',
        description: 'Characterized by multiple persistence mechanisms',
        expected_behaviors: [
            'registry_persistence',
            'autorun_modification',
            'service_creation'
        ],
        scoring_weights: {
            persistenceKeysModified: 5.0,
            registryModificationCount: 3.0,
            powershellExecutions: 1.0,
            suspiciousBehaviorCount: 2.0
        },
        mitre_patterns: ['T1547.001', 'T1547.002', 'T1053', 'T1037']
    },
    {
        profile: 'reconnaissance-heavy-profile',
        display_name: 'Reconnaissance-Heavy Profile',
        description: 'Characterized by system/discovery activity',
        expected_behaviors: [
            'file_enumeration',
            'process_enumeration',
            'system_info_discovery'
        ],
        scoring_weights: {
            totalProcesses: 2.5,
            registryModificationCount: 1.5,
            fileModificationCount: 0.5,
            suspiciousBehaviorCount: 1.0
        },
        mitre_patterns: ['T1082', 'T1083', 'T1005']
    },
    {
        profile: 'benign-profile',
        display_name: 'Benign Profile',
        description: 'Normal system activity with no suspicious indicators',
        expected_behaviors: [],
        scoring_weights: {
            totalEvents: -0.1,
            suspiciousBehaviorCount: -2.0,
            fileModificationCount: 0,
            networkConnectionCount: 0
        },
        mitre_patterns: []
    }
];
class ThreatProfiler {
    matchProfile(features, behaviors) {
        const scores = {};
        for (const profileDef of PROFILE_DEFINITIONS) {
            let score = 0;
            for (const [feature, weight] of Object.entries(profileDef.scoring_weights)) {
                const value = features[feature];
                score += value * weight;
            }
            const behaviorMatches = this.countBehaviorMatches(behaviors, profileDef.expected_behaviors);
            score += behaviorMatches * 10;
            scores[profileDef.profile] = Math.max(0, score);
        }
        let bestProfile = 'benign-profile';
        let bestScore = -1;
        for (const [profile, score] of Object.entries(scores)) {
            if (score > bestScore) {
                bestScore = score;
                bestProfile = profile;
            }
        }
        const profileDef = PROFILE_DEFINITIONS.find(p => p.profile === bestProfile);
        const matchedBehaviors = this.getMatchedBehaviors(behaviors, profileDef?.expected_behaviors || []);
        const missingBehaviors = this.getMissingBehaviors(behaviors, profileDef?.expected_behaviors || []);
        const normalizedScore = Math.min(100, Math.max(0, bestScore));
        return {
            profile: bestProfile,
            match_score: normalizedScore,
            matched_behaviors: matchedBehaviors,
            expected_behaviors: profileDef?.expected_behaviors || [],
            missing_behaviors: missingBehaviors
        };
    }
    countBehaviorMatches(behaviors, expected) {
        if (expected.length === 0)
            return 0;
        let matches = 0;
        for (const behavior of behaviors) {
            const behaviorType = behavior.behaviorType.replace(/_/g, ' ').toLowerCase();
            for (const exp of expected) {
                if (behaviorType.includes(exp.replace(/_/g, ' '))) {
                    matches++;
                    break;
                }
            }
        }
        return matches;
    }
    getMatchedBehaviors(behaviors, expected) {
        const matched = [];
        for (const behavior of behaviors) {
            const behaviorType = behavior.behaviorType.replace(/_/g, ' ');
            for (const exp of expected) {
                if (behaviorType.includes(exp.replace(/_/g, ' '))) {
                    matched.push(behavior.behaviorType);
                    break;
                }
            }
        }
        return [...new Set(matched)];
    }
    getMissingBehaviors(behaviors, expected) {
        const present = new Set(behaviors.map(b => b.behaviorType.replace(/_/g, ' ').toLowerCase()));
        const missing = [];
        for (const exp of expected) {
            const expLower = exp.replace(/_/g, ' ');
            let found = false;
            for (const p of present) {
                if (p.includes(expLower)) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                missing.push(exp);
            }
        }
        return missing;
    }
    getProfileDescriptions() {
        return PROFILE_DEFINITIONS;
    }
}
exports.ThreatProfiler = ThreatProfiler;
exports.threatProfiler = new ThreatProfiler();
exports.default = exports.threatProfiler;
//# sourceMappingURL=threat_profiler.js.map