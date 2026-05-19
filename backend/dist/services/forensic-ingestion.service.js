"use strict";
/**
 * Forensic Report Ingestion Service
 * Handles forensic report uploads from sandbox agents
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.forensicIngestionService = exports.ForensicIngestionService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const models_1 = require("../models");
const middleware_1 = require("../middleware");
const evidence_validation_service_1 = require("./evidence-validation.service");
const config_1 = require("../config");
const uuid_1 = require("uuid");
class ForensicIngestionService {
    /**
     * Ingest forensic report from sandbox
     */
    async ingestForensicReport(payload, file) {
        // Validate the report payload
        const validation = evidence_validation_service_1.evidenceValidationService.validateForensicReport({
            investigationId: payload.investigationId,
            sessionId: payload.sessionId,
            reportType: payload.reportType,
            reportData: payload.reportData,
        });
        if (!validation.valid) {
            throw new middleware_1.ValidationError(`Invalid forensic report: ${validation.errors.join(', ')}`, validation.errors.map(e => ({ field: 'report', message: e })));
        }
        // Generate report ID
        const reportId = this.generateReportId();
        // Resolve investigation
        let investigation = null;
        if (payload.investigationId) {
            investigation = await models_1.Investigation.findById(payload.investigationId);
        }
        else if (payload.reportData.caseNumber) {
            investigation = await models_1.Investigation.findOne({ caseNumber: payload.reportData.caseNumber });
        }
        // Create report record
        const report = await models_1.Report.create({
            reportId,
            investigationId: investigation?._id || undefined,
            investigationCaseNumber: investigation?.caseNumber,
            title: payload.reportData.title || `Forensic Report - ${payload.reportType}`,
            summary: payload.reportData.summary || 'Automated forensic analysis report',
            type: this.mapReportType(payload.reportType),
            status: 'draft',
            severity: this.mapSeverity(payload.reportData.severity || payload.reportData.riskScore),
            findings: payload.reportData.findings?.map((f, idx) => ({
                id: (0, uuid_1.v4)(),
                category: f.category,
                severity: f.severity,
                title: f.title,
                description: f.description,
                timestamp: new Date(),
                indicators: f.indicators || [],
                evidence: [],
                recommendations: f.recommendations || [],
                mitreTactics: f.mitreTactics,
                mitreTechniques: f.mitreTechniques,
            })),
            iocIndicators: payload.reportData.iocIndicators?.map(ioc => ({
                type: ioc.type,
                value: ioc.value,
                description: ioc.description,
                context: 'imported_from_sandbox',
            })),
            timeline: payload.reportData.timeline?.map(entry => ({
                timestamp: new Date(entry.timestamp),
                event: entry.event,
                description: entry.description,
                source: 'sandbox_sync',
            })),
            aiAnalysisCompleted: !!payload.reportData.aiAnalysis,
            aiAnalysis: payload.reportData.aiAnalysis ? {
                summary: payload.reportData.aiAnalysis.summary,
                threatClassification: payload.reportData.aiAnalysis.threatClassification,
                behavioralIndicators: [],
                recommendations: payload.reportData.aiAnalysis.recommendations || [],
                similarThreats: [],
                riskScore: payload.reportData.riskScore || 0,
            } : undefined,
            generatedAt: new Date(),
            generatedBy: payload.uploadedBy || 'system',
            tags: this.generateTags(payload.reportData, payload.reportType),
            // Link to sandbox session if provided
            sandboxSessionId: payload.sessionId
                ? (await this.findOrCreateSession(payload.sessionId))?._id
                : undefined,
            customFields: {
                originalReportType: payload.reportType,
                ingestedAt: new Date(),
                validationWarnings: validation.warnings,
                metadata: payload.reportData.metadata,
            },
        });
        // Update investigation if linked
        if (investigation) {
            investigation.reportIds.push(report._id);
            investigation.reportCount = (investigation.reportCount || 0) + 1;
            // Add timeline entry
            investigation.timeline.push({
                timestamp: new Date(),
                action: 'report_generated',
                userId: payload.uploadedBy || 'system',
                userName: 'System',
                details: `Forensic report "${report.title}" generated from sandbox`,
            });
            await investigation.save();
        }
        // Handle file attachment if provided
        if (file) {
            await this.attachFileToReport(report._id.toString(), file, payload.uploadedBy);
        }
        return {
            report,
            metadata: {
                reportId,
                linkedInvestigation: investigation?._id,
                linkedSession: payload.sessionId,
                validationWarnings: validation.warnings,
                reportType: payload.reportType,
            },
            warnings: validation.warnings,
        };
    }
    /**
     * Ingest execution summary from sandbox
     */
    async ingestExecutionSummary(sessionId, summary, uploadedBy) {
        // Update sandbox session with execution summary
        const { SandboxSession } = await Promise.resolve().then(() => __importStar(require('../models')));
        const session = await SandboxSession.findOne({ sessionId });
        if (!session) {
            throw new middleware_1.NotFoundError('Sandbox session');
        }
        // Store execution summary
        const summaryData = {
            simulatorId: summary.simulatorId,
            simulatorName: summary.simulatorName,
            startTime: new Date(summary.startTime),
            endTime: new Date(summary.endTime),
            exitCode: summary.exitCode,
            duration: summary.duration,
            eventsCollected: summary.eventsCollected,
            findings: summary.findings,
            iocIndicators: summary.iocIndicators || [],
            artifacts: summary.artifacts || [],
            syncedAt: new Date(),
        };
        // Update session
        session.executionSummary = summaryData;
        session.syncedAt = new Date();
        await session.save();
        // Auto-create report for high-severity findings
        const highSeverityFindings = summary.findings?.filter(f => f.severity === 'critical' || f.severity === 'high');
        if (highSeverityFindings && highSeverityFindings.length > 0) {
            await this.createAlertFromFindings(session, highSeverityFindings);
        }
        return {
            sessionId,
            summaryIngested: true,
            findingsCount: summary.findings?.length || 0,
            iocCount: summary.iocIndicators?.length || 0,
        };
    }
    /**
     * Attach file to existing report
     */
    async attachFileToReport(reportId, file, uploadedBy) {
        const report = await models_1.Report.findById(reportId);
        if (!report) {
            throw new middleware_1.NotFoundError('Report');
        }
        // Generate safe filename
        const fileId = (0, uuid_1.v4)();
        const ext = path_1.default.extname(file.originalname);
        const safeFilename = `${reportId}-${fileId}${ext}`;
        const destPath = path_1.default.join(config_1.config.evidence.reportsPath, safeFilename);
        // Move file
        fs_1.default.renameSync(file.path, destPath);
        // Add to export formats
        report.exportFormats.push({
            format: ext.replace('.', '').toUpperCase(),
            path: destPath,
            generatedAt: new Date(),
        });
        await report.save();
    }
    /**
     * Generate report ID
     */
    generateReportId() {
        const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const random = (0, uuid_1.v4)().slice(0, 8).toUpperCase();
        return `FR-${timestamp}-${random}`;
    }
    /**
     * Map report type to enum
     */
    mapReportType(reportType) {
        const typeMap = {
            execution_summary: models_1.ReportType.SANDBOX,
            process_analysis: models_1.ReportType.TECHNICAL,
            file_analysis: models_1.ReportType.EVIDENCE,
            registry_analysis: models_1.ReportType.TECHNICAL,
            network_analysis: models_1.ReportType.TECHNICAL,
            behavioral_analysis: models_1.ReportType.TECHNICAL,
            threat_classification: models_1.ReportType.MALWARE,
            incident_report: models_1.ReportType.INCIDENT,
        };
        return typeMap[reportType] || models_1.ReportType.TECHNICAL;
    }
    /**
     * Map severity to enum
     */
    mapSeverity(severity) {
        if (typeof severity === 'number') {
            if (severity >= 80)
                return models_1.ReportSeverity.CRITICAL;
            if (severity >= 60)
                return models_1.ReportSeverity.HIGH;
            if (severity >= 40)
                return models_1.ReportSeverity.MEDIUM;
            if (severity >= 20)
                return models_1.ReportSeverity.LOW;
            return models_1.ReportSeverity.INFORMATIONAL;
        }
        const severityMap = {
            critical: models_1.ReportSeverity.CRITICAL,
            high: models_1.ReportSeverity.HIGH,
            medium: models_1.ReportSeverity.MEDIUM,
            low: models_1.ReportSeverity.LOW,
            informational: models_1.ReportSeverity.INFORMATIONAL,
        };
        return severityMap[severity?.toLowerCase() || ''] || models_1.ReportSeverity.INFORMATIONAL;
    }
    /**
     * Generate tags for report
     */
    generateTags(data, reportType) {
        const tags = ['sandbox', 'ingested'];
        // Add report type tag
        tags.push(reportType.replace('_', '-'));
        // Add category tags from findings
        if (data.findings) {
            const categories = [...new Set(data.findings.map(f => f.category))];
            tags.push(...categories.slice(0, 3));
        }
        // Add IOC indicator tags
        if (data.iocIndicators && data.iocIndicators.length > 0) {
            const types = [...new Set(data.iocIndicators.map(i => i.type))];
            tags.push(...types.map(t => `ioc-${t}`));
        }
        // Add severity tag
        if (data.riskScore !== undefined) {
            if (data.riskScore >= 80)
                tags.push('critical-severity');
            else if (data.riskScore >= 60)
                tags.push('high-severity');
        }
        return tags;
    }
    /**
     * Find or create sandbox session
     */
    async findOrCreateSession(sessionId) {
        let session = await models_1.SandboxSession.findOne({ sessionId });
        if (!session) {
            // Create placeholder session
            session = await models_1.SandboxSession.create({
                sessionId,
                vmName: 'imported',
                simulatorId: 'unknown',
                simulatorName: 'Imported Session',
                status: 'completed',
            });
        }
        return session;
    }
    /**
     * Create alert from high-severity findings
     */
    async createAlertFromFindings(session, findings) {
        for (const finding of findings) {
            await models_1.Alert.create({
                alertId: `ALT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
                title: `Sandbox Detection: ${finding.type}`,
                description: finding.description,
                type: models_1.AlertType.SANDBOX,
                severity: finding.severity === 'critical'
                    ? models_1.AlertSeverity.CRITICAL
                    : models_1.AlertSeverity.HIGH,
                source: models_1.AlertSource.SANDBOX,
                status: 'new',
                relatedSandboxSessionId: session._id,
                tags: ['sandbox', 'automated', finding.type],
                metadata: {
                    findingType: finding.type,
                    sessionId: session.sessionId,
                    autoGenerated: true,
                    details: finding.details,
                },
            });
        }
    }
}
exports.ForensicIngestionService = ForensicIngestionService;
exports.forensicIngestionService = new ForensicIngestionService();
exports.default = exports.forensicIngestionService;
//# sourceMappingURL=forensic-ingestion.service.js.map