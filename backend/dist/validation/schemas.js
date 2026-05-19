"use strict";
/**
 * Input Validation Schemas
 * Enterprise-grade validation with Joi
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.querySchemas = exports.analyticsSchemas = exports.threatSchemas = exports.custodySchemas = exports.blockchainSchemas = exports.alertSchemas = exports.sandboxSchemas = exports.evidenceSchemas = exports.investigationSchemas = exports.userSchemas = void 0;
exports.validate = validate;
const joi_1 = __importDefault(require("joi"));
/**
 * User schemas
 */
exports.userSchemas = {
    register: joi_1.default.object({
        username: joi_1.default.string().alphanum().min(3).max(30).required(),
        email: joi_1.default.string().email().required(),
        password: joi_1.default.string().min(12).max(128)
            .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/)
            .required()
            .messages({
            'string.pattern.base': 'Password must contain uppercase, lowercase, number, and special character',
        }),
        firstName: joi_1.default.string().max(50).required(),
        lastName: joi_1.default.string().max(50).required(),
        role: joi_1.default.string().valid('super_admin', 'admin', 'forensic_analyst', 'security_reviewer', 'sandbox_operator', 'auditor'),
    }),
    login: joi_1.default.object({
        username: joi_1.default.string().required(),
        password: joi_1.default.string().required(),
    }),
    updateProfile: joi_1.default.object({
        firstName: joi_1.default.string().max(50),
        lastName: joi_1.default.string().max(50),
        email: joi_1.default.string().email(),
    }),
    changePassword: joi_1.default.object({
        currentPassword: joi_1.default.string().required(),
        newPassword: joi_1.default.string().min(12).max(128)
            .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/)
            .required(),
    }),
};
/**
 * Investigation schemas
 */
exports.investigationSchemas = {
    create: joi_1.default.object({
        title: joi_1.default.string().min(3).max(200).required(),
        description: joi_1.default.string().max(2000).required(),
        type: joi_1.default.string().valid('malware_analysis', 'incident_response', 'digital_forensics', 'threat_hunting', 'compliance_audit', 'vulnerability_assessment').required(),
        priority: joi_1.default.string().valid('critical', 'high', 'medium', 'low').default('medium'),
        tags: joi_1.default.array().items(joi_1.default.string().max(50)).max(10),
    }),
    update: joi_1.default.object({
        title: joi_1.default.string().min(3).max(200),
        description: joi_1.default.string().max(2000),
        status: joi_1.default.string().valid('active', 'investigating', 'escalated', 'resolved', 'closed', 'archived'),
        priority: joi_1.default.string().valid('critical', 'high', 'medium', 'low'),
        tags: joi_1.default.array().items(joi_1.default.string().max(50)).max(10),
    }),
    addNote: joi_1.default.object({
        content: joi_1.default.string().min(1).max(5000).required(),
        category: joi_1.default.string().valid('observation', 'finding', 'hypothesis', 'action', 'general'),
    }),
};
/**
 * Evidence schemas
 */
exports.evidenceSchemas = {
    upload: joi_1.default.object({
        investigationId: joi_1.default.string().required(),
        evidenceType: joi_1.default.string().valid('file', 'memory_dump', 'disk_image', 'network_capture', 'screenshot', 'log_file', 'registry_dump', 'process_snapshot').required(),
        description: joi_1.default.string().max(500).required(),
        tags: joi_1.default.array().items(joi_1.default.string().max(50)).max(10),
        classification: joi_1.default.string().valid('malicious', 'suspicious', 'benign', 'unknown').default('unknown'),
    }),
    updateMetadata: joi_1.default.object({
        description: joi_1.default.string().max(500),
        tags: joi_1.default.array().items(joi_1.default.string().max(50)).max(10),
        classification: joi_1.default.string().valid('malicious', 'suspicious', 'benign', 'unknown'),
        analysisStatus: joi_1.default.string().valid('pending', 'in_progress', 'completed', 'failed'),
    }),
};
/**
 * Sandbox schemas
 */
