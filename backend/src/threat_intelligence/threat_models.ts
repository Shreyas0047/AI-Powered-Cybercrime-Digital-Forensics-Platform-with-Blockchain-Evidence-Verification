/**
 * Threat Intelligence Models
 * Core data structures for threat analysis
 */

export interface RawTelemetryEvent {
  eventType: string;
  timestamp: Date;
  processId?: string;
  processName?: string;
  operation?: string;
  path?: string;
  target?: string;
  source?: string;
  destination?: string;
  port?: number;
  protocol?: string;
  details?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface NormalizedEvent {
  id: string;
  sessionId: string;
  originalEvent: RawTelemetryEvent;
  normalizedType: NormalizedEventType;
  timestamp: Date;
  behavioralTags: string[];
  metadata: Record<string, any>;
}

export enum NormalizedEventType {
  PROCESS_START = 'process_start',
  PROCESS_TERMINATE = 'process_terminate',
  FILE_CREATE = 'file_create',
  FILE_MODIFY = 'file_modify',
  FILE_DELETE = 'file_delete',
  FILE_RENAME = 'file_rename',
  REGISTRY_CREATE = 'registry_create',
  REGISTRY_MODIFY = 'registry_modify',
  REGISTRY_DELETE = 'registry_delete',
  NETWORK_CONNECT = 'network_connect',
  NETWORK_LISTEN = 'network_listen',
  NETWORK_DATA_SENT = 'network_data_sent',
  NETWORK_DATA_RECEIVED = 'network_data_received',
  MASS_FILE_MODIFICATION = 'mass_file_modification',
  PERSISTENCE_ATTEMPT = 'persistence_attempt',
  SUSPICIOUS_NETWORK_ACTIVITY = 'suspicious_network_activity',
  RAPID_PROCESS_SPAWNING = 'rapid_process_spawning',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
  CREDENTIAL_ACCESS = 'credential_access',
  SUSPICIOUS_POWERSHELL = 'suspicious_powershell',
  RANSOM_NOTE_CREATION = 'ransom_note_creation',
  UNKNOWN = 'unknown'
}

export interface ExtractedFeatures {
  totalEvents: number;
  totalProcesses: number;
  spawnedProcesses: number;
  rapidProcessSpawnRate: number;
  fileModificationCount: number;
  fileCreateCount: number;
  fileDeleteCount: number;
  renamedFilesCount: number;
  suspiciousExtensionsCount: number;
  registryModificationCount: number;
  persistenceKeysModified: number;
  networkConnectionCount: number;
  outboundConnectionCount: number;
  inboundConnectionCount: number;
  uniqueDestinationIPs: string[];
  uniqueDestinationPorts: number[];
  suspiciousPortsUsed: number[];
  processTreeDepth: number;
  privilegeEscalationAttempts: number;
  executionDuration: number;
  suspiciousBehaviorCount: number;
  powershellExecutions: number;
  cmdExecutions: number;
  wmiExecutions: number;
}

export interface BehaviorFinding {
  id: string;
  behaviorType: BehaviorType;
  confidence: number;
  severity: BehaviorSeverity;
  description: string;
  evidence: string[];
  events: NormalizedEvent[];
  mitreTechniques: string[];
  recommendedActions: string[];
}

export enum BehaviorType {
  RANSOMWARE_LIKE = 'ransomware_like',
  SPYWARE_LIKE = 'spyware_like',
  TROJAN_LIKE = 'trojan_like',
  WORM_LIKE = 'worm_like',
  PERSISTENCE_BEHAVIOR = 'persistence_behavior',
  CREDENTIAL_ACCESS = 'credential_access',
  NETWORK_BEACONING = 'network_beaconing',
  MASS_FILE_OPS = 'mass_file_ops',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
  SUSPICIOUS_PROCESS = 'suspicious_process',
  REGISTRY_PERSISTENCE = 'registry_persistence',
  LATERAL_MOVEMENT = 'lateral_movement',
}

export enum BehaviorSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info'
}

export interface RiskScore {
  totalScore: number;
  severity: RiskSeverity;
  confidenceScore: number;
  contributingFactors: RiskFactor[];
  breakdown: RiskBreakdown;
}

export enum RiskSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info'
}

