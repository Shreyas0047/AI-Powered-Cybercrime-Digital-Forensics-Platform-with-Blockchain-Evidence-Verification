/**
 * Behavioral Heuristics Engine
 * Heuristic-based detection without heavy ML
 */

import {
  NormalizedEvent,
  ExtractedFeatures,
  BehavioralHeuristic,
  HeuristicCategory,
  HeuristicResult
} from './threat_models';

const HEURISTICS: BehavioralHeuristic[] = [
  {
    id: 'HEUR_FILE_RENAMING_BURST',
    name: 'Excessive File Renaming',
    description: 'Detects rapid file extension changes (encryption simulation)',
    category: HeuristicCategory.FILE_BEHAVIOR,
    severity: 'high',
    weight: 25,
    detect: (events, features) => {
      const triggered = features.renamedFilesCount > 5;
      return {
        triggered,
        score: triggered ? features.renamedFilesCount * 5 : 0,
        evidence: triggered ? [`${features.renamedFilesCount} files renamed`] : [],
        confidence: triggered ? 85 : 0,
        mitre_techniques: triggered ? ['T1486'] : []
      };
    }
  },
  {
    id: 'HEUR_MASS_FILE_MODS',
    name: 'Mass File Modification',
    description: 'Detects high-volume file operations',
    category: HeuristicCategory.FILE_BEHAVIOR,
    severity: 'high',
    weight: 30,
    detect: (events, features) => {
      const triggered = features.fileModificationCount > 30;
      return {
        triggered,
        score: triggered ? Math.min(features.fileModificationCount, 50) : 0,
        evidence: triggered ? [`${features.fileModificationCount} file modifications`] : [],
        confidence: triggered ? 80 : 0,
        mitre_techniques: triggered ? ['T1485', 'T1486'] : []
      };
    }
  },
  {
    id: 'HEUR_RAPID_PROCESS_SPAWN',
    name: 'Rapid Child Process Spawning',
    description: 'Detects rapid process creation (potential injection/spawn)',
    category: HeuristicCategory.PROCESS_ANOMALY,
    severity: 'medium',
    weight: 20,
    detect: (events, features) => {
      const triggered = features.rapidProcessSpawnRate > 3 || features.spawnedProcesses > 8;
      return {
        triggered,
        score: triggered ? features.spawnedProcesses * 3 : 0,
        evidence: triggered ? [`${features.spawnedProcesses} processes spawned`, `Rate: ${features.rapidProcessSpawnRate.toFixed(2)}/ms`] : [],
        confidence: triggered ? 70 : 0,
        mitre_techniques: triggered ? ['T1059'] : []
      };
    }
  },
  {
    id: 'HEUR_POWERSHELL_EXEC',
    name: 'Suspicious PowerShell Usage',
    description: 'Detects PowerShell execution (common attack vector)',
    category: HeuristicCategory.EXECUTION_PATTERN,
    severity: 'high',
    weight: 25,
    detect: (events, features) => {
      const triggered = features.powershellExecutions > 2;
      return {
        triggered,
        score: triggered ? features.powershellExecutions * 8 : 0,
        evidence: triggered ? [`${features.powershellExecutions} PowerShell executions`] : [],
        confidence: triggered ? 75 : 0,
        mitre_techniques: triggered ? ['T1059.001'] : []
      };
    }
  },
  {
    id: 'HEUR_AUTORUN_REGISTRY',
    name: 'Autorun Registry Modification',
    description: 'Detects registry autorun/persistence modifications',
    category: HeuristicCategory.REGISTRY_PERSISTENCE,
    severity: 'high',
    weight: 25,
    detect: (events, features) => {
      const triggered = features.persistenceKeysModified > 0;
      return {
        triggered,
        score: triggered ? features.persistenceKeysModified * 15 : 0,
        evidence: triggered ? [`${features.persistenceKeysModified} persistence keys modified`] : [],
        confidence: triggered ? 90 : 0,
        mitre_techniques: triggered ? ['T1547.001'] : []
      };
    }
  },
  {
    id: 'HEUR_TEMP_DIR_ABUSE',
    name: 'Suspicious Temp Directory Usage',
    description: 'Detects heavy temp directory usage (common malware behavior)',
    category: HeuristicCategory.EXECUTION_PATTERN,
    severity: 'medium',
    weight: 15,
    detect: (events, features) => {
      const tempUsage = events.filter(e => {
        const path = e.metadata.path || '';
        return path.toLowerCase().includes('temp') || path.toLowerCase().includes('appdata');
      }).length;
      const triggered = tempUsage > 10;
      return {
        triggered,
        score: triggered ? Math.min(tempUsage * 2, 30) : 0,
        evidence: triggered ? [`${tempUsage} temp file operations`] : [],
        confidence: triggered ? 60 : 0,
        mitre_techniques: triggered ? ['T1074'] : []
      };
    }
  },
  {
    id: 'HEUR_NETWORK_BEACONING',
    name: 'Network Beaconing Pattern',
    description: 'Detects regular interval network connections (C2 simulation)',
    category: HeuristicCategory.NETWORK_PATTERN,
    severity: 'high',
    weight: 20,
    detect: (events, features) => {
      const triggered = features.outboundConnectionCount > 3 && features.uniqueDestinationIPs.length > 1;
      return {
        triggered,
        score: triggered ? features.outboundConnectionCount * 4 : 0,
        evidence: triggered ? [`${features.outboundConnectionCount} outbound connections`, `${features.uniqueDestinationIPs.length} unique IPs`] : [],
        confidence: triggered ? 65 : 0,
        mitre_techniques: triggered ? ['T1071'] : []
      };
    }
  },
  {
    id: 'HEUR_SMB_SCAN_SIM',
    name: 'Simulated SMB Scanning',
    description: 'Detects simulated lateral movement/network scanning',
    category: HeuristicCategory.LATERAL_MOVEMENT,
    severity: 'high',
    weight: 20,
    detect: (events, features) => {
      const triggered = features.networkConnectionCount > 15 && features.uniqueDestinationIPs.length > 5;
      return {
        triggered,
        score: triggered ? features.networkConnectionCount * 2 : 0,
        evidence: triggered ? [`${features.networkConnectionCount} network connections`, `${features.uniqueDestinationIPs.length} targets`] : [],
        confidence: triggered ? 60 : 0,
        mitre_techniques: triggered ? ['T1021', 'T1021.004'] : []
      };
    }
  },
  {
    id: 'HEUR_RECON_SCAN',
    name: 'Reconnaissance Activity',
    description: 'Detects file/directory enumeration patterns',
    category: HeuristicCategory.RECONNAISSANCE,
    severity: 'medium',
    weight: 15,
    detect: (events, features) => {
      const scanEvents = events.filter(e =>
        e.normalizedType.includes('scan') ||
        e.behavioralTags.includes('file_enumeration')
      ).length;
      const triggered = scanEvents > 15;
      return {
        triggered,
        score: triggered ? Math.min(scanEvents * 2, 30) : 0,
        evidence: triggered ? [`${scanEvents} scanning operations`] : [],
        confidence: triggered ? 65 : 0,
        mitre_techniques: triggered ? ['T1083'] : []
      };
    }
  },
  {
    id: 'HEUR_SUSPICIOUS_PORTS',
    name: 'Suspicious Port Usage',
    description: 'Detects connections to known suspicious ports',
    category: HeuristicCategory.NETWORK_PATTERN,
    severity: 'medium',
    weight: 15,
    detect: (events, features) => {
      const triggered = features.suspiciousPortsUsed.length > 0;
      return {
        triggered,
        score: triggered ? features.suspiciousPortsUsed.length * 10 : 0,
        evidence: triggered ? [`Suspicious ports: ${features.suspiciousPortsUsed.join(', ')}`] : [],
        confidence: triggered ? 70 : 0,
        mitre_techniques: triggered ? ['T1071', 'T1043'] : []
      };
    }
  },
  {
    id: 'HEUR_PRIVILEGE_ESCALATION',
    name: 'Privilege Escalation Attempt',
    description: 'Detects privilege escalation indicators',
    category: HeuristicCategory.PROCESS_ANOMALY,
    severity: 'critical',
    weight: 30,
    detect: (events, features) => {
      const triggered = features.privilegeEscalationAttempts > 0;
      return {
        triggered,
        score: triggered ? features.privilegeEscalationAttempts * 20 : 0,
        evidence: triggered ? [`${features.privilegeEscalationAttempts} privilege escalation attempts`] : [],
        confidence: triggered ? 80 : 0,
        mitre_techniques: triggered ? ['T1134', 'T1068'] : []
      };
    }
  },
  {
    id: 'HEUR_SUSPICIOUS_EXTENSIONS',
    name: 'Suspicious Executable Activity',
    description: 'Detects creation of suspicious file extensions',
    category: HeuristicCategory.FILE_BEHAVIOR,
    severity: 'medium',
    weight: 15,
    detect: (events, features) => {
      const triggered = features.suspiciousExtensionsCount > 2;
      return {
        triggered,
        score: triggered ? features.suspiciousExtensionsCount * 5 : 0,
        evidence: triggered ? [`${features.suspiciousExtensionsCount} suspicious file extensions`] : [],
        confidence: triggered ? 65 : 0,
        mitre_techniques: triggered ? ['T1204.002'] : []
      };
    }
  }
];