exports.sandboxSchemas = {
    createSession: joi_1.default.object({
        vmName: joi_1.default.string().required(),
        malwareFile: joi_1.default.string().required(),
        timeout: joi_1.default.number().min(30).max(300).default(120),
        enableNetwork: joi_1.default.boolean().default(false),
        enableRegistry: joi_1.default.boolean().default(true),
        enableFilesystem: joi_1.default.boolean().default(true),
    }),
    updateSession: joi_1.default.object({
        status: joi_1.default.string().valid('running', 'paused', 'completed', 'failed', 'terminated'),
        notes: joi_1.default.string().max(1000),
    }),
};
/**
 * Alert schemas
 */
exports.alertSchemas = {
    create: joi_1.default.object({
        type: joi_1.default.string().valid('threat_detected', 'anomaly', 'policy_violation', 'system_error', 'user_action').required(),
        severity: joi_1.default.string().valid('critical', 'high', 'medium', 'low', 'info').required(),
        title: joi_1.default.string().min(5).max(200).required(),
        description: joi_1.default.string().max(2000),
        source: joi_1.default.string().max(100),
        metadata: joi_1.default.object(),
    }),
    acknowledge: joi_1.default.object({
        comment: joi_1.default.string().max(500),
    }),
    resolve: joi_1.default.object({
        resolution: joi_1.default.string().max(500).required(),
        category: joi_1.default.string().valid('false_positive', 'mitigated', 'resolved', 'escalated').required(),
    }),
};
/**
 * Blockchain schemas
 */
exports.blockchainSchemas = {
    registerEvidence: joi_1.default.object({
        evidenceId: joi_1.default.string().required(),
        metadata: joi_1.default.object({
            investigationId: joi_1.default.string(),
            evidenceType: joi_1.default.string(),
            classification: joi_1.default.string(),
        }),
    }),
    verifyEvidence: joi_1.default.object({
        evidenceId: joi_1.default.string().required(),
        hash: joi_1.default.string().required(),
    }),
    batchVerify: joi_1.default.object({
        evidenceIds: joi_1.default.array().items(joi_1.default.string()).min(1).max(100).required(),
    }),
    createPackage: joi_1.default.object({
        evidenceIds: joi_1.default.array().items(joi_1.default.string()).min(1).max(50).required(),
        packageName: joi_1.default.string().max(100).required(),
    }),
    generateHash: joi_1.default.object({
        data: joi_1.default.alternatives().try(joi_1.default.string(), joi_1.default.object()).required(),
        algorithm: joi_1.default.string().valid('sha256', 'sha512', 'md5').default('sha256'),
    }),
};
/**
 * Custody schemas
 */
exports.custodySchemas = {
    addEvent: joi_1.default.object({
        evidenceId: joi_1.default.string().required(),
        eventType: joi_1.default.string().valid('collected', 'transferred', 'analyzed', 'stored', 'accessed', 'exported', 'archived').required(),
        custodian: joi_1.default.string().max(100).required(),
        location: joi_1.default.string().max(200),
        notes: joi_1.default.string().max(500),
    }),
    transferCustody: joi_1.default.object({
        evidenceId: joi_1.default.string().required(),
        fromCustodian: joi_1.default.string().max(100).required(),
        toCustodian: joi_1.default.string().max(100).required(),
        reason: joi_1.default.string().max(500).required(),
    }),
    createTamperInvestigation: joi_1.default.object({
        evidenceId: joi_1.default.string().required(),
        detectedAt: joi_1.default.date().iso().required(),
        description: joi_1.default.string().max(1000).required(),
        severity: joi_1.default.string().valid('low', 'medium', 'high', 'critical').required(),
    }),
};
/**
 * Threat Intelligence schemas
 */
