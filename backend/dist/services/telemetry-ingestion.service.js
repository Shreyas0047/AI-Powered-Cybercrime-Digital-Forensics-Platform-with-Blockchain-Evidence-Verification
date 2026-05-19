"use strict";
/**
 * Telemetry Ingestion Service
 * Handles forensic telemetry events from sandbox agents
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.telemetryIngestionService = exports.TelemetryIngestionService = void 0;
const models_1 = require("../models");
const middleware_1 = require("../middleware");
const evidence_validation_service_1 = require("./evidence-validation.service");
const uuid_1 = require("uuid");
class TelemetryIngestionService {
    // Suspicious event patterns
    SUSPICIOUS_PATTERNS = [
        { type: 'process', pattern: /powershell.*-enc|cmd.*\/c/i, severity: 'high' },
        { type: 'process', pattern: /msiexec.*http|\.exe.*http/i, severity: 'medium' },
        { type: 'file', pattern: /\.tmp|\.temp|appdata.*temp/i, severity: 'low' },
        { type: 'registry', pattern: /run|autorun|disabled/i, severity: 'high' },
        { type: 'network', pattern: /.*\.tk|.*\.ml|.*\.xyz/i, severity: 'high' },
        { type: 'network', pattern: /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/, severity: 'medium' },
    ];
    // Anomaly detection thresholds
    THRESHOLDS = {
        fileCreate: { warning: 100, critical: 500 },
        registryWrite: { warning: 50, critical: 200 },
        networkConnections: { warning: 20, critical: 100 },
        processSpawn: { warning: 30, critical: 100 },
    };
    /**
     * Ingest forensic telemetry events
     */
    async ingestTelemetry(payload, uploadedBy) {
        // Validate telemetry payload
        const validation = evidence_validation_service_1.evidenceValidationService.validateTelemetry(payload);
        if (!validation.valid) {
            throw new middleware_1.ValidationError(`Invalid telemetry: ${validation.errors.join(', ')}`, validation.errors.map(e => ({ field: 'telemetry', message: e })));
        }
        // Verify session exists
        const session = await models_1.SandboxSession.findOne({ sessionId: payload.sessionId });
        if (!session) {
            throw new middleware_1.NotFoundError('Sandbox session');
        }
        // Process events
        const eventsReceived = payload.events.length;
        let eventsStored = 0;
        const anomalies = [];
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
        const existingTelemetry = session.telemetry || [];
        session.telemetry = [
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
        await models_1.AuditLog.create({
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
    async ingestEventStream(sessionId, event, uploadedBy) {
        // Verify session exists
        const session = await models_1.SandboxSession.findOne({ sessionId });
        if (!session) {
            throw new middleware_1.NotFoundError('Sandbox session');
        }
        // Validate event
        if (!event.timestamp || !event.type || !event.source) {
            throw new middleware_1.ValidationError('Invalid event: missing required fields', [{ field: 'event', message: 'Missing required fields: timestamp, type, source' }]);
        }
        // Generate event ID
        const eventId = (0, uuid_1.v4)();
        // Store event in session (in real implementation, use separate collection)
        const events = session.recentEvents || [];
        events.push({
            id: eventId,
            ...event,
            receivedAt: new Date(),
        });
        // Keep only last 1000 events in memory
        session.recentEvents = events.slice(-1000);
        session.eventsCollected += 1;
        await session.save();
        return { eventId, stored: true };
    }
    /**
     * Get telemetry summary for session
     */
    async getTelemetrySummary(sessionId) {
        const session = await models_1.SandboxSession.findOne({ sessionId });
        if (!session) {
            throw new middleware_1.NotFoundError('Sandbox session');
        }
        const recentEvents = session.recentEvents || [];
        const telemetry = session.telemetry || [];
        // Aggregate event counts
        const eventCounts = this.aggregateEventCounts(recentEvents.map((e) => ({ type: e.type, source: e.source })));
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
    async processEvent(session, event, uploadedBy) {
        // Check for suspicious patterns
        const suspiciousCheck = this.checkSuspiciousPattern(event);
        if (suspiciousCheck) {
            // Log suspicious event for review
            session.suspiciousEvents = session.suspiciousEvents || [];
            session.suspiciousEvents.push({
                ...event,
                flaggedAt: new Date(),
                reason: suspiciousCheck,
            });
        }
        // Extract and store IOCs
        if (event.details?.ioc) {
            const iocs = session.extractedIOCs || [];
            session.extractedIOCs = [...iocs, ...event.details.ioc].slice(-100);
        }
    }
    /**
     * Check for suspicious patterns in event
     */
    checkSuspiciousPattern(event) {
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
    aggregateEventCounts(events) {
        const counts = {
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
    detectAnomalies(eventCounts) {
        const anomalies = [];
        // Check file creation threshold
        if ((eventCounts.file || 0) > this.THRESHOLDS.fileCreate.critical) {
            anomalies.push({
                type: 'high_file_activity',
                severity: 'critical',
                description: `Excessive file operations detected: ${eventCounts.file} file events`,
                eventTimestamp: new Date().toISOString(),
            });
        }
        else if ((eventCounts.file || 0) > this.THRESHOLDS.fileCreate.warning) {
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
    generateTimeline(events) {
        const timeline = {};
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
    async createAnomalyAlerts(session, anomalies) {
        const alertId = `ALT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        const severity = anomalies.some(a => a.severity === 'critical')
            ? models_1.AlertSeverity.CRITICAL
            : models_1.AlertSeverity.HIGH;
        await models_1.Alert.create({
            alertId,
            title: `Sandbox Anomaly Detected: ${anomalies.length} critical findings`,
            description: anomalies.map(a => a.description).join('; '),
            type: models_1.AlertType.SANDBOX,
            severity,
            source: models_1.AlertSource.SANDBOX,
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
exports.TelemetryIngestionService = TelemetryIngestionService;
exports.telemetryIngestionService = new TelemetryIngestionService();
exports.default = exports.telemetryIngestionService;
//# sourceMappingURL=telemetry-ingestion.service.js.map