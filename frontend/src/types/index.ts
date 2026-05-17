// User & Authentication Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  department?: string;
  createdAt: string;
  lastLogin?: string;
}

export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'forensic_analyst'
  | 'security_reviewer'
  | 'sandbox_operator'
  | 'auditor';

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

// Investigation Types
export interface Investigation {
  id: string;
  caseNumber: string;
  title: string;
  description: string;
  status: InvestigationStatus;
  priority: InvestigationPriority;
  category: InvestigationCategory;
  phase?: InvestigationPhase;
  createdAt: string;
  updatedAt: string;
  createdBy: User;
  leadAnalyst?: User;
  assignedAnalysts: AnalystAssignment[];
  evidenceCount: number;
  reportCount: number;
  alertCount: number;
  tags: string[];
  timeline?: TimelineEntry[];
}

export type InvestigationStatus =
  | 'pending'
  | 'active'
  | 'analyzing'
  | 'escalated'
  | 'resolved'
  | 'closed'
  | 'archived';

export type InvestigationPriority = 'critical' | 'high' | 'medium' | 'low';

export type InvestigationCategory =
  | 'malware'
  | 'data_breach'
  | 'phishing'
  | 'intrusion'
  | 'ransomware'
  | 'insider_threat'
  | 'ddos'
  | 'espionage'
  | 'fraud'
  | 'other';

export type InvestigationPhase =
  | 'identification'
  | 'containment'
  | 'eradication'
  | 'recovery'
  | 'lessons_learned';

export interface AnalystAssignment {
  userId: string;
  role: 'lead' | 'contributor' | 'reviewer';
  assignedAt: string;
  user?: User;
}

export interface TimelineEntry {
  timestamp: string;
  action: string;
  userId: string;
  userName: string;
  details: string;
}

// Evidence Types
export interface Evidence {
  id: string;
  evidenceId: string;
  investigationId: string;
  name: string;
  description: string;
  type: EvidenceType;
  status: EvidenceStatus;
  filePath: string;
  fileSize: number;
  mimeType: string;
  hash?: {
    sha256?: string;
    md5?: string;
  };
  collectedAt: string;
  collectedBy: User;
  verified: boolean;
  verifiedAt?: string;
  tags: string[];
  chainOfCustody: CustodyEntry[];
  analysisSummary?: string;
}

export type EvidenceType =
  | 'file'
  | 'memory_dump'
  | 'network_capture'
  | 'log'
  | 'screenshot'
  | 'registry_dump'
  | 'process_snapshot'
  | 'package'
  | 'malware_sample'
  | 'report'
  | 'other';

export type EvidenceStatus =
  | 'uploading'
  | 'processing'
  | 'ready'
  | 'analyzing'
  | 'verified'
  | 'archived'
  | 'deleted';

export interface CustodyEntry {
  timestamp: string;
  action: string;
  userId: string;
  userName: string;
  details: string;
  location?: string;
  hash?: string;
}

// Alert Types
export interface Alert {
  id: string;
  alertId: string;
  title: string;
  description: string;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  source: AlertSource;
  detectedAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  assignedTo?: User;
  investigationId?: string;
  tags: string[];
  iocIndicators?: IOCIndicator[];
  aiAnalysis?: AIAnalysisResult;
  mitreTechniques?: string[];
  relatedEvidenceIds?: string[];
}

export type AlertType =
  | 'system'
  | 'security'
  | 'investigation'
  | 'sandbox'
  | 'evidence'
  | 'threat_intel'
  | 'network'
  | 'endpoint';

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type AlertStatus =
  | 'new'
  | 'acknowledged'
  | 'in_progress'
  | 'escalated'
  | 'resolved'
  | 'false_positive'
  | 'closed';

export type AlertSource =
  | 'sandbox'
  | 'siem'
  | 'ids'
  | 'firewall'
  | 'endpoint'
  | 'network'
  | 'manual'
  | 'ai'
  | 'api';

export interface IOCIndicator {
  type: string;
  value: string;
  source: string;
  confidence: number;
}