export interface RiskFactor {
  factor: string;
  score: number;
  description: string;
}

export interface RiskBreakdown {
  fileOperations: number;
  registryOperations: number;
  networkOperations: number;
  processOperations: number;
  persistenceAttempts: number;
}

export interface AttackPattern {
  id: string;
  name: string;
  description: string;
  severity: BehaviorSeverity;
  events: NormalizedEvent[];
  timeline: AttackStep[];
  confidence: number;
}

export interface AttackStep {
  order: number;
  timestamp: Date;
  event: NormalizedEvent;
  description: string;
}

export interface ThreatIntelligenceReport {
  sessionId: string;
  analysisTimestamp: Date;
  sessionSummary: SessionSummary;
  extractedFeatures: ExtractedFeatures;
  detectedBehaviors: BehaviorFinding[];
  suspiciousIndicators: string[];
  riskScore: RiskScore;
  correlatedAttackPatterns: AttackPattern[];
  recommendedActions: string[];
  forensicTimeline: ForensicTimelineEntry[];
  evidenceReferences: string[];
}

export interface SessionSummary {
  totalEvents: number;
  duration: number;
  processCount: number;
  networkConnections: number;
  fileOperations: number;
  registryOperations: number;
  primaryProcess?: string;
  startTime: Date;
  endTime: Date;
}

export interface ForensicTimelineEntry {
  timestamp: Date;
  eventType: string;
  description: string;
  severity: string;
  process?: string;
  details?: Record<string, any>;
}

export interface IntelligencePipelineInput {
  sessionId: string;
  events: RawTelemetryEvent[];
}

export interface IntelligencePipelineOutput {
  success: boolean;
  report?: ThreatIntelligenceReport;
  error?: string;
}

// ============================================
// THREAT CLASSIFICATION
// ============================================

export type ThreatClassification =
  | 'ransomware-like'
  | 'spyware-like'
  | 'trojan-like'
  | 'worm-like'
  | 'credential-stealer-like'
  | 'benign'
  | 'unknown';

export interface ThreatClassificationResult {
  predicted_threat: ThreatClassification;
  confidence: number;
  reasons: string[];
  supporting_evidence: string[];
  mitre_techniques: string[];
}

export interface ClassificationDetails {
  classification: ThreatClassificationResult;
  detected_indicators: string[];
  execution_chain: ExecutionChainStep[];
  timeline_highlights: ForensicTimelineEntry[];
}

export interface ExecutionChainStep {
  step: number;
  timestamp: Date;
  action: string;
  process: string;
  details: string;
}

// ============================================
// DETECTION RULES
// ============================================

export interface DetectionRule {
  id: string;
  name: string;
  category: ThreatClassification;
  severity: BehaviorSeverity;
  conditions: RuleCondition[];
  mitre_techniques: string[];
  weight: number;
  description: string;
}

export interface RuleCondition {
  field: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'contains' | 'in';
  value: any;
}

export interface RuleMatch {
  rule_id: string;
  rule_name: string;
  matched: boolean;
  matched_value?: any;
  confidence_boost: number;
}

// ============================================
// MITRE ATT&CK MAPPING
// ============================================

export interface MitreTechnique {
  id: string;
  name: string;
  tactic: string;
  description: string;
}

