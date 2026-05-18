/**
 * Forensic Report Types
 * Type definitions for forensic reports from sandbox agent
 */

export interface ForensicReportSummary {
  id: string;
  sessionId: string;
  simulatorId: string;
  simulatorName: string;
  reportFile: string;
  generatedAt: string;
  executionTime: number;
  totalEvents: number;
  severityCounts: SeverityCounts;
  categoryCounts: CategoryCounts;
  fileSize: number;
  hash?: {
    sha256?: string;
    md5?: string;
  };
  blockchainVerified?: boolean;
  status: 'ready' | 'processing' | 'error';
}

export interface SeverityCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

export interface CategoryCounts {
  process: number;
  file: number;
  registry: number;
  network: number;
  behavior: number;
  system: number;
}

export interface ForensicReportDetail extends ForensicReportSummary {
  reportMetadata: {
    schemaVersion: string;
    generator: string;
    exportedAt: string;
  };
  environment: {
    vmName: string;
    snapshot: string;
    osVersion?: string;
    hostname?: string;
  };
  processActivity: ForensicEvent[];
  fileActivity: ForensicEvent[];
  registryActivity: ForensicEvent[];
  networkActivity: ForensicEvent[];
  behaviorSummary: BehaviorSummary;
  suspiciousActivities: SuspiciousActivity[];
  executionSummary: ExecutionSummary;
  collectionIntegrity: CollectionIntegrity;
}

export interface ForensicEvent {
  eventId: string;
  timestamp: string;
  category: EventCategory;
  operation: string;
  severity: EventSeverity;
  source: string;
  details: Record<string, unknown>;
  suspiciousIndicators?: SuspiciousIndicator[];
}

export type EventCategory = 'process' | 'file' | 'registry' | 'network' | 'behavior' | 'system';
export type EventSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface SuspiciousIndicator {
  type: string;
  description: string;
  score: number;
  matchedRules?: string[];
}

export interface BehaviorSummary {
  overallRiskScore: number;
  threatClassification: Record<string, number>;
  detectedPatterns: string[];
  persistenceIndicators: string[];
  networkIndicators: string[];
}

export interface SuspiciousActivity {
  timestamp: string;
  severity: EventSeverity;
  description: string;
  category: EventCategory;
  details: Record<string, unknown>;
  indicators: SuspiciousIndicator[];
}

export interface ExecutionSummary {
  startTime: string;
  endTime: string;
  duration: number;
  exitCode?: number;
  completionStatus: 'completed' | 'failed' | 'timeout' | 'terminated';
  eventsCollected: number;
  errors: string[];
}

export interface CollectionIntegrity {
  hashAlgorithm: string;
  hash: string;
  fileCount: number;
  totalSize: number;
  verified: boolean;
  verifiedAt?: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  source?: string;
  details?: Record<string, unknown>;
  sessionId?: string;
  userId?: string;
}

export type LogLevel = 'debug' | 'info' | 'warning' | 'error' | 'critical';
export type LogCategory = 'app' | 'monitoring' | 'simulator' | 'execution' | 'forensics' | 'vm' | 'sandbox' | 'system';

export interface AppSettings {
  vm: VMSettings;
  monitoring: MonitoringSettings;
  execution: ExecutionSettings;
  logging: LoggingSettings;
  notifications: NotificationSettings;
}

export interface VMSettings {
  vmName: string;
  snapshotName: string;
  headlessMode: boolean;
  startupTimeout: number;
  shutdownTimeout: number;
}

export interface MonitoringSettings {
  enabled: boolean;
  pollingInterval: number;
  processEnabled: boolean;
  fileEnabled: boolean;
  registryEnabled: boolean;
  networkEnabled: boolean;
  behaviorEnabled: boolean;
  logRetentionDays: number;
}

export interface ExecutionSettings {
  timeout: number;
  autoRollback: boolean;
  maxConcurrentSessions: number;
  telemetryLimit: number;
}

export interface LoggingSettings {
  level: LogLevel;
  maxFileSize: string;
  maxFiles: number;
}

export interface NotificationSettings {
  alertsEnabled: boolean;
  alertOnCompletion: boolean;
  alertOnError: boolean;
  webhookUrl?: string;
}

export interface EvidenceArtifact {
  id: string;
  evidenceId: string;
  name: string;
  source: string;
  category: EvidenceArtifactCategory;
  timestamp: string;
  filePath: string;
  fileSize: number;
  hash?: {
    sha256?: string;
    md5?: string;
  };
  blockchainVerified?: boolean;
  blockchainTxHash?: string;
  metadata: Record<string, unknown>;
  relatedEvents?: string[];
  relatedProcesses?: string[];
  relatedNetworkConnections?: string[];
}

export type EvidenceArtifactCategory =
  | 'process_dump'
  | 'file_sample'
  | 'registry_snapshot'
  | 'network_capture'
  | 'memory_dump'
  | 'screenshot'
  | 'log_file'
  | 'config_file'
  | 'configuration';

export interface ForensicEvidenceDetail extends EvidenceArtifact {
  rawEvent: Record<string, unknown>;
  eventRelationships: EventRelationship[];
  timeline: ForensicEvent[];
}

export interface EventRelationship {
  sourceEventId: string;
  targetEventId: string;
  relationshipType: 'spawns' | 'writes' | 'connects_to' | 'modifies' | 'references' | 'parent_of';
  description: string;
}