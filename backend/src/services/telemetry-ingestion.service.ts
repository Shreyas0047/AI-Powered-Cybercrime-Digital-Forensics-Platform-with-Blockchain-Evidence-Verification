/**
 * Telemetry Ingestion Service
 * Handles forensic telemetry events from sandbox agents
 */

import { SandboxSession, Investigation, Alert, AuditLog, AlertType, AlertSeverity, AlertSource } from '../models';
import { NotFoundError, ValidationError } from '../middleware';
import { evidenceValidationService, TelemetryPayload } from './evidence-validation.service';
import { threatIntelligenceService } from './threat-intelligence.service';
import { IOCTypes, IOCSeverity } from '../models/threat.model';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger';

export interface IngestedTelemetry {
  sessionId: string;
  eventsReceived: number;
  eventsStored: number;
  anomalies: AnomalyResult[];
  warnings: string[];
}

export interface AnomalyResult {
  type: string;
  severity: string;
  description: string;
  eventTimestamp: string;
}

export interface ForensicEvent {
  timestamp: string;
  type: string;
  source: string;
  details: Record<string, any>;
}

export class TelemetryIngestionService {
  // Suspicious event patterns
  private readonly SUSPICIOUS_PATTERNS = [
    { type: 'process', pattern: /powershell.*-enc|cmd.*\/c/i, severity: 'high' },
    { type: 'process', pattern: /msiexec.*http|\.exe.*http/i, severity: 'medium' },
    { type: 'file', pattern: /\.tmp|\.temp|appdata.*temp/i, severity: 'low' },
    { type: 'registry', pattern: /run|autorun|disabled/i, severity: 'high' },
    { type: 'network', pattern: /.*\.tk|.*\.ml|.*\.xyz/i, severity: 'high' },
    { type: 'network', pattern: /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/, severity: 'medium' },
  ];

  // Anomaly detection thresholds
  private readonly THRESHOLDS = {
    fileCreate: { warning: 100, critical: 500 },
    registryWrite: { warning: 50, critical: 200 },
    networkConnections: { warning: 20, critical: 100 },
    processSpawn: { warning: 30, critical: 100 },
  };

  /**
   * Ingest forensic telemetry events
   */
  async ingestTelemetry(
    payload: TelemetryPayload,
    uploadedBy?: string
  ): Promise<IngestedTelemetry> {
    // Validate telemetry payload
    const validation = evidenceValidationService.validateTelemetry(payload);

    if (!validation.valid) {
      throw new ValidationError(`Invalid telemetry: ${validation.errors.join(', ')}`, validation.errors.map(e => ({ field: 'telemetry', message: e })));
    }

    // Verify session exists
    const session = await SandboxSession.findOne({ sessionId: payload.sessionId });
    if (!session) {
      throw new NotFoundError('Sandbox session');
    }

    // Process events
    const eventsReceived = payload.events.length;
    let eventsStored = 0;
    const anomalies: AnomalyResult[] = [];

    // Aggregate event counts for anomaly detection
    const eventCounts = this.aggregateEventCounts(payload.events);

    // Check for anomalies
    const anomalyResults = this.detectAnomalies(eventCounts);
    anomalies.push(...anomalyResults);

    // Process each event
    for (const event of payload.events) {
      await this.processEvent(session, event, uploadedBy);
      eventsStored++;
    }

    // Update session with event counts
    session.eventsCollected += eventsReceived;

    // Store telemetry in session
    const existingTelemetry = (session as any).telemetry || [];
    (session as any).telemetry = [
      ...existingTelemetry.slice(-100), // Keep last 100 batches
      {
        timestamp: new Date(),
        eventCount: eventsReceived,
        eventCounts,
        anomalies: anomalyResults.length,
      },
    ];

    await session.save();

    // Log to audit
    await AuditLog.create({
      userId: uploadedBy || 'system',
      action: 'TELEMETRY_INGESTED',
      resourceType: 'sandbox_session',
      resourceId: session._id.toString(),
      details: {
        sessionId: payload.sessionId,
        eventsReceived,
        eventsStored,
        anomalyCount: anomalyResults.length,
      },
      ipAddress: 'system',
    });

    // Trigger alerts for critical anomalies
    if (anomalyResults.some(a => a.severity === 'critical')) {
      await this.createAnomalyAlerts(session, anomalyResults.filter(a => a.severity === 'critical'));
    }

    return {
      sessionId: payload.sessionId,
      eventsReceived,
      eventsStored,
      anomalies: anomalyResults.slice(0, 10), // Limit to 10 anomalies
      warnings: validation.warnings,
    };
  }

