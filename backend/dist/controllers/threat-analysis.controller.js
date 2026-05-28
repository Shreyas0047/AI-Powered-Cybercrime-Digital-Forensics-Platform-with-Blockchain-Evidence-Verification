"use strict";
/**
 * Threat Analysis Controller
 * Handles threat intelligence API endpoints
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
exports.threatAnalysisController = exports.ThreatAnalysisController = void 0;
const logger_1 = __importDefault(require("../config/logger"));
const threat_intelligence_1 = require("../threat_intelligence");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class ThreatAnalysisController {
    async analyzeSession(req, res) {
        try {
            const { sessionId, events, reportPath } = req.body;
            let telemetryEvents = [];
            if (events && events.length > 0) {
                telemetryEvents = events;
            }
            else if (reportPath) {
                telemetryEvents = await this.loadFromReportFile(reportPath);
            }
            else if (sessionId) {
                telemetryEvents = await this.loadFromMonitoringLog(sessionId);
            }
            if (telemetryEvents.length === 0) {
                res.status(400).json({
                    success: false,
                    error: 'No telemetry events provided or found'
                });
                return;
            }
            const result = await threat_intelligence_1.intelligencePipeline.analyze({
                sessionId: sessionId || `session_${Date.now()}`,
                events: telemetryEvents
            });
            if (!result.success || !result.report) {
                res.status(500).json({
                    success: false,
                    error: result.error || 'Analysis failed'
                });
                return;
            }
            res.json({
                success: true,
                data: result.report
            });
        }
        catch (error) {
            logger_1.default.error('Threat analysis error:', error);
            res.status(500).json({
                success: false,
                error: `Analysis failed: ${error}`
            });
        }
    }
    async getIntelligenceReport(req, res) {
        try {
            const { sessionId } = req.params;
            const reportsDir = path.resolve(process.cwd(), 'uploads/reports');
            const reportFiles = fs.readdirSync(reportsDir).filter(f => f.endsWith('.json'));
            let matchingReport = null;
            for (const file of reportFiles) {
                try {
                    const content = fs.readFileSync(path.join(reportsDir, file), 'utf-8');
                    const report = JSON.parse(content);
                    const reportSessionId = report.session?.sessionId || report.session_id;
                    if (reportSessionId === sessionId) {
                        matchingReport = report;
                        break;
                    }
                }
                catch {
                    continue;
                }
            }
            if (!matchingReport) {
                res.status(404).json({
                    success: false,
                    error: 'Report not found'
                });
                return;
            }
            const allEvents = this.extractEventsFromReport(matchingReport);
            const result = await threat_intelligence_1.intelligencePipeline.analyze({
                sessionId,
                events: allEvents
            });
            if (!result.success || !result.report) {
                res.status(500).json({
                    success: false,
                    error: result.error || 'Analysis failed'
                });
                return;
            }
            res.json({
                success: true,
                data: result.report
            });
        }
        catch (error) {
            logger_1.default.error('Get intelligence report error:', error);
            res.status(500).json({
                success: false,
                error: `Failed to get report: ${error}`
            });
        }
    }
    async getIntelligenceSummary(req, res) {
        try {
            const { sessionId } = req.params;
            const reportsDir = path.resolve(process.cwd(), 'uploads/reports');
            const reportFiles = fs.readdirSync(reportsDir).filter(f => f.endsWith('.json'));
            let matchingReport = null;
            for (const file of reportFiles) {
                try {
                    const content = fs.readFileSync(path.join(reportsDir, file), 'utf-8');
                    const report = JSON.parse(content);
                    const reportSessionId = report.session?.sessionId || report.session_id;
                    if (reportSessionId === sessionId) {
                        matchingReport = report;
                        break;
                    }
                }
                catch {
                    continue;
                }
            }
            if (!matchingReport) {
                res.status(404).json({
                    success: false,
                    error: 'Report not found'
                });
                return;
            }
            const allEvents = this.extractEventsFromReport(matchingReport);
            const result = await threat_intelligence_1.intelligencePipeline.analyze({
                sessionId,
                events: allEvents
            });
            if (!result.success || !result.report) {
                res.status(500).json({
                    success: false,
                    error: result.error || 'Analysis failed'
                });
                return;
            }
            const summary = {
                sessionId,
                riskScore: result.report.riskScore.totalScore,
                severity: result.report.riskScore.severity,
                behaviorCount: result.report.detectedBehaviors.length,
                patternCount: result.report.correlatedAttackPatterns.length,
                topBehaviors: result.report.detectedBehaviors.slice(0, 3).map(b => ({
                    type: b.behaviorType,
                    severity: b.severity,
                    confidence: b.confidence
                })),
                indicators: result.report.suspiciousIndicators.slice(0, 5)
            };
            res.json({
                success: true,
                data: summary
            });
        }
        catch (error) {
            logger_1.default.error('Get intelligence summary error:', error);
            res.status(500).json({
                success: false,
                error: `Failed to get summary: ${error}`
            });
        }
    }
    async loadFromReportFile(reportPath) {
        try {
            const content = fs.readFileSync(reportPath, 'utf-8');
            const report = JSON.parse(content);
            return this.extractEventsFromReport(report);
        }
        catch (error) {
            logger_1.default.error('Error loading report file:', error);
            return [];
        }
    }
    async loadFromMonitoringLog(sessionId) {
        try {
            const logDir = path.resolve(process.cwd(), 'logs/monitoring');
            const logFiles = fs.readdirSync(logDir).filter(f => f.includes(sessionId));
            const events = [];
            for (const file of logFiles) {
                try {
                    const content = fs.readFileSync(path.join(logDir, file), 'utf-8');
                    const logEvents = JSON.parse(content);
                    if (Array.isArray(logEvents)) {
                        events.push(...logEvents);
                    }
                    else if (logEvents.events && Array.isArray(logEvents.events)) {
                        events.push(...logEvents.events);
                    }
                }
                catch {
                    continue;
                }
            }
            return events;
        }
        catch (error) {
            logger_1.default.error('Error loading monitoring log:', error);
            return [];
        }
    }
    extractEventsFromReport(report) {
        const events = [];
        const processActivity = report.process_activity || [];
        for (const event of processActivity) {
            events.push({
                eventType: event.operation || 'process_start',
                timestamp: new Date(event.timestamp || Date.now()),
                processId: event.pid,
                processName: event.process_name || event.name,
                operation: event.operation,
                details: event
            });
        }
        const fileActivity = report.file_activity || [];
        for (const event of fileActivity) {
            events.push({
                eventType: event.operation || 'file_modify',
                timestamp: new Date(event.timestamp || Date.now()),
                processId: event.pid,
                processName: event.process_name,
                path: event.path,
                operation: event.operation,
                details: event
            });
        }
        const registryActivity = report.registry_activity || [];
        for (const event of registryActivity) {
            events.push({
                eventType: event.operation || 'registry_modify',
                timestamp: new Date(event.timestamp || Date.now()),
                processId: event.pid,
                processName: event.process_name,
                path: event.path,
                target: event.key || event.value_name,
                operation: event.operation,
                details: event
            });
        }
        const networkActivity = report.network_activity || [];
        for (const event of networkActivity) {
            events.push({
                eventType: event.operation || 'network_connect',
                timestamp: new Date(event.timestamp || Date.now()),
                processId: event.pid,
                processName: event.process_name,
                destination: event.destination || event.remote_address,
                port: event.port || event.remote_port,
                protocol: event.protocol,
                operation: event.operation,
                details: event
            });
        }
        return events;
    }
}
exports.ThreatAnalysisController = ThreatAnalysisController;
exports.threatAnalysisController = new ThreatAnalysisController();
exports.default = exports.threatAnalysisController;
//# sourceMappingURL=threat-analysis.controller.js.map