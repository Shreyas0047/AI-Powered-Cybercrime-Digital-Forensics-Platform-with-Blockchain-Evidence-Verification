/**
 * Input Validation Schemas
 * Enterprise-grade validation with Joi
 */

import Joi from 'joi';

/**
 * User schemas
 */
export const userSchemas = {
  register: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(12).max(128)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/)
      .required()
      .messages({
        'string.pattern.base': 'Password must contain uppercase, lowercase, number, and special character',
      }),
    firstName: Joi.string().max(50).required(),
    lastName: Joi.string().max(50).required(),
    role: Joi.string().valid('super_admin', 'admin', 'forensic_analyst', 'security_reviewer', 'sandbox_operator', 'auditor'),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  updateProfile: Joi.object({
    firstName: Joi.string().max(50),
    lastName: Joi.string().max(50),
    email: Joi.string().email(),
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(12).max(128)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/)
      .required(),
  }),
};

/**
 * Investigation schemas
 */
export const investigationSchemas = {
  create: Joi.object({
    title: Joi.string().min(3).max(200).required(),
    description: Joi.string().max(2000).required(),
    type: Joi.string().valid(
      'malware_analysis',
      'incident_response',
      'digital_forensics',
      'threat_hunting',
      'compliance_audit',
      'vulnerability_assessment'
    ).required(),
    priority: Joi.string().valid('critical', 'high', 'medium', 'low').default('medium'),
    tags: Joi.array().items(Joi.string().max(50)).max(10),
  }),

  update: Joi.object({
    title: Joi.string().min(3).max(200),
    description: Joi.string().max(2000),
    status: Joi.string().valid(
      'active',
      'investigating',
      'escalated',
      'resolved',
      'closed',
      'archived'
    ),
    priority: Joi.string().valid('critical', 'high', 'medium', 'low'),
    tags: Joi.array().items(Joi.string().max(50)).max(10),
  }),

  addNote: Joi.object({
    content: Joi.string().min(1).max(5000).required(),
    category: Joi.string().valid('observation', 'finding', 'hypothesis', 'action', 'general'),
  }),
};

/**
 * Evidence schemas
 */
export const evidenceSchemas = {
  upload: Joi.object({
    investigationId: Joi.string().required(),
    evidenceType: Joi.string().valid(
      'file',
      'memory_dump',
      'disk_image',
      'network_capture',
      'screenshot',
      'log_file',
      'registry_dump',
      'process_snapshot'
    ).required(),
    description: Joi.string().max(500).required(),
    tags: Joi.array().items(Joi.string().max(50)).max(10),
    classification: Joi.string().valid(
      'malicious',
      'suspicious',
      'benign',
      'unknown'
    ).default('unknown'),
  }),

  updateMetadata: Joi.object({
    description: Joi.string().max(500),
    tags: Joi.array().items(Joi.string().max(50)).max(10),
    classification: Joi.string().valid(
      'malicious',
      'suspicious',
      'benign',
      'unknown'
    ),
    analysisStatus: Joi.string().valid(
      'pending',
      'in_progress',
      'completed',
      'failed'
    ),
  }),
};

/**
 * Sandbox schemas
 */
export const sandboxSchemas = {
  createSession: Joi.object({
    vmName: Joi.string().required(),
    malwareFile: Joi.string().required(),
    timeout: Joi.number().min(30).max(300).default(120),
    enableNetwork: Joi.boolean().default(false),
    enableRegistry: Joi.boolean().default(true),
    enableFilesystem: Joi.boolean().default(true),
  }),

  updateSession: Joi.object({
    status: Joi.string().valid('running', 'paused', 'completed', 'failed', 'terminated'),
    notes: Joi.string().max(1000),
  }),
};

/**
 * Alert schemas
 */
export const alertSchemas = {
  create: Joi.object({
    type: Joi.string().valid(
      'threat_detected',
      'anomaly',
      'policy_violation',
      'system_error',
      'user_action'
    ).required(),
    severity: Joi.string().valid('critical', 'high', 'medium', 'low', 'info').required(),
    title: Joi.string().min(5).max(200).required(),
    description: Joi.string().max(2000),
    source: Joi.string().max(100),
    metadata: Joi.object(),
  }),

  acknowledge: Joi.object({
    comment: Joi.string().max(500),
  }),

  resolve: Joi.object({
    resolution: Joi.string().max(500).required(),
    category: Joi.string().valid(
      'false_positive',
      'mitigated',
      'resolved',
      'escalated'
    ).required(),
  }),
};

/**
 * Blockchain schemas
 */
