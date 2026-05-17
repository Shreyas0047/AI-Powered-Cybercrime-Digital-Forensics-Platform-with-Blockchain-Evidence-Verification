/**
 * Evidence Validation Service
 * Validates evidence uploads and forensic payloads
 */

import { EvidenceType } from '../types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  metadata?: Record<string, any>;
}

export interface ForensicReportPayload {
  investigationId?: string;
  sessionId?: string;
  reportType: string;
  reportData: Record<string, any>;
  timestamp?: string;
}

export interface TelemetryPayload {
  sessionId: string;
  events: Array<{
    timestamp: string;
    type: string;
    source: string;
    details: Record<string, any>;
  }>;
}

export class EvidenceValidationService {
  // Allowed MIME types for evidence uploads
  private readonly ALLOWED_MIME_TYPES: Map<string, string[]> = new Map([
    ['application/json', ['.json', '.report']],
    ['application/zip', ['.zip', '.7z', '.tar', '.gz']],
    ['application/pdf', ['.pdf']],
    ['text/plain', ['.log', '.txt', '.evtx']],
    ['image/png', ['.png']],
    ['image/jpeg', ['.jpg', '.jpeg']],
    ['application/octet-stream', ['.bin', '.exe', '.dll', '.sys']],
  ]);

  // Maximum file sizes by type (in bytes)
  private readonly MAX_FILE_SIZES: Map<string, number> = new Map([
    ['application/json', 10 * 1024 * 1024], // 10MB
    ['application/zip', 500 * 1024 * 1024], // 500MB
    ['application/pdf', 50 * 1024 * 1024], // 50MB
    ['text/plain', 20 * 1024 * 1024], // 20MB
    ['image/png', 10 * 1024 * 1024], // 10MB
    ['image/jpeg', 10 * 1024 * 1024], // 10MB
    ['application/octet-stream', 100 * 1024 * 1024], // 100MB
  ]);

  // Suspicious file signatures
  private readonly SUSPICIOUS_SIGNATURES: string[] = [
    '4d5a', // PE executable (may be valid malware sample)
    '504b', // ZIP/JAR
    '377a', // 7z archive
    '1f8b', // GZIP
  ];

  /**
   * Validate file upload
   */
  validateFileUpload(file: {
    mimetype: string;
    originalname: string;
    size: number;
  }): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let metadata: Record<string, any> = {};

    // Check MIME type
    if (!this.ALLOWED_MIME_TYPES.has(file.mimetype)) {
      errors.push(`Unsupported MIME type: ${file.mimetype}`);
    }

    // Check file extension
    const ext = '.' + file.originalname.split('.').pop()?.toLowerCase();
    const allowedExts = this.ALLOWED_MIME_TYPES.get(file.mimetype) || [];

    if (allowedExts.length > 0 && !allowedExts.includes(ext)) {
      warnings.push(`Unusual file extension for ${file.mimetype}: ${ext}`);
    }

    // Check file size
    const maxSize = this.MAX_FILE_SIZES.get(file.mimetype) || this.MAX_FILE_SIZES.get('application/octet-stream')!;
    if (file.size > maxSize) {
      errors.push(`File size exceeds maximum allowed: ${file.size} > ${maxSize}`);
    }

    // Check for suspicious patterns in filename
    if (this.hasSuspiciousFilename(file.originalname)) {
      warnings.push('Filename contains suspicious patterns');
    }