  /**
   * Ingest single event stream (for real-time streaming)
   */
  async ingestEventStream(
    sessionId: string,
    event: ForensicEvent,
    uploadedBy?: string
  ): Promise<{ eventId: string; stored: boolean }> {
    // Verify session exists
    const session = await SandboxSession.findOne({ sessionId });
    if (!session) {
      throw new NotFoundError('Sandbox session');
    }

    // Validate event
    if (!event.timestamp || !event.type || !event.source) {
      throw new ValidationError('Invalid event: missing required fields', [{ field: 'event', message: 'Missing required fields: timestamp, type, source' }]);
    }

    // Generate event ID
    const eventId = uuidv4();

    // Store event in session (in real implementation, use separate collection)
    const events = (session as any).recentEvents || [];
    events.push({
      id: eventId,
      ...event,
      receivedAt: new Date(),
    });

    // Keep only last 1000 events in memory
    (session as any).recentEvents = events.slice(-1000);
    session.eventsCollected += 1;
    await session.save();

    return { eventId, stored: true };
  }

  /**
   * Get telemetry summary for session
   */
  async getTelemetrySummary(sessionId: string): Promise<any> {
    const session = await SandboxSession.findOne({ sessionId });
    if (!session) {
      throw new NotFoundError('Sandbox session');
    }

    const recentEvents = (session as any).recentEvents || [];
    const telemetry = (session as any).telemetry || [];

    // Aggregate event counts
    const eventCounts = this.aggregateEventCounts(
      recentEvents.map((e: any) => ({ type: e.type, source: e.source }))
    );

    // Calculate timeline
    const timeline = this.generateTimeline(recentEvents);

    return {
      sessionId,
      totalEvents: session.eventsCollected,
      eventCounts,
      timeline,
      telemetryHistory: telemetry.slice(-10),
      lastUpdated: session.syncedAt,
    };
  }

  /**
   * Process individual event
   */
  private async processEvent(
    session: any,
    event: ForensicEvent,
    uploadedBy?: string
  ): Promise<void> {
    // Check for suspicious patterns
    const suspiciousCheck = this.checkSuspiciousPattern(event);
    if (suspiciousCheck) {
      // Log suspicious event for review
      (session as any).suspiciousEvents = (session as any).suspiciousEvents || [];
      (session as any).suspiciousEvents.push({
        ...event,
        flaggedAt: new Date(),
        reason: suspiciousCheck,
      });
    }

    // Extract and store IOCs
    if (event.details?.ioc) {
      const iocs = (session as any).extractedIOCs || [];
      (session as any).extractedIOCs = [...iocs, ...event.details.ioc].slice(-100);

      // Also persist to the threat intelligence IOC collection so they appear in Threat Intel page
      const iocList = Array.isArray(event.details.ioc) ? event.details.ioc : [event.details.ioc];
      for (const ioc of iocList) {
        try {
          const mappedType = this.mapIocType(ioc.type || ioc.iocType || '');
          if (!mappedType || !ioc.value) continue;

          await threatIntelligenceService.createIOC(
            {
              type: mappedType,
              value: String(ioc.value),
              severity: this.mapIocSeverity(ioc.severity),
              category: 'sandbox',
              description: ioc.context || `Extracted from sandbox session ${session.sessionId}`,
              source: 'sandbox',
              confidence: 75,
              linkedEvidence: [],
              linkedInvestigations: session.investigationId ? [session.investigationId.toString()] : [],
            },
            uploadedBy || 'system',
          );
        } catch (err: any) {
          if (err?.code !== 11000) {
            logger.debug(`[Telemetry] Skipped IOC persistence: ${err?.message || 'unknown'}`);
          }
        }
      }
    }
  }

  private mapIocType(type: string): IOCTypes | null {
    const t = (type || '').toLowerCase();
    switch (t) {
      case 'url': return IOCTypes.URL;
      case 'domain': return IOCTypes.DOMAIN;
      case 'ip':
      case 'ipv4':
      case 'ipv6':
      case 'ip_address':
        return IOCTypes.IP_ADDRESS;
      case 'md5':
      case 'sha1':
      case 'sha256':
      case 'hash':
      case 'file_hash':
        return IOCTypes.FILE_HASH;
      case 'process':
      case 'process_name':
        return IOCTypes.PROCESS_NAME;
      case 'registry':
      case 'registry_key':
        return IOCTypes.REGISTRY_KEY;
      case 'file':
      case 'file_path':
        return IOCTypes.FILE_PATH;
      case 'command':
      case 'command_line':
        return IOCTypes.COMMAND_LINE;
      case 'email':
        return IOCTypes.EMAIL;
      default:
        return null;
    }
  }