export class BehavioralHeuristicsEngine {
  analyzeHeuristics(
    events: NormalizedEvent[],
    features: ExtractedFeatures
  ): HeuristicResult[] {
    const results: HeuristicResult[] = [];

    for (const heuristic of HEURISTICS) {
      try {
        const result = heuristic.detect(events, features);
        if (result.triggered) {
          results.push({
            ...result,
            heuristic_id: heuristic.id,
            heuristic_name: heuristic.name,
            heuristic_category: heuristic.category
          });
        }
      } catch (error) {
        console.error(`Heuristic ${heuristic.id} failed: ${error}`);
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  getHeuristicSummary(results: HeuristicResult[]): {
    total_triggers: number;
    total_score: number;
    by_category: Record<string, number>;
    by_severity: Record<string, number>;
  } {
    const byCategory: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    for (const result of results) {
      byCategory[result.heuristic_category || 'unknown'] =
        (byCategory[result.heuristic_category || 'unknown'] || 0) + result.score;
    }

    return {
      total_triggers: results.length,
      total_score: results.reduce((sum, r) => sum + r.score, 0),
      by_category: byCategory,
      by_severity: bySeverity
    };
  }
}

export const behavioralHeuristicsEngine = new BehavioralHeuristicsEngine();
export default behavioralHeuristicsEngine;