    // Add metadata
    if (!errors.length) {
      metadata = {
        mimeType: file.mimetype,
        extension: ext,
        sizeBytes: file.size,
        category: this.categorizeByMimeType(file.mimetype),
      };
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      metadata,
    };
  }

  /**
   * Validate forensic report JSON
   */
  validateForensicReport(payload: ForensicReportPayload): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const metadata: Record<string, any> = {};

    // Required fields
    if (!payload.reportType) {
      errors.push('Missing required field: reportType');
    }

    if (!payload.reportData) {
      errors.push('Missing required field: reportData');
    } else if (typeof payload.reportData !== 'object') {
      errors.push('reportData must be an object');
    }

    // Validate report type
    const validReportTypes = [
      'execution_summary',
      'process_analysis',
      'file_analysis',
      'registry_analysis',
      'network_analysis',
      'behavioral_analysis',
      'threat_classification',
      'incident_report',
    ];

    if (payload.reportType && !validReportTypes.includes(payload.reportType)) {
      warnings.push(`Unusual report type: ${payload.reportType}`);
    }

    // Validate timestamp if present
    if (payload.timestamp) {
      const timestamp = new Date(payload.timestamp);
      if (isNaN(timestamp.getTime())) {
        errors.push('Invalid timestamp format');
      } else {
        metadata.timestamp = timestamp;

        // Check for future timestamps
        if (timestamp > new Date()) {
          warnings.push('Timestamp is in the future');
        }

        // Check for very old timestamps (> 1 year)
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        if (timestamp < oneYearAgo) {
          warnings.push('Timestamp is more than 1 year old');
        }
      }
    }

    // Analyze report data structure
    if (payload.reportData) {
      const dataAnalysis = this.analyzeReportData(payload.reportData);
      metadata.dataAnalysis = dataAnalysis;

      if (dataAnalysis.severity === 'critical' && !payload.investigationId) {
        warnings.push('Critical report without investigation ID may not be linked');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      metadata,
    };
  }

  /**
   * Validate telemetry payload
   */
  validateTelemetry(payload: TelemetryPayload): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const metadata: Record<string, any> = {};

    // Required fields
    if (!payload.sessionId) {
      errors.push('Missing required field: sessionId');
    }

    if (!payload.events || !Array.isArray(payload.events)) {
      errors.push('Missing or invalid events array');
      return { valid: false, errors, warnings };
    }

    // Validate each event
    const validEventTypes = [
      'process',
      'file',
      'registry',
      'network',
      'module',
      'memory',
      'behavior',
      'anomaly',
    ];

    let eventCount = 0;
    let criticalEvents = 0;

    for (let i = 0; i < payload.events.length; i++) {
      const event = payload.events[i];

      // Check required event fields
      if (!event.timestamp) {
        errors.push(`Event ${i}: missing timestamp`);
      }
      if (!event.type) {
        errors.push(`Event ${i}: missing type`);
      }
      if (!event.source) {
        errors.push(`Event ${i}: missing source`);
      }

      // Validate event type
      if (event.type && !validEventTypes.includes(event.type)) {
        warnings.push(`Event ${i}: unusual type "${event.type}"`);
      }

      // Check for suspicious patterns
      if (this.isSuspiciousEvent(event)) {
        criticalEvents++;
      }

      eventCount++;
    }

    // Add metadata
    metadata.eventCount = eventCount;
    metadata.criticalEvents = criticalEvents;
    metadata.sessionId = payload.sessionId;

    // Warn if too many events (potential DoS)
    if (eventCount > 10000) {
      warnings.push('Very large event batch (> 10000 events)');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      metadata,
    };
  }

  /**
   * Validate evidence metadata
   */
  validateEvidenceMetadata(metadata: {
    investigationId?: string;
    type?: string;
    name?: string;
    tags?: string[];
  }): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate type if provided
    if (metadata.type) {
      const validTypes = Object.values(EvidenceType);
      if (!validTypes.includes(metadata.type as EvidenceType)) {
        errors.push(`Invalid evidence type: ${metadata.type}`);
      }
    }

    // Check name for suspicious patterns
    if (metadata.name) {
      if (metadata.name.length > 500) {
        errors.push('Evidence name too long (max 500 chars)');
      }
      if (this.hasSuspiciousFilename(metadata.name)) {
        warnings.push('Evidence name contains suspicious patterns');
      }
    }

    // Validate tags
    if (metadata.tags && metadata.tags.length > 20) {
      warnings.push('Too many tags (max 20)');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Check for suspicious filename patterns
   */
  private hasSuspiciousFilename(filename: string): boolean {
    const suspiciousPatterns = [
      /\b(malware|virus|trojan|backdoor|dropper|keylog)\b/i,
      /\b(crypto|miner|coin|bitcoin)\b/i,
      /\b(payload|shellcode|exploit)\b/i,
      /\.\w{1,4}$/, // Very short extensions
      /^[a-z0-9]{32,}\./, // Long random-looking names
    ];

    return suspiciousPatterns.some(pattern => pattern.test(filename));
  }

  /**
   * Categorize file by MIME type
   */
  private categorizeByMimeType(mimeType: string): string {
    if (mimeType.includes('json')) return 'forensic_data';
    if (mimeType.includes('zip') || mimeType.includes('tar') || mimeType.includes('7z')) return 'archive';
    if (mimeType.includes('pdf')) return 'document';
    if (mimeType.includes('image')) return 'screenshot';
    if (mimeType.includes('text')) return 'log';
    return 'artifact';
  }

  /**
   * Analyze report data structure
   */
  private analyzeReportData(data: Record<string, any>): {
    hasFindings: boolean;
    hasIOC: boolean;
    hasMITRE: boolean;
    severity: string;
    eventCount: number;
  } {
    const analysis = {
      hasFindings: Array.isArray(data.findings) && data.findings.length > 0,
      hasIOC: Array.isArray(data.iocIndicators) && data.iocIndicators.length > 0,
      hasMITRE: Array.isArray(data.mitreTechniques) && data.mitreTechniques.length > 0,
      severity: 'informational',
      eventCount: 0,
    };

    // Determine severity
    if (data.severity === 'critical' || data.riskScore >= 80) {
      analysis.severity = 'critical';
    } else if (data.severity === 'high' || data.riskScore >= 60) {
      analysis.severity = 'high';
    } else if (data.severity === 'medium' || data.riskScore >= 40) {
      analysis.severity = 'medium';
    }

    // Count events
    if (data.events) {
      analysis.eventCount = Array.isArray(data.events) ? data.events.length : 0;
    }

    return analysis;
  }

  /**
   * Check if event is suspicious
   */
  private isSuspiciousEvent(event: { type: string; details: Record<string, any> }): boolean {
    const suspiciousIndicators = [
      event.details?.suspicious === true,
      event.details?.malicious === true,
      event.details?.threatScore > 70,
      event.type === 'process' && event.details?.commandLine?.includes('powershell.*-enc'),
      event.type === 'network' && event.details?.destination?.includes(['.', '/']),
    ];

    return suspiciousIndicators.some(Boolean);
  }
}

export const evidenceValidationService = new EvidenceValidationService();
export default evidenceValidationService;