export interface AIAnalysisResult {
  threatType?: string;
  confidence: number;
  recommendedActions?: string[];
  similarAlerts?: string[];
}

// Sandbox Session Types
export interface SandboxSession {
  id: string;
  sessionId: string;
  vmName: string;
  simulatorId: string;
  simulatorName: string;
  status: SandboxSessionStatus;
  startTime: string;
  endTime?: string;
  duration?: number;
  eventsCollected: number;
  evidenceFiles: string[];
  errorMessages: string[];
}

export type SandboxSessionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'timeout';

// Telemetry Types
export interface TelemetryEvent {
  id: string;
  timestamp: string;
  type: TelemetryEventType;
  source: string;
  details: Record<string, unknown>;
  suspiciousScore?: number;
}

export type TelemetryEventType =
  | 'process'
  | 'file'
  | 'registry'
  | 'network'
  | 'module'
  | 'memory'
  | 'behavior'
  | 'anomaly';

// AI Analysis Types
export interface TelemetryAnalysisResult {
  session_id: string;
  analysis_timestamp: string;
  total_events: number;
  suspicious_events: number;
  threat_classification: Record<string, number>;
  severity_score: number;
  severity_level: string;
  anomalies: AnomalyResult[];
  behavioral_summary: string;
  recommendations: string[];
  confidence: number;
}

export interface AnomalyResult {
  type: string;
  description: string;
  severity: string;
  deviation_score: number;
}

export interface InvestigationSummary {
  executive_summary: string;
  analyst_summary: string;
  key_findings: string[];
  timeline_summary: string;
  recommendations: string[];
  confidence: number;
}

// Dashboard Stats
export interface DashboardStats {
  totalInvestigations: number;
  activeInvestigations: number;
  criticalPriority: number;
  highPriority: number;
  totalEvidence: number;
  unverifiedEvidence: number;
  totalAlerts: number;
  criticalAlerts: number;
  openAlerts: number;
  sandboxSessionsToday: number;
  avgResolutionTime: number;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

// Pagination
export interface PaginationParams {
  page: number;
  limit: number;
  status?: string;
  priority?: string;
  type?: string;
  search?: string;
}

// Permissions
export type Permission =
  | 'investigation_create'
  | 'investigation_read'
  | 'investigation_update'
  | 'investigation_delete'
  | 'evidence_upload'
  | 'evidence_read'
  | 'evidence_verify'
  | 'evidence_delete'
  | 'report_generate'
  | 'report_read'
  | 'alert_manage'
  | 'sandbox_execute'
  | 'sandbox_manage'
  | 'user_manage'
  | 'settings_manage'
  | 'audit_view';

export const RolePermissions: Record<UserRole, Permission[]> = {
  super_admin: [
    'investigation_create', 'investigation_read', 'investigation_update', 'investigation_delete',
    'evidence_upload', 'evidence_read', 'evidence_verify', 'evidence_delete',
    'report_generate', 'report_read', 'alert_manage', 'sandbox_execute', 'sandbox_manage',
    'user_manage', 'settings_manage', 'audit_view'
  ],
  admin: [
    'investigation_create', 'investigation_read', 'investigation_update', 'investigation_delete',
    'evidence_upload', 'evidence_read', 'evidence_verify', 'evidence_delete',
    'report_generate', 'report_read', 'alert_manage', 'sandbox_execute', 'sandbox_manage',
    'user_manage', 'audit_view'
  ],
  forensic_analyst: [
    'investigation_create', 'investigation_read', 'investigation_update',
    'evidence_upload', 'evidence_read', 'evidence_verify',
    'report_generate', 'report_read', 'alert_manage', 'sandbox_execute'
  ],
  security_reviewer: [
    'investigation_read', 'evidence_read', 'report_read', 'alert_manage'
  ],
  sandbox_operator: [
    'investigation_read', 'evidence_read', 'sandbox_execute', 'sandbox_manage'
  ],
  auditor: [
    'investigation_read', 'evidence_read', 'report_read', 'audit_view'
  ]
};

// Re-export blockchain types
export * from './blockchain';