export const MITRE_TECHNIQUES: Record<string, MitreTechnique> = {
  'T1059': { id: 'T1059', name: 'Command & Scripting Interpreter', tactic: 'Execution', description: 'Adversaries may abuse command and script interpreters to execute commands' },
  'T1059.001': { id: 'T1059.001', name: 'PowerShell', tactic: 'Execution', description: 'Adversaries may use PowerShell to execute code' },
  'T1059.003': { id: 'T1059.003', name: 'Windows Command Shell', tactic: 'Execution', description: 'Adversaries may abuse the Windows command shell to execute code' },
  'T1486': { id: 'T1486', name: 'Data Encrypted for Impact', tactic: 'Impact', description: 'Adversaries may encrypt data on target systems to interrupt availability' },
  'T1489': { id: 'T1489', name: 'Service Stop', tactic: 'Impact', description: 'Adversaries may stop or disable services to render systems unusable' },
  'T1490': { id: 'T1490', name: 'Inhibit System Recovery', tactic: 'Impact', description: 'Adversaries may delete backups or inhibit recovery' },
  'T1547': { id: 'T1547', name: 'Boot or Logon Autostart Execution', tactic: 'Persistence', description: 'Adversaries may set a program to run at startup' },
  'T1547.001': { id: 'T1547.001', name: 'Registry Run Keys', tactic: 'Persistence', description: 'Adversaries may add program to registry autorun' },
  'T1547.002': { id: 'T1547.002', name: 'Scheduled Task', tactic: 'Persistence', description: 'Adversaries may create scheduled tasks for persistence' },
  'T1021': { id: 'T1021', name: 'Remote Services', tactic: 'Lateral Movement', description: 'Adversaries may use valid accounts to access remote services' },
  'T1021.004': { id: 'T1021.004', name: 'SMB/Windows Admin Shares', tactic: 'Lateral Movement', description: 'Adversaries may use SMB to move laterally' },
  'T1053': { id: 'T1053', name: 'Scheduled Task/Job', tactic: 'Persistence', description: 'Adversaries may schedule tasks for execution' },
  'T1003': { id: 'T1003', name: 'OS Credential Dumping', tactic: 'Credential Access', description: 'Adversaries may attempt to dump credentials' },
  'T1003.001': { id: 'T1003.001', name: 'LSASS Memory', tactic: 'Credential Access', description: 'Adversaries may dump LSASS memory' },
  'T1555': { id: 'T1555', name: 'Credentials from Password Stores', tactic: 'Credential Access', description: 'Adversaries may search compromised systems for credentials' },
  'T1082': { id: 'T1082', name: 'System Information Discovery', tactic: 'Discovery', description: 'Adversaries may gather system information' },
  'T1083': { id: 'T1083', name: 'File and Directory Discovery', tactic: 'Discovery', description: 'Adversaries may enumerate files and directories' },
  'T1041': { id: 'T1041', name: 'Exfiltration Over C2 Channel', tactic: 'Exfiltration', description: 'Adversaries may exfiltrate data over C2 channel' },
  'T1071': { id: 'T1071', name: 'Application Layer Protocol', tactic: 'Command & Control', description: 'Adversaries may communicate using application layer protocols' },
  'T1071.004': { id: 'T1071.004', name: 'DNS', tactic: 'Command & Control', description: 'Adversaries may use DNS for C2' },
  'T1105': { id: 'T1105', name: 'Ingress Tool Transfer', tactic: 'Command & Control', description: 'Adversaries may transfer tools onto victim' },
  'T1567': { id: 'T1567', name: 'Exfiltration Over Web Service', tactic: 'Exfiltration', description: 'Adversaries may exfiltrate data to cloud storage' },
  'T1113': { id: 'T1113', name: 'Screen Capture', tactic: 'Collection', description: 'Adversaries may take screenshots' },
  'T1056': { id: 'T1056', name: 'Input Capture', tactic: 'Collection', description: 'Adversaries may capture user input' },
  'T1056.001': { id: 'T1056.001', name: 'Keylogging', tactic: 'Collection', description: 'Adversaries may log keystrokes' },
  'T1028': { id: 'T1028', name: 'Windows Remote Management', tactic: 'Lateral Movement', description: 'Adversaries may use WinRM for lateral movement' },
  'T1210': { id: 'T1210', name: 'Exploitation of Remote Services', tactic: 'Lateral Movement', description: 'Adversaries may exploit remote services' },
  'T1204': { id: 'T1204', name: 'User Execution', tactic: 'Initial Access', description: 'Adversaries may trick users into executing code' },
  'T1204.002': { id: 'T1204.002', name: 'Malicious File', tactic: 'Initial Access', description: 'Adversaries may execute malicious files' },
  'T1037': { id: 'T1037', name: 'Boot or Logon Initialization Scripts', tactic: 'Persistence', description: 'Adversaries may use initialization scripts' },
  'T1067': { id: 'T1067', name: 'Bootkit', tactic: 'Persistence', description: 'Adversaries may use bootkits' },
  'T1542': { id: 'T1542', name: 'Pre-OS Boot', tactic: 'Persistence', description: 'Adversaries may persist at boot level' },
  'T1055': { id: 'T1055', name: 'Process Injection', tactic: 'Privilege Escalation', description: 'Adversaries may inject code into processes' },
};

