"use strict";
/**
 * Reports Service
 * Reads and processes forensic reports from the filesystem
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
exports.reportsService = exports.ReportsService = void 0;
const logger_1 = __importDefault(require("../config/logger"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const REPORTS_DIR = path.resolve(process.cwd(), 'uploads/reports');
const MONITORING_DIR = path.resolve(process.cwd(), 'logs/monitoring');
function countSeverity(events) {
    const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    for (const event of events) {
        const sev = (event.severity || 'info').toLowerCase();
        if (sev in counts)
            counts[sev]++;
    }
    return counts;
}
function countCategories(events) {
    const counts = { process: 0, file: 0, registry: 0, network: 0, behavior: 0, system: 0 };
    for (const event of events) {
        const cat = (event.category || 'system').toLowerCase();
        if (cat in counts)
            counts[cat]++;
    }
    return counts;
}
function calculateFileHash(filePath) {
    try {
        const crypto = require('crypto');
        const data = fs.readFileSync(filePath);
        return {
            sha256: crypto.createHash('sha256').update(data).digest('hex'),
            md5: crypto.createHash('md5').update(data).digest('hex'),
        };
    }
    catch {
        return {};
    }
}
function parseReportFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const report = JSON.parse(content);
        return {
            id: path.basename(filePath, '.json'),
            sessionId: report.session?.sessionId || report.session_id || 'unknown',
            simulatorId: report.session?.simulatorId || 'unknown',
            simulatorName: report.session?.simulatorName || report.simulator_name || 'Unknown Simulator',
            reportFile: filePath,
            generatedAt: report.report_metadata?.exportedAt || report.generated_at || new Date().toISOString(),
            executionTime: report.session?.executionTime || report.execution_time || 0,
            totalEvents: (report.process_activity?.length || 0) +
                (report.file_activity?.length || 0) +
                (report.registry_activity?.length || 0) +
                (report.network_activity?.length || 0),
            severityCounts: countSeverity([
                ...(report.process_activity || []),
                ...(report.file_activity || []),
                ...(report.registry_activity || []),
                ...(report.network_activity || []),
            ]),
            categoryCounts: {
                process: report.process_activity?.length || 0,
                file: report.file_activity?.length || 0,
                registry: report.registry_activity?.length || 0,
                network: report.network_activity?.length || 0,
                behavior: report.behavior_summary ? 1 : 0,
                system: 0,
            },
            fileSize: fs.statSync(filePath).size,
            hash: calculateFileHash(filePath),
            status: 'ready',
            reportMetadata: report.report_metadata || {},
            environment: report.environment || {},
            processActivity: report.process_activity || [],
            fileActivity: report.file_activity || [],
            registryActivity: report.registry_activity || [],
            networkActivity: report.network_activity || [],
            behaviorSummary: report.behavior_summary || {},
            suspiciousActivities: (report.suspicious_activities || report.suspiciousActivities || []).map((a, i) => ({
                timestamp: a.timestamp || new Date().toISOString(),
                severity: a.severity || 'medium',
                description: a.description || JSON.stringify(a),
                category: a.category || 'behavior',
                details: a,
                indicators: a.indicators || [],
            })),
            executionSummary: report.execution_summary || {
                startTime: report.session?.startTime || new Date().toISOString(),
                endTime: report.session?.endTime || new Date().toISOString(),
                duration: report.session?.executionTime || 0,
                completionStatus: 'completed',
                eventsCollected: 0,
                errors: [],
            },
            collectionIntegrity: report.collection_integrity || {
                hashAlgorithm: 'sha256',
                hash: '',
                fileCount: 0,
                totalSize: 0,
                verified: false,
            },
        };
    }
    catch (error) {
        logger_1.default.error(`Error parsing report ${filePath}:`, error);
        return null;
    }
}
class ReportsService {
    async getReports(options = {}) {
        const page = Math.max(1, options.page || 1);
        const limit = Math.min(100, Math.max(1, options.limit || 20));
        const reports = [];
        // Primary: uploads/reports/
        const reportDirs = [REPORTS_DIR, MONITORING_DIR];
        for (const dir of reportDirs) {
            if (!fs.existsSync(dir))
                continue;
            const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
            for (const file of files) {
                const filePath = path.join(dir, file);
                const detail = parseReportFile(filePath);
                if (!detail)
                    continue;
                const summary = {
                    id: detail.id,
                    sessionId: detail.sessionId,
                    simulatorId: detail.simulatorId,
                    simulatorName: detail.simulatorName,
                    reportFile: detail.reportFile,
                    generatedAt: detail.generatedAt,
                    executionTime: detail.executionTime,
                    totalEvents: detail.totalEvents,
                    severityCounts: detail.severityCounts,
                    categoryCounts: detail.categoryCounts,
                    fileSize: detail.fileSize,
                    hash: detail.hash,
                    status: detail.status,
                };
                // Apply filters
                if (options.simulator && summary.simulatorName.toLowerCase() !== options.simulator.toLowerCase())
                    continue;
                if (options.severity) {
                    const sevCount = summary.severityCounts[options.severity] || 0;
                    if (sevCount === 0)
                        continue;
                }
                if (options.dateFrom && new Date(summary.generatedAt) < new Date(options.dateFrom))
                    continue;
                if (options.dateTo && new Date(summary.generatedAt) > new Date(options.dateTo))
                    continue;
                if (options.search) {
                    const q = options.search.toLowerCase();
                    if (!summary.simulatorName.toLowerCase().includes(q) &&
                        !summary.sessionId.toLowerCase().includes(q))
                        continue;
                }
                reports.push(summary);
            }
        }
        // Sort by generatedAt desc
        reports.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
        const total = reports.length;
        const start = (page - 1) * limit;
        const paginated = reports.slice(start, start + limit);
        return { reports: paginated, total };
    }
    async getReportById(id) {
        const searchPaths = [REPORTS_DIR, MONITORING_DIR];
        for (const dir of searchPaths) {
            if (!fs.existsSync(dir))
                continue;
            const filePath = path.join(dir, `${id}.json`);
            if (fs.existsSync(filePath)) {
                return parseReportFile(filePath);
            }
            // Try wildcard match
            const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
            for (const file of files) {
                const fp = path.join(dir, file);
                const parsed = parseReportFile(fp);
                if (parsed && (parsed.id === id || parsed.sessionId === id)) {
                    return parsed;
                }
            }
        }
        return null;
    }
    async exportReport(id, format = 'json') {
        const report = await this.getReportById(id);
        if (!report)
            return null;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const safeName = report.simulatorName.replace(/[^a-zA-Z0-9]/g, '_');
        if (format === 'json') {
            return {
                content: JSON.stringify(report, null, 2),
                contentType: 'application/json',
                filename: `forensic_report_${safeName}_${timestamp}.json`,
            };
        }
        if (format === 'pdf') {
            const pdfBuffer = await this.generatePdf(report);
            return {
                content: pdfBuffer,
                contentType: 'application/pdf',
                filename: `forensic_report_${safeName}_${timestamp}.pdf`,
            };
        }
        // Text summary
        const lines = [
            '================================================================================',
            '                    FORENSIC ANALYSIS REPORT',
            '================================================================================',
            '',
            `Simulator:     ${report.simulatorName}`,
            `Session ID:    ${report.sessionId}`,
            `Generated:     ${report.generatedAt}`,
            `Execution Time: ${report.executionTime}s`,
            '',
            '--- SEVERITY SUMMARY ---',
            `  Critical:  ${report.severityCounts.critical}`,
            `  High:      ${report.severityCounts.high}`,
            `  Medium:    ${report.severityCounts.medium}`,
            `  Low:       ${report.severityCounts.low}`,
            `  Info:      ${report.severityCounts.info}`,
            '',
            '--- CATEGORY SUMMARY ---',
            `  Process:  ${report.categoryCounts.process}`,
            `  File:     ${report.categoryCounts.file}`,
            `  Registry: ${report.categoryCounts.registry}`,
            `  Network:  ${report.categoryCounts.network}`,
            '',
            '--- EXECUTION SUMMARY ---',
            `  Status:   ${report.executionSummary.completionStatus}`,
            `  Duration: ${report.executionSummary.duration}s`,
            `  Events:   ${report.executionSummary.eventsCollected}`,
            '',
        ];
        if (report.behaviorSummary.overallRiskScore !== undefined) {
            lines.push('--- BEHAVIOR ANALYSIS ---');
            lines.push(`  Risk Score: ${report.behaviorSummary.overallRiskScore}`);
            if (report.behaviorSummary.detectedPatterns?.length) {
                lines.push(`  Patterns:   ${report.behaviorSummary.detectedPatterns.join(', ')}`);
            }
            lines.push('');
        }
        if (report.suspiciousActivities.length > 0) {
            lines.push('--- SUSPICIOUS ACTIVITIES ---');
            for (const act of report.suspiciousActivities) {
                lines.push(`  [${act.severity.toUpperCase()}] ${act.timestamp} - ${act.description}`);
            }
            lines.push('');
        }
        lines.push('================================================================================');
        lines.push(`Report generated: ${new Date().toISOString()}`);
        lines.push('================================================================================');
        return {
            content: lines.join('\n'),
            contentType: 'text/plain',
            filename: `forensic_report_${safeName}_${timestamp}.txt`,
        };
    }
    /**
     * Generate a PDF representation of a forensic report using PDFKit.
     * Sections: Header, Severity, Categories, Execution, Behavior, Suspicious Activities.
     */
    async generatePdf(report) {
        // Lazy import so module loading doesn't fail in environments without PDFKit
        const PDFDocument = (await Promise.resolve().then(() => __importStar(require('pdfkit')))).default;
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({ size: 'A4', margin: 50, info: {
                        Title: `Forensic Report - ${report.simulatorName}`,
                        Author: 'NyxTrace',
                        Subject: 'Forensic Analysis Report',
                        CreationDate: new Date(),
                    } });
                const chunks = [];
                doc.on('data', (chunk) => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);
                // Header
                doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(20).text('FORENSIC ANALYSIS REPORT', { align: 'center' });
                doc.moveDown(0.3);
                doc.fillColor('#475569').font('Helvetica').fontSize(10).text('NyxTrace Cybercrime Digital Forensics Platform', { align: 'center' });
                doc.moveDown(1);
                doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cbd5e1').stroke();
                doc.moveDown(0.5);
                // Metadata
                doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(12).text('Report Metadata');
                doc.moveDown(0.3);
                doc.font('Helvetica').fontSize(10).fillColor('#334155');
                const meta = [
                    ['Simulator:', report.simulatorName],
                    ['Session ID:', report.sessionId],
                    ['Generated:', report.generatedAt],
                    ['Execution Time:', `${report.executionTime}s`],
                    ['Total Events:', String(report.totalEvents)],
                ];
                for (const [label, value] of meta) {
                    doc.font('Helvetica-Bold').text(label, { continued: true, width: 120 });
                    doc.font('Helvetica').text(` ${value}`);
                }
                doc.moveDown(0.8);
                // Severity Summary
                doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(12).text('Severity Distribution');
                doc.moveDown(0.3);
                doc.font('Helvetica').fontSize(10).fillColor('#334155');
                const sevs = [
                    ['Critical', report.severityCounts.critical, '#dc2626'],
                    ['High', report.severityCounts.high, '#ea580c'],
                    ['Medium', report.severityCounts.medium, '#d97706'],
                    ['Low', report.severityCounts.low, '#16a34a'],
                    ['Info', report.severityCounts.info, '#475569'],
                ];
                for (const [label, count, color] of sevs) {
                    doc.fillColor(color).font('Helvetica-Bold').text(`■  ${label}:`, { continued: true, width: 120 });
                    doc.fillColor('#334155').font('Helvetica').text(` ${count}`);
                }
                doc.moveDown(0.8);
                // Category Summary
                doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(12).text('Event Categories');
                doc.moveDown(0.3);
                doc.font('Helvetica').fontSize(10).fillColor('#334155');
                const cats = [
                    ['Process Activity:', report.categoryCounts.process],
                    ['File Activity:', report.categoryCounts.file],
                    ['Registry Activity:', report.categoryCounts.registry],
                    ['Network Activity:', report.categoryCounts.network],
                ];
                for (const [label, count] of cats) {
                    doc.font('Helvetica-Bold').text(label, { continued: true, width: 150 });
                    doc.font('Helvetica').text(` ${count}`);
                }
                doc.moveDown(0.8);
                // Execution Summary
                doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(12).text('Execution Summary');
                doc.moveDown(0.3);
                doc.font('Helvetica').fontSize(10).fillColor('#334155');
                const execLines = [
                    ['Status:', report.executionSummary?.completionStatus || 'unknown'],
                    ['Duration:', `${report.executionSummary?.duration ?? 0}s`],
                    ['Events Collected:', report.executionSummary?.eventsCollected ?? 0],
                ];
                for (const [label, value] of execLines) {
                    doc.font('Helvetica-Bold').text(label, { continued: true, width: 150 });
                    doc.font('Helvetica').text(` ${value}`);
                }
                doc.moveDown(0.8);
                // Behavior Summary
                if (report.behaviorSummary && report.behaviorSummary.overallRiskScore !== undefined) {
                    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(12).text('Behavioral Analysis');
                    doc.moveDown(0.3);
                    doc.font('Helvetica').fontSize(10).fillColor('#334155');
                    doc.font('Helvetica-Bold').text('Risk Score:', { continued: true, width: 150 });
                    doc.font('Helvetica').text(` ${report.behaviorSummary.overallRiskScore}`);
                    if (report.behaviorSummary.detectedPatterns?.length) {
                        doc.font('Helvetica-Bold').text('Detected Patterns:');
                        doc.font('Helvetica').list(report.behaviorSummary.detectedPatterns, { bulletRadius: 1.5 });
                    }
                    doc.moveDown(0.8);
                }
                // Suspicious Activities
                if (report.suspiciousActivities && report.suspiciousActivities.length > 0) {
                    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(12).text('Suspicious Activities');
                    doc.moveDown(0.3);
                    doc.font('Helvetica').fontSize(9).fillColor('#334155');
                    for (const act of report.suspiciousActivities.slice(0, 30)) {
                        const sev = (act.severity || 'medium').toLowerCase();
                        const color = sev === 'critical' ? '#dc2626' :
                            sev === 'high' ? '#ea580c' :
                                sev === 'medium' ? '#d97706' : '#16a34a';
                        doc.fillColor(color).font('Helvetica-Bold').text(`[${(act.severity || 'medium').toUpperCase()}]`, { continued: true });
                        doc.fillColor('#334155').font('Helvetica').text(` ${act.timestamp || ''} — ${act.description || ''}`);
                        doc.moveDown(0.15);
                    }
                    if (report.suspiciousActivities.length > 30) {
                        doc.fillColor('#64748b').font('Helvetica-Oblique').fontSize(9).text(`(${report.suspiciousActivities.length - 30} more activities truncated)`);
                    }
                    doc.moveDown(0.8);
                }
                // Footer
                if (doc.y > 720)
                    doc.addPage();
                doc.moveDown(1);
                doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cbd5e1').stroke();
                doc.moveDown(0.4);
                doc.fillColor('#94a3b8').font('Helvetica').fontSize(8).text(`Report generated by NyxTrace · ${new Date().toISOString()}`, { align: 'center' });
                doc.end();
            }
            catch (err) {
                reject(err);
            }
        });
    }
}
exports.ReportsService = ReportsService;
exports.reportsService = new ReportsService();
//# sourceMappingURL=reports.service.js.map