exports.threatSchemas = {
    createIOC: joi_1.default.object({
        type: joi_1.default.string().valid('ipv4', 'ipv6', 'domain', 'url', 'file_hash', 'file_path', 'email', 'mutex', 'registry').required(),
        value: joi_1.default.string().required(),
        source: joi_1.default.string().max(100).required(),
        confidence: joi_1.default.number().min(0).max(100).required(),
        severity: joi_1.default.string().valid('critical', 'high', 'medium', 'low', 'info').required(),
        classification: joi_1.default.string().valid('malware', 'apt', 'ransomware', 'trojan', 'botnet', 'phishing', 'suspicious', 'benign').required(),
        tags: joi_1.default.array().items(joi_1.default.string().max(50)).max(10),
        firstSeen: joi_1.default.date().iso(),
        lastSeen: joi_1.default.date().iso(),
        relatedMalware: joi_1.default.array().items(joi_1.default.string()).max(10),
    }),
    updateIOCStatus: joi_1.default.object({
        status: joi_1.default.string().valid('active', 'inactive', 'deprecated', 'false_positive').required(),
        notes: joi_1.default.string().max(500),
    }),
    createCorrelation: joi_1.default.object({
        investigationId: joi_1.default.string().required(),
        type: joi_1.default.string().valid('ioc_based', 'behavior_based', 'temporal', 'pattern_based').required(),
        relatedIndicators: joi_1.default.array().items(joi_1.default.string()).min(1).max(50).required(),
        confidence: joi_1.default.number().min(0).max(100).required(),
        severity: joi_1.default.string().valid('critical', 'high', 'medium', 'low').required(),
        description: joi_1.default.string().max(1000),
    }),
};
/**
 * Analytics schemas
 */
exports.analyticsSchemas = {
    analyzeBehavior: joi_1.default.object({
        evidenceId: joi_1.default.string().required(),
        telemetryId: joi_1.default.string(),
    }),
    detectAnomalies: joi_1.default.object({
        evidenceId: joi_1.default.string().required(),
        baseline: joi_1.default.string(),
        sensitivity: joi_1.default.string().valid('high', 'medium', 'low').default('medium'),
    }),
    analyzeBaseline: joi_1.default.object({
        investigationId: joi_1.default.string().required(),
        timeRange: joi_1.default.object({
            start: joi_1.default.date().iso(),
            end: joi_1.default.date().iso(),
        }),
    }),
    scoreRelationship: joi_1.default.object({
        targetInvestigationId: joi_1.default.string().required(),
        correlationFactors: joi_1.default.object({
            iocOverlap: joi_1.default.boolean().default(true),
            evidenceOverlap: joi_1.default.boolean().default(true),
            temporalProximity: joi_1.default.boolean().default(true),
            analystNotes: joi_1.default.boolean().default(false),
        }),
    }),
};
/**
 * Query parameter schemas
 */
exports.querySchemas = {
    pagination: joi_1.default.object({
        page: joi_1.default.number().min(1).default(1),
        limit: joi_1.default.number().min(1).max(100).default(20),
        sort: joi_1.default.string().max(50),
        order: joi_1.default.string().valid('asc', 'desc').default('desc'),
    }),
    dateRange: joi_1.default.object({
        startDate: joi_1.default.date().iso(),
        endDate: joi_1.default.date().iso(),
        dateField: joi_1.default.string().default('createdAt'),
    }),
    search: joi_1.default.object({
        q: joi_1.default.string().max(200),
        fields: joi_1.default.array().items(joi_1.default.string()).max(10),
    }),
};
/**
 * Generic validation function
 */
function validate(schema, data) {
    const { error, value } = schema.validate(data, {
        abortEarly: false,
        stripUnknown: true,
    });
    if (error) {
        return {
            valid: false,
            errors: error.details.map(d => d.message),
        };
    }
    return { valid: true, value: value };
}
//# sourceMappingURL=schemas.js.map