// ============================================
// ENHANCED THREAT INTELLIGENCE REPORT
// ============================================

export interface EnhancedThreatIntelligenceReport extends ThreatIntelligenceReport {
  threat_classification: ThreatClassificationResult;
  detection_rules_triggered: RuleMatch[];
  mitre_tactics_detected: string[];
  execution_chain: ExecutionChainStep[];
  enhanced_indicators: EnhancedIndicator[];
}

export interface EnhancedIndicator {
  id: string;
  type: string;
  description: string;
  severity: string;
  timestamp: Date;
  source_process: string;
  mitre_techniques: string[];
}

// ============================================
// ATTACK CHAIN & CORRELATION
// ============================================

export interface AttackChain {
  chain_id: string;
  session_id: string;
  stages: AttackStage[];
  total_events: number;
  severity: string;
  confidence: number;
  mitre_tactics: string[];
  reconstructed_at: Date;
}

export interface AttackStage {
  stage_number: number;
  stage_name: string;
  events: NormalizedEvent[];
  start_time: Date;
  end_time: Date;
  duration_ms: number;
  indicators: string[];
  mitre_techniques: string[];
}

export interface EventRelationship {
  relationship_id: string;
  source_event_id: string;
  target_event_id: string;
  relationship_type: 'parent_child' | 'cause_effect' | 'sequential' | 'correlated';
  confidence: number;
  metadata: Record<string, any>;
}

export interface CorrelatedIncident {
  incident_id: string;
  session_id: string;
  title: string;
  description: string;
  severity: string;
  events: NormalizedEvent[];
  relationships: EventRelationship[];
  attack_chain?: AttackChain;
  detected_at: Date;
}

// ============================================
// BEHAVIORAL HEURISTICS
// ============================================

export interface BehavioralHeuristic {
  id: string;
  name: string;
  description: string;
  category: HeuristicCategory;
  severity: string;
  weight: number;
  detect: (events: NormalizedEvent[], features: ExtractedFeatures) => HeuristicResult;
}

export enum HeuristicCategory {
  PROCESS_ANOMALY = 'process_anomaly',
  FILE_BEHAVIOR = 'file_behavior',
  NETWORK_PATTERN = 'network_pattern',
  REGISTRY_PERSISTENCE = 'registry_persistence',
  EXECUTION_PATTERN = 'execution_pattern',
  ENCODED_COMMAND = 'encoded_command',
  LATERAL_MOVEMENT = 'lateral_movement',
  RECONNAISSANCE = 'reconnaissance'
}

export interface HeuristicResult {
  triggered: boolean;
  score: number;
  evidence: string[];
  confidence: number;
  mitre_techniques: string[];
  heuristic_id?: string;
  heuristic_name?: string;
  heuristic_category?: string;
}

// ============================================
// ANOMALY DETECTION
// ============================================

export interface Anomaly {
  id: string;
  type: AnomalyType;
  severity: string;
  description: string;
  timestamp: Date;
  deviation: number;
  baseline: number;
  actual_value: number;
  category: string;
  evidence: string[];
}

export enum AnomalyType {
  BURST_DETECTION = 'burst_detection',
  THRESHOLD_EXCEEDED = 'threshold_exceeded',
  PROCESS_DEVIATION = 'process_deviation',
  NETWORK_SPIKE = 'network_spike',
  EXECUTION_FREQUENCY = 'execution_frequency',
  FILE_OPERATION_ANOMALY = 'file_operation_anomaly',
  RARE_PATTERN = 'rare_pattern'
}

export interface AnomalyDetectionResult {
  anomalies: Anomaly[];
  baseline_metrics: BaselineMetrics;
  overall_anomaly_score: number;
}

export interface BaselineMetrics {
  avg_process_spawn_rate: number;
  avg_file_ops_per_minute: number;
  avg_network_connections: number;
  avg_registry_mods: number;
  execution_variance: number;
}

// ============================================
// THREAT PROFILING
// ============================================

export type ThreatProfile =
  | 'ransomware-profile'
  | 'spyware-profile'
  | 'trojan-profile'
  | 'worm-profile'
  | 'downloader-profile'
  | 'persistence-heavy-profile'
  | 'reconnaissance-heavy-profile'
  | 'benign-profile';

