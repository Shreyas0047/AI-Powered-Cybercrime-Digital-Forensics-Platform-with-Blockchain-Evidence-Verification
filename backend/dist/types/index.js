"use strict";
/**
 * Core Type Definitions
 * Central type exports for the forensics platform backend
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditAction = exports.SandboxSessionStatus = exports.AlertSource = exports.AlertSeverity = exports.AlertType = exports.ReportSeverity = exports.ReportStatus = exports.ReportType = exports.EvidenceStatus = exports.EvidenceSource = exports.EvidenceType = exports.InvestigationPriority = exports.InvestigationStatus = exports.AccountStatus = exports.RolePermissions = exports.Permission = exports.RoleNames = exports.RoleHierarchy = exports.UserRole = void 0;
// ============================================
// USER ROLES - Hierarchical Enterprise RBAC
// ============================================
var UserRole;
(function (UserRole) {
    // Tier 1: Full System Control
    UserRole["SUPER_ADMIN"] = "super_admin";
    // Tier 2: Administrative
    UserRole["ADMIN"] = "admin";
    // Tier 3: Operational
    UserRole["FORENSIC_ANALYST"] = "forensic_analyst";
    UserRole["SECURITY_REVIEWER"] = "security_reviewer";
    // Tier 4: Limited Operations
    UserRole["SANDBOX_OPERATOR"] = "sandbox_operator";
    // Tier 5: Read-Only
    UserRole["AUDITOR"] = "auditor";
})(UserRole || (exports.UserRole = UserRole = {}));
// Role hierarchy for RBAC checks
exports.RoleHierarchy = {
    [UserRole.SUPER_ADMIN]: 100,
    [UserRole.ADMIN]: 80,
    [UserRole.FORENSIC_ANALYST]: 60,
    [UserRole.SECURITY_REVIEWER]: 40,
    [UserRole.SANDBOX_OPERATOR]: 20,
    [UserRole.AUDITOR]: 10,
};
// Role display names
exports.RoleNames = {
    [UserRole.SUPER_ADMIN]: 'Super Administrator',
    [UserRole.ADMIN]: 'Administrator',
    [UserRole.FORENSIC_ANALYST]: 'Forensic Analyst',
    [UserRole.SECURITY_REVIEWER]: 'Security Reviewer',
    [UserRole.SANDBOX_OPERATOR]: 'Sandbox Operator',
    [UserRole.AUDITOR]: 'Read-only Auditor',
};
// ============================================
// PERMISSIONS SYSTEM
// ============================================
var Permission;
(function (Permission) {
    // User Management
    Permission["USER_CREATE"] = "user:create";
    Permission["USER_READ"] = "user:read";
    Permission["USER_UPDATE"] = "user:update";
    Permission["USER_DELETE"] = "user:delete";
    Permission["USER_ACTIVATE"] = "user:activate";
    Permission["USER_DEACTIVATE"] = "user:deactivate";
    Permission["USER_ROLE_ASSIGN"] = "user:role:assign";
    // Investigation Management
    Permission["INVESTIGATION_CREATE"] = "investigation:create";
    Permission["INVESTIGATION_READ"] = "investigation:read";
    Permission["INVESTIGATION_UPDATE"] = "investigation:update";
    Permission["INVESTIGATION_DELETE"] = "investigation:delete";
    Permission["INVESTIGATION_ASSIGN"] = "investigation:assign";
    Permission["INVESTIGATION_CLOSE"] = "investigation:close";
    // Evidence Management
    Permission["EVIDENCE_UPLOAD"] = "evidence:upload";
    Permission["EVIDENCE_READ"] = "evidence:read";
    Permission["EVIDENCE_VERIFY"] = "evidence:verify";
    Permission["EVIDENCE_DELETE"] = "evidence:delete";
    Permission["EVIDENCE_DOWNLOAD"] = "evidence:download";
    // Report Management
    Permission["REPORT_CREATE"] = "report:create";
    Permission["REPORT_READ"] = "report:read";
    Permission["REPORT_UPDATE"] = "report:update";
    Permission["REPORT_DELETE"] = "report:delete";
    Permission["REPORT_EXPORT"] = "report:export";
    Permission["REPORT_APPROVE"] = "report:approve";
    // Sandbox Operations
    Permission["SANDBOX_EXECUTE"] = "sandbox:execute";
    Permission["SANDBOX_VIEW"] = "sandbox:view";
    Permission["SANDBOX_TELEMETRY"] = "sandbox:telemetry";
    // AI Analysis
    Permission["AI_ANALYSIS_RUN"] = "ai:analysis:run";
    Permission["AI_ANALYSIS_VIEW"] = "ai:analysis:view";
    // System Administration
    Permission["SYSTEM_SETTINGS"] = "system:settings";
    Permission["SYSTEM_DIAGNOSTICS"] = "system:diagnostics";
    Permission["SYSTEM_LOGS"] = "system:logs";
    // Audit & Compliance
    Permission["AUDIT_VIEW"] = "audit:view";
    Permission["AUDIT_EXPORT"] = "audit:export";
})(Permission || (exports.Permission = Permission = {}));
// Role-Permission mapping
exports.RolePermissions = {
    [UserRole.SUPER_ADMIN]: Object.values(Permission),
    [UserRole.ADMIN]: [
        // User management (no delete or role assignment)
        Permission.USER_CREATE,
        Permission.USER_READ,
        Permission.USER_UPDATE,
        Permission.USER_ACTIVATE,
        Permission.USER_DEACTIVATE,
        // Investigation
        Permission.INVESTIGATION_CREATE,
        Permission.INVESTIGATION_READ,
        Permission.INVESTIGATION_UPDATE,
        Permission.INVESTIGATION_ASSIGN,
        Permission.INVESTIGATION_CLOSE,
        // Evidence
        Permission.EVIDENCE_UPLOAD,
        Permission.EVIDENCE_READ,
        Permission.EVIDENCE_VERIFY,
        Permission.EVIDENCE_DELETE,
        Permission.EVIDENCE_DOWNLOAD,
        // Reports
        Permission.REPORT_CREATE,
        Permission.REPORT_READ,
        Permission.REPORT_UPDATE,
        Permission.REPORT_DELETE,
        Permission.REPORT_EXPORT,
        Permission.REPORT_APPROVE,
        // Sandbox
        Permission.SANDBOX_VIEW,
        Permission.SANDBOX_TELEMETRY,
        // AI
        Permission.AI_ANALYSIS_RUN,
        Permission.AI_ANALYSIS_VIEW,
        // Audit
        Permission.AUDIT_VIEW,
        Permission.AUDIT_EXPORT,
    ],
    [UserRole.FORENSIC_ANALYST]: [
        // Own investigations
        Permission.INVESTIGATION_READ,
        Permission.INVESTIGATION_UPDATE,
        // Evidence
        Permission.EVIDENCE_UPLOAD,
        Permission.EVIDENCE_READ,
        Permission.EVIDENCE_VERIFY,
        Permission.EVIDENCE_DOWNLOAD,
        // Reports
        Permission.REPORT_CREATE,
        Permission.REPORT_READ,
        Permission.REPORT_UPDATE,
        Permission.REPORT_EXPORT,
        // Sandbox
        Permission.SANDBOX_VIEW,
        Permission.SANDBOX_TELEMETRY,
        // AI
        Permission.AI_ANALYSIS_RUN,
        Permission.AI_ANALYSIS_VIEW,
    ],
    [UserRole.SECURITY_REVIEWER]: [
        Permission.INVESTIGATION_READ,
        Permission.EVIDENCE_READ,
        Permission.EVIDENCE_DOWNLOAD,
        Permission.REPORT_READ,
        Permission.REPORT_APPROVE,
        Permission.SANDBOX_VIEW,
        Permission.AI_ANALYSIS_VIEW,
        Permission.AUDIT_VIEW,
    ],
    [UserRole.SANDBOX_OPERATOR]: [
        Permission.SANDBOX_VIEW,
        Permission.SANDBOX_EXECUTE,
        Permission.SANDBOX_TELEMETRY,
        Permission.EVIDENCE_UPLOAD,
        Permission.INVESTIGATION_READ,
    ],
    [UserRole.AUDITOR]: [
        Permission.INVESTIGATION_READ,
        Permission.EVIDENCE_READ,
        Permission.REPORT_READ,
        Permission.SANDBOX_VIEW,
        Permission.AUDIT_VIEW,
        Permission.AUDIT_EXPORT,
    ],
};
// Account status for user management
var AccountStatus;
(function (AccountStatus) {
    AccountStatus["ACTIVE"] = "active";
    AccountStatus["INACTIVE"] = "inactive";
    AccountStatus["LOCKED"] = "locked";
    AccountStatus["PENDING"] = "pending";
    AccountStatus["SUSPENDED"] = "suspended";
})(AccountStatus || (exports.AccountStatus = AccountStatus = {}));
var InvestigationStatus;
(function (InvestigationStatus) {
    InvestigationStatus["PENDING"] = "pending";
    InvestigationStatus["ACTIVE"] = "active";
    InvestigationStatus["ANALYZING"] = "analyzing";
    InvestigationStatus["ESCALATED"] = "escalated";
    InvestigationStatus["RESOLVED"] = "resolved";
    InvestigationStatus["CLOSED"] = "closed";
    InvestigationStatus["ARCHIVED"] = "archived";
})(InvestigationStatus || (exports.InvestigationStatus = InvestigationStatus = {}));
var InvestigationPriority;
(function (InvestigationPriority) {
    InvestigationPriority["CRITICAL"] = "critical";
    InvestigationPriority["HIGH"] = "high";
    InvestigationPriority["MEDIUM"] = "medium";
    InvestigationPriority["LOW"] = "low";
})(InvestigationPriority || (exports.InvestigationPriority = InvestigationPriority = {}));
var EvidenceType;
(function (EvidenceType) {
    EvidenceType["FILE"] = "file";
    EvidenceType["MEMORY_DUMP"] = "memory_dump";
    EvidenceType["NETWORK_CAPTURE"] = "network_capture";
    EvidenceType["LOG"] = "log";
    EvidenceType["SCREENSHOT"] = "screenshot";
    EvidenceType["REPORT"] = "report";
    EvidenceType["OTHER"] = "other";
})(EvidenceType || (exports.EvidenceType = EvidenceType = {}));
var EvidenceSource;
(function (EvidenceSource) {
    EvidenceSource["MANUAL_UPLOAD"] = "manual_upload";
    EvidenceSource["SANDBOX_EXECUTION"] = "sandbox_execution";
    EvidenceSource["NETWORK_CAPTURE"] = "network_capture";
    EvidenceSource["ENDPOINT_COLLECTION"] = "endpoint_collection";
    EvidenceSource["IMPORTED"] = "imported";
    EvidenceSource["API_RECEIVED"] = "api_received";
})(EvidenceSource || (exports.EvidenceSource = EvidenceSource = {}));
var EvidenceStatus;
(function (EvidenceStatus) {
    EvidenceStatus["UPLOADING"] = "uploading";
    EvidenceStatus["PROCESSING"] = "processing";
    EvidenceStatus["READY"] = "ready";
    EvidenceStatus["ANALYZING"] = "analyzing";
    EvidenceStatus["VERIFIED"] = "verified";
    EvidenceStatus["ARCHIVED"] = "archived";
    EvidenceStatus["DELETED"] = "deleted";
})(EvidenceStatus || (exports.EvidenceStatus = EvidenceStatus = {}));
var ReportType;
(function (ReportType) {
    ReportType["INVESTIGATION"] = "investigation";
    ReportType["EVIDENCE"] = "evidence";
    ReportType["THREAT_ANALYSIS"] = "threat_analysis";
    ReportType["EXECUTIVE"] = "executive";
})(ReportType || (exports.ReportType = ReportType = {}));
var ReportStatus;
(function (ReportStatus) {
    ReportStatus["DRAFT"] = "draft";
    ReportStatus["REVIEW"] = "review";
    ReportStatus["FINAL"] = "final";
})(ReportStatus || (exports.ReportStatus = ReportStatus = {}));
var ReportSeverity;
(function (ReportSeverity) {
    ReportSeverity["CRITICAL"] = "critical";
    ReportSeverity["HIGH"] = "high";
    ReportSeverity["MEDIUM"] = "medium";
    ReportSeverity["LOW"] = "low";
    ReportSeverity["INFORMATIONAL"] = "informational";
})(ReportSeverity || (exports.ReportSeverity = ReportSeverity = {}));
var AlertType;
(function (AlertType) {
    AlertType["SYSTEM"] = "system";
    AlertType["SECURITY"] = "security";
    AlertType["INVESTIGATION"] = "investigation";
    AlertType["SANDBOX"] = "sandbox";
    AlertType["EVIDENCE"] = "evidence";
})(AlertType || (exports.AlertType = AlertType = {}));
var AlertSeverity;
(function (AlertSeverity) {
    AlertSeverity["CRITICAL"] = "critical";
    AlertSeverity["HIGH"] = "high";
    AlertSeverity["MEDIUM"] = "medium";
    AlertSeverity["LOW"] = "low";
    AlertSeverity["INFO"] = "info";
})(AlertSeverity || (exports.AlertSeverity = AlertSeverity = {}));
var AlertSource;
(function (AlertSource) {
    AlertSource["SANDBOX"] = "sandbox";
    AlertSource["SIEM"] = "siem";
    AlertSource["IDS"] = "ids";
    AlertSource["FIREWALL"] = "firewall";
    AlertSource["ENDPOINT"] = "endpoint";
    AlertSource["NETWORK"] = "network";
    AlertSource["MANUAL"] = "manual";
    AlertSource["AI"] = "ai";
    AlertSource["API"] = "api";
})(AlertSource || (exports.AlertSource = AlertSource = {}));
var SandboxSessionStatus;
(function (SandboxSessionStatus) {
    SandboxSessionStatus["PENDING"] = "pending";
    SandboxSessionStatus["RUNNING"] = "running";
    SandboxSessionStatus["COMPLETED"] = "completed";
    SandboxSessionStatus["FAILED"] = "failed";
    SandboxSessionStatus["TIMEOUT"] = "timeout";
})(SandboxSessionStatus || (exports.SandboxSessionStatus = SandboxSessionStatus = {}));
var AuditAction;
(function (AuditAction) {
    // Auth events
    AuditAction["LOGIN"] = "auth:login";
    AuditAction["LOGIN_FAILED"] = "auth:login_failed";
    AuditAction["LOGOUT"] = "auth:logout";
    AuditAction["TOKEN_REFRESH"] = "auth:token_refresh";
    AuditAction["PASSWORD_CHANGE"] = "auth:password_change";
    AuditAction["PASSWORD_RESET_REQUEST"] = "auth:password_reset_request";
    AuditAction["PASSWORD_RESET_COMPLETE"] = "auth:password_reset_complete";
    // User events
    AuditAction["USER_CREATE"] = "user:create";
    AuditAction["USER_UPDATE"] = "user:update";
    AuditAction["USER_DELETE"] = "user:delete";
    AuditAction["USER_ACTIVATE"] = "user:activate";
    AuditAction["USER_DEACTIVATE"] = "user:deactivate";
    AuditAction["USER_ROLE_CHANGE"] = "user:role_change";
    // Investigation events
    AuditAction["INVESTIGATION_CREATE"] = "investigation:create";
    AuditAction["INVESTIGATION_UPDATE"] = "investigation:update";
    AuditAction["INVESTIGATION_DELETE"] = "investigation:delete";
    // Evidence events
    AuditAction["EVIDENCE_UPLOAD"] = "evidence:upload";
    AuditAction["EVIDENCE_DELETE"] = "evidence:delete";
    AuditAction["EVIDENCE_VERIFY"] = "evidence:verify";
})(AuditAction || (exports.AuditAction = AuditAction = {}));
__exportStar(require("./reports"), exports);
//# sourceMappingURL=index.js.map