/**
 * Behavior Analysis Engine
 * Detects suspicious behavioral patterns and attack signatures
 */

import { v4 as uuidv4 } from 'uuid';
import {
  NormalizedEvent,
  ExtractedFeatures,
  BehaviorFinding,
  BehaviorType,
  BehaviorSeverity
} from './threat_models';

interface BehaviorRule {
  type: BehaviorType;
  severity: BehaviorSeverity;
  description: string;
  detect: (events: NormalizedEvent[], features: ExtractedFeatures) => boolean;
  confidence: number;
  mitreTechniques: string[];
  recommendedActions: string[];
}

const behaviorRules: BehaviorRule[] = [
  {
    type: BehaviorType.RANSOMWARE_LIKE,
    severity: BehaviorSeverity.CRITICAL,
    description: 'Ransomware-like behavior detected: mass file encryption, ransom notes, or file renaming patterns',
    detect: (events, features) => {
      const hasRansomNote = events.some(e => e.normalizedType === 'ransom_note_creation' as any);
      const hasMassMod = features.fileModificationCount > 20 || features.fileCreateCount > 20;
      const hasRenames = features.renamedFilesCount > 5;
      return (hasRansomNote) || (hasMassMod && hasRenames);
    },
    confidence: 85,
    mitreTechniques: ['T1486', 'T1489', 'T1490'],
    recommendedActions: [
      'Isolate affected system immediately',
      'Collect ransom note file for analysis',
      'Identify encryption method if possible',
      'Check for backup availability',
      'Report incident to security team'
    ]
  },
  {
    type: BehaviorType.SPYWARE_LIKE,
    severity: BehaviorSeverity.HIGH,
    description: 'Spyware-like behavior detected: keylogging, screen capture, or data exfiltration patterns',
    detect: (events, features) => {
      const suspiciousProcesses = ['keylog', 'keylogger', 'hook', 'capture', 'record'];
      const hasSuspiciousProcess = events.some(e => {
        const name = (e.metadata.processName || '').toLowerCase();
        return suspiciousProcesses.some(s => name.includes(s));
      });
      const hasDataExfil = features.fileCreateCount > 0 && features.outboundConnectionCount > 3;
      return hasSuspiciousProcess || (hasDataExfil && features.registryModificationCount > 5);
    },
    confidence: 75,
    mitreTechniques: ['T1056', 'T1113', 'T1041'],
    recommendedActions: [
      'Review process list for suspicious loggers',
      'Check for keyboard hook DLLs',
      'Analyze outbound connections for data exfil',
      'Capture memory for keylogger analysis'
    ]
  },
  {
    type: BehaviorType.TROJAN_LIKE,
    severity: BehaviorSeverity.HIGH,
    description: 'Trojan-like behavior detected: backdoor connections, suspicious process injection, or unusual network activity',
    detect: (events, features) => {
      const hasSuspiciousPorts = features.suspiciousPortsUsed.length > 0;
      const hasManyOutbound = features.outboundConnectionCount > 3;
      const hasPersistence = features.persistenceKeysModified > 0;
      const hasSuspiciousExe = features.suspiciousExtensionsCount > 3;
      return (hasSuspiciousPorts && hasManyOutbound) || (hasPersistence && hasSuspiciousExe);
    },
    confidence: 70,
    mitreTechniques: ['T1059', 'T1071', 'T1053', 'T1547'],
    recommendedActions: [
      'Block suspicious outbound connections',
      'Review registry autorun entries',
      'Analyze network traffic for C2 patterns',
      'Check for process injection indicators'
    ]
  },
  {
    type: BehaviorType.WORM_LIKE,
    severity: BehaviorSeverity.HIGH,
    description: 'Worm-like behavior detected: rapid propagation, mass process spawning, or network scanning',
    detect: (events, features) => {
      const hasRapidSpawn = features.rapidProcessSpawnRate > 10;
      const hasMassNetwork = features.outboundConnectionCount > 10;
      const hasManyUniqueIPs = features.uniqueDestinationIPs.length > 5;
      return hasRapidSpawn || (hasMassNetwork && hasManyUniqueIPs);
    },
    confidence: 65,
    mitreTechniques: ['T1059', 'T1210', 'T1021'],
    recommendedActions: [
      'Isolate affected system from network',
      'Block mass outbound connections',
      'Scan for lateral movement indicators',
      'Review network segmentation'
    ]
  },
  {
    type: BehaviorType.PERSISTENCE_BEHAVIOR,
    severity: BehaviorSeverity.MEDIUM,
    description: 'Persistence mechanism detected: registry autorun, scheduled task, or service installation',
    detect: (events, features) => {
      return features.persistenceKeysModified > 0 || 
             features.registryModificationCount > 3;
    },
    confidence: 80,
    mitreTechniques: ['T1547', 'T1053', 'T1168'],
    recommendedActions: [
      'Document persistence mechanism',
      'Review registry Run keys',
      'Check scheduled tasks',
      'Identify startup location'
    ]
  },
  {
    type: BehaviorType.CREDENTIAL_ACCESS,
    severity: BehaviorSeverity.HIGH,
    description: 'Credential access attempt detected: LSASS access, password dumping, or registry SAM extraction',
    detect: (events, features) => {
      const suspiciousProcesses = ['lsass', 'mimikatz', 'procdump', 'pwdump', 'wce'];
      return features.privilegeEscalationAttempts > 0 ||
             events.some(e => {
               const name = (e.metadata.processName || '').toLowerCase();
               return suspiciousProcesses.some(s => name.includes(s));
             });
    },
    confidence: 75,
    mitreTechniques: ['T1003', 'T1555', 'T1556'],
    recommendedActions: [
      'Capture memory for credential dumping analysis',
      'Review LSASS access patterns',
      'Check for credential theft tools',
      'Reset compromised credentials'
    ]
  },
  {
    type: BehaviorType.NETWORK_BEACONING,
    severity: BehaviorSeverity.MEDIUM,
    description: 'Network beaconing pattern detected: regular interval connections to external hosts',
    detect: (events, features) => {
      return features.outboundConnectionCount > 5 && 
             features.uniqueDestinationIPs.length > 1;
    },
    confidence: 60,
    mitreTechniques: ['T1071', 'T1043', 'T1105'],
    recommendedActions: [
      'Analyze connection intervals',
      'Identify C2 domain/IP',
      'Block suspicious destinations',
      'Monitor for beacon patterns'
    ]
  },
  {
    type: BehaviorType.MASS_FILE_OPS,
    severity: BehaviorSeverity.MEDIUM,
    description: 'Mass file operations detected: bulk file creation, modification, or deletion',
    detect: (events, features) => {
      return features.fileModificationCount > 50 ||
             features.fileCreateCount > 30 ||
             features.fileDeleteCount > 20;
    },
    confidence: 70,
    mitreTechniques: ['T1485', 'T1486', 'T1489'],
    recommendedActions: [
      'Identify affected file types',
      'Check for destructive patterns',
      'Review file operation timeline',
      'Assess data loss impact'
    ]
  },
  {
    type: BehaviorType.SUSPICIOUS_PROCESS,
    severity: BehaviorSeverity.LOW,
    description: 'Suspicious process detected: unusual process creation or script execution',
    detect: (events, features) => {
      return features.powershellExecutions > 2 || 
             features.cmdExecutions > 5 ||
             features.wmiExecutions > 1;
    },
    confidence: 65,
    mitreTechniques: ['T1059', 'T1028'],
    recommendedActions: [
      'Review script execution history',
      'Analyze PowerShell/CMD commands',
      'Check for encoded commands',
      'Monitor script execution patterns'
    ]
  }
];