export const blockchainSchemas = {
  registerEvidence: Joi.object({
    evidenceId: Joi.string().required(),
    metadata: Joi.object({
      investigationId: Joi.string(),
      evidenceType: Joi.string(),
      classification: Joi.string(),
    }),
  }),

  verifyEvidence: Joi.object({
    evidenceId: Joi.string().required(),
    hash: Joi.string().required(),
  }),

  batchVerify: Joi.object({
    evidenceIds: Joi.array().items(Joi.string()).min(1).max(100).required(),
  }),

  createPackage: Joi.object({
    evidenceIds: Joi.array().items(Joi.string()).min(1).max(50).required(),
    packageName: Joi.string().max(100).required(),
  }),

  generateHash: Joi.object({
    data: Joi.alternatives().try(
      Joi.string(),
      Joi.object()
    ).required(),
    algorithm: Joi.string().valid('sha256', 'sha512', 'md5').default('sha256'),
  }),
};

/**
 * Custody schemas
 */
export const custodySchemas = {
  addEvent: Joi.object({
    evidenceId: Joi.string().required(),
    eventType: Joi.string().valid(
      'collected',
      'transferred',
      'analyzed',
      'stored',
      'accessed',
      'exported',
      'archived'
    ).required(),
    custodian: Joi.string().max(100).required(),
    location: Joi.string().max(200),
    notes: Joi.string().max(500),
  }),

  transferCustody: Joi.object({
    evidenceId: Joi.string().required(),
    fromCustodian: Joi.string().max(100).required(),
    toCustodian: Joi.string().max(100).required(),
    reason: Joi.string().max(500).required(),
  }),

  createTamperInvestigation: Joi.object({
    evidenceId: Joi.string().required(),
    detectedAt: Joi.date().iso().required(),
    description: Joi.string().max(1000).required(),
    severity: Joi.string().valid('low', 'medium', 'high', 'critical').required(),
  }),
};

/**
 * Threat Intelligence schemas
 */
export const threatSchemas = {
  createIOC: Joi.object({
    type: Joi.string().valid(
      'ipv4',
      'ipv6',
      'domain',
      'url',
      'file_hash',
      'file_path',
      'email',
      'mutex',
      'registry'
    ).required(),
    value: Joi.string().required(),
    source: Joi.string().max(100).required(),
    confidence: Joi.number().min(0).max(100).required(),
    severity: Joi.string().valid('critical', 'high', 'medium', 'low', 'info').required(),
    classification: Joi.string().valid(
      'malware',
      'apt',
      'ransomware',
      'trojan',
      'botnet',
      'phishing',
      'suspicious',
      'benign'
    ).required(),
    tags: Joi.array().items(Joi.string().max(50)).max(10),
    firstSeen: Joi.date().iso(),
    lastSeen: Joi.date().iso(),
    relatedMalware: Joi.array().items(Joi.string()).max(10),
  }),

  updateIOCStatus: Joi.object({
    status: Joi.string().valid('active', 'inactive', 'deprecated', 'false_positive').required(),
    notes: Joi.string().max(500),
  }),

  createCorrelation: Joi.object({
    investigationId: Joi.string().required(),
    type: Joi.string().valid(
      'ioc_based',
      'behavior_based',
      'temporal',
      'pattern_based'
    ).required(),
    relatedIndicators: Joi.array().items(Joi.string()).min(1).max(50).required(),
    confidence: Joi.number().min(0).max(100).required(),
    severity: Joi.string().valid('critical', 'high', 'medium', 'low').required(),
    description: Joi.string().max(1000),
  }),
};

/**
 * Analytics schemas
 */
export const analyticsSchemas = {
  analyzeBehavior: Joi.object({
    evidenceId: Joi.string().required(),
    telemetryId: Joi.string(),
  }),

  detectAnomalies: Joi.object({
    evidenceId: Joi.string().required(),
    baseline: Joi.string(),
    sensitivity: Joi.string().valid('high', 'medium', 'low').default('medium'),
  }),

  analyzeBaseline: Joi.object({
    investigationId: Joi.string().required(),
    timeRange: Joi.object({
      start: Joi.date().iso(),
      end: Joi.date().iso(),
    }),
  }),

  scoreRelationship: Joi.object({
    targetInvestigationId: Joi.string().required(),
    correlationFactors: Joi.object({
      iocOverlap: Joi.boolean().default(true),
      evidenceOverlap: Joi.boolean().default(true),
      temporalProximity: Joi.boolean().default(true),
      analystNotes: Joi.boolean().default(false),
    }),
  }),
};

/**
 * Query parameter schemas
 */
export const querySchemas = {
  pagination: Joi.object({
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(20),
    sort: Joi.string().max(50),
    order: Joi.string().valid('asc', 'desc').default('desc'),
  }),

  dateRange: Joi.object({
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso(),
    dateField: Joi.string().default('createdAt'),
  }),

  search: Joi.object({
    q: Joi.string().max(200),
    fields: Joi.array().items(Joi.string()).max(10),
  }),
};

/**
 * Generic validation function
 */
export function validate<T>(
  schema: Joi.ObjectSchema,
  data: unknown
): { valid: boolean; errors?: string[]; value?: T } {
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

  return { valid: true, value: value as T };
}