export interface ThreatProfileMatch {
  profile: ThreatProfile;
  match_score: number;
  matched_behaviors: string[];
  expected_behaviors: string[];
  missing_behaviors: string[];
}

export interface ProfileDefinition {
  profile: ThreatProfile;
  display_name: string;
  description: string;
  expected_behaviors: string[];
  scoring_weights: Record<string, number>;
  mitre_patterns: string[];
}

// ============================================
// FORENSIC TIMELINE
// ============================================

export interface ForensicTimelineGroup {
  group_id: string;
  stage: string;
  start_time: Date;
  end_time: Date;
  event_count: number;
  events: ForensicTimelineEntry[];
  severity: string;
}

export interface TimelineSummary {
  total_duration_ms: number;
  stage_summaries: StageSummary[];
  peak_activity_time: Date;
  peak_event_count: number;
}

export interface StageSummary {
  stage: string;
  event_count: number;
  duration_ms: number;
  severity: string;
}

// ============================================
// EVIDENCE RELATIONSHIPS
// ============================================

export interface EvidenceGraph {
  nodes: EvidenceNode[];
  edges: EvidenceEdge[];
}

export interface EvidenceNode {
  node_id: string;
  event_type: string;
  event_id: string;
  timestamp: Date;
  label: string;
  metadata: Record<string, any>;
}

export interface EvidenceEdge {
  edge_id: string;
  source_node_id: string;
  target_node_id: string;
  relationship_type: string;
  confidence: number;
}

// ============================================
// SESSION ANALYTICS
// ============================================

export interface SessionAnalytics {
  session_id: string;
  total_events: number;
  suspicious_event_count: number;
  most_active_process: string;
  most_modified_directory: string;
  persistence_attempts: number;
  outbound_connections: number;
  peak_activity_period: string;
  attack_intensity_score: number;
  process_tree: ProcessTreeNode[];
}

export interface ProcessTreeNode {
  pid: string;
  name: string;
  parent_pid: string | null;
  children: ProcessTreeNode[];
  depth: number;
}

// ============================================
// THREAT EXPLANATION
// ============================================

export interface ThreatExplanation {
  session_id: string;
  analyst_summary: string;
  executive_summary: string;
  technical_explanation: string;
  evidence_reasoning: EvidenceReasoning[];
  classification_justification: string;
  confidence_rationale: string;
}

export interface EvidenceReasoning {
  finding: string;
  evidence: string;
  conclusion: string;
}

// ============================================
// COMPREHENSIVE FORENSIC REPORT
// ============================================

export interface ComprehensiveForensicReport {
  // Metadata
  report_id: string;
  session_id: string;
  generated_at: Date;
  version: string;

  // Executive Summary
  executive_summary: ExecutiveSummarySection;

  // Threat Classification
  threat_classification: ThreatClassificationResult;
  threat_profile: ThreatProfileMatch;

  // Risk Analysis
  risk_analysis: RiskAnalysisSection;

  // Attack Reconstruction
  attack_chain?: AttackChain;
  correlated_incidents: CorrelatedIncident[];
  evidence_graph: EvidenceGraph;

  // Behavioral Analysis
  detected_behaviors: BehaviorFinding[];
  behavioral_heuristics_triggered: HeuristicResult[];
  anomalies_detected: Anomaly[];

  // Timeline
  forensic_timeline: ForensicTimelineGroup[];
  timeline_summary: TimelineSummary;

  // Technical Details
  session_analytics: SessionAnalytics;
  extracted_features: ExtractedFeatures;
  mitre_tactics: string[];
  mitre_techniques: string[];

  // Evidence
  evidence_relationships: EventRelationship[];
  suspicious_indicators: string[];

  // Recommendations
  recommendations: string[];

  // Explanation
  explanation: ThreatExplanation;
}

export interface ExecutiveSummarySection {
  overall_risk_level: string;
  threat_type: string;
  key_findings: string[];
  recommendation: string;
  confidence: number;
}

export interface RiskAnalysisSection {
  overall_risk_score: number;
  risk_level: string;
  confidence: number;
  risk_factors: RiskFactor[];
  category_scores: Record<string, number>;
}