export class BehaviorAnalyzer {
  analyzeBehaviors(events: NormalizedEvent[], features: ExtractedFeatures): BehaviorFinding[] {
    const findings: BehaviorFinding[] = [];

    for (const rule of behaviorRules) {
      try {
        if (rule.detect(events, features)) {
          const evidence = this.collectEvidence(events, rule.type);
          const finding: BehaviorFinding = {
            id: uuidv4(),
            behaviorType: rule.type,
            confidence: rule.confidence,
            severity: rule.severity,
            description: rule.description,
            evidence: evidence,
            events: events,
            mitreTechniques: rule.mitreTechniques,
            recommendedActions: rule.recommendedActions
          };
          findings.push(finding);
        }
      } catch (error) {
        console.error(`Error applying behavior rule ${rule.type}: ${error}`);
      }
    }

    return this.deduplicateFindings(findings);
  }

  private collectEvidence(events: NormalizedEvent[], behaviorType: BehaviorType): string[] {
    const evidence: string[] = [];

    for (const event of events) {
      const description = this.formatEventDescription(event);
      if (description) {
        evidence.push(description);
      }
    }

    return evidence;
  }

  private formatEventDescription(event: NormalizedEvent): string | null {
    const timestamp = new Date(event.timestamp).toISOString();
    const processName = event.metadata.processName || 'unknown';
    const path = event.metadata.path || event.metadata.target || '';

    switch (event.normalizedType) {
      case 'process_start' as any:
        return `[${timestamp}] Process started: ${processName}`;
      case 'file_create' as any:
        return `[${timestamp}] File created: ${path}`;
      case 'file_modify' as any:
        return `[${timestamp}] File modified: ${path}`;
      case 'registry_modify' as any:
        return `[${timestamp}] Registry modified: ${path}`;
      case 'network_connect' as any:
        return `[${timestamp}] Network connection: ${event.metadata.destination}:${event.metadata.port}`;
      default:
        return null;
    }
  }

  private deduplicateFindings(findings: BehaviorFinding[]): BehaviorFinding[] {
    const uniqueTypes = new Set<BehaviorType>();
    const deduplicated: BehaviorFinding[] = [];

    const sortedFindings = [...findings].sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    for (const finding of sortedFindings) {
      if (!uniqueTypes.has(finding.behaviorType)) {
        uniqueTypes.add(finding.behaviorType);
        deduplicated.push(finding);
      }
    }

    return deduplicated;
  }
}

export const behaviorAnalyzer = new BehaviorAnalyzer();
export default behaviorAnalyzer;