  private mapIocSeverity(severity?: string): IOCSeverity {
    const s = (severity || '').toLowerCase();
    if (s === 'critical') return IOCSeverity.CRITICAL;
    if (s === 'high') return IOCSeverity.HIGH;
    if (s === 'low') return IOCSeverity.LOW;
    if (s === 'info') return IOCSeverity.INFO;
    return IOCSeverity.MEDIUM;
  }

  /**
   * Check for suspicious patterns in event
   */
  private checkSuspiciousPattern(event: ForensicEvent): string | null {
    const type = event.type;
    const detailsStr = JSON.stringify(event.details);

    for (const pattern of this.SUSPICIOUS_PATTERNS) {
      if (type === pattern.type && pattern.pattern.test(detailsStr)) {
        return `Suspicious pattern detected: ${pattern.pattern.source}`;
      }
    }

    return null;
  }

  /**
   * Aggregate event counts by type
   */
  private aggregateEventCounts(events: Array<{ type?: string; source?: string }>): Record<string, number> {
    const counts: Record<string, number> = {
      process: 0,
      file: 0,
      registry: 0,
      network: 0,
      module: 0,
      memory: 0,
      behavior: 0,
    };

    for (const event of events) {
      const type = event.type || 'unknown';
      counts[type] = (counts[type] || 0) + 1;
    }

    return counts;
  }

  /**
   * Detect anomalies in event counts
   */
  private detectAnomalies(eventCounts: Record<string, number>): AnomalyResult[] {
    const anomalies: AnomalyResult[] = [];

    // Check file creation threshold
    if ((eventCounts.file || 0) > this.THRESHOLDS.fileCreate.critical) {
      anomalies.push({
        type: 'high_file_activity',
        severity: 'critical',
        description: `Excessive file operations detected: ${eventCounts.file} file events`,
        eventTimestamp: new Date().toISOString(),
      });
    } else if ((eventCounts.file || 0) > this.THRESHOLDS.fileCreate.warning) {
      anomalies.push({
        type: 'elevated_file_activity',
        severity: 'medium',
        description: `Elevated file operations: ${eventCounts.file} file events`,
        eventTimestamp: new Date().toISOString(),
      });
    }

    // Check registry threshold
    if ((eventCounts.registry || 0) > this.THRESHOLDS.registryWrite.critical) {
      anomalies.push({
        type: 'high_registry_activity',
        severity: 'critical',
        description: `Excessive registry modifications: ${eventCounts.registry} events`,
        eventTimestamp: new Date().toISOString(),
      });
    }

    // Check network threshold
    if ((eventCounts.network || 0) > this.THRESHOLDS.networkConnections.critical) {
      anomalies.push({
        type: 'high_network_activity',
        severity: 'critical',
        description: `Excessive network connections: ${eventCounts.network} connections`,
        eventTimestamp: new Date().toISOString(),
      });
    }

    // Check process spawning
    if ((eventCounts.process || 0) > this.THRESHOLDS.processSpawn.critical) {
      anomalies.push({
        type: 'process_injection_suspected',
        severity: 'critical',
        description: `Suspicious process spawning: ${eventCounts.process} processes`,
        eventTimestamp: new Date().toISOString(),
      });
    }

    return anomalies;
  }

  /**
   * Generate timeline from events
   */
  private generateTimeline(events: Array<{ timestamp: string; type: string; details: Record<string, any> }>): Array<{
    timestamp: string;
    event: string;
    count: number;
  }> {
    const timeline: Record<string, number> = {};

    for (const event of events) {
      const hour = new Date(event.timestamp).toISOString().slice(0, 13);
      timeline[hour] = (timeline[hour] || 0) + 1;
    }

    return Object.entries(timeline)
      .map(([timestamp, count]) => ({ timestamp, event: 'events', count }))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  /**
   * Create alerts from detected anomalies
   */
  private async createAnomalyAlerts(
    session: any,
    anomalies: AnomalyResult[]
  ): Promise<void> {
    const alertId = `ALT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const severity = anomalies.some(a => a.severity === 'critical')
      ? AlertSeverity.CRITICAL
      : AlertSeverity.HIGH;

    await Alert.create({
      alertId,
      title: `Sandbox Anomaly Detected: ${anomalies.length} critical findings`,
      description: anomalies.map(a => a.description).join('; '),
      type: AlertType.SANDBOX,
      severity,
      source: AlertSource.SANDBOX,
      status: 'new',
      relatedSandboxSessionId: session._id,
      tags: ['anomaly', 'automated', 'sandbox'],
      metadata: {
        sessionId: session.sessionId,
        anomalyCount: anomalies.length,
        anomalies: anomalies.map(a => a.type),
        autoGenerated: true,
      },
    });
  }
}

export const telemetryIngestionService = new TelemetryIngestionService();
export default telemetryIngestionService;