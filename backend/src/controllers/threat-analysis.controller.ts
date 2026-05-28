/**
 * Threat Analysis Controller
 * Handles threat intelligence API endpoints
 */

import { Request, Response } from 'express';
import logger from '../config/logger';
import { intelligencePipeline, RawTelemetryEvent } from '../threat_intelligence';
import * as fs from 'fs';
import * as path from 'path';

interface AnalyzeRequestBody {
  sessionId?: string;
  events?: RawTelemetryEvent[];
  reportPath?: string;
}

export class ThreatAnalysisController {
  async analyzeSession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId, events, reportPath } = req.body as AnalyzeRequestBody;

      let telemetryEvents: RawTelemetryEvent[] = [];

      if (events && events.length > 0) {
        telemetryEvents = events;
      } else if (reportPath) {
        telemetryEvents = await this.loadFromReportFile(reportPath);
      } else if (sessionId) {
        telemetryEvents = await this.loadFromMonitoringLog(sessionId);
      }

      if (telemetryEvents.length === 0) {
        res.status(400).json({
          success: false,
          error: 'No telemetry events provided or found'
        });
        return;
      }

      const result = await intelligencePipeline.analyze({
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
    } catch (error) {
      logger.error('Threat analysis error:', error);
      res.status(500).json({
        success: false,
        error: `Analysis failed: ${error}`
      });
    }
  }

  async getIntelligenceReport(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const reportsDir = path.resolve(process.cwd(), 'uploads/reports');

      const reportFiles = fs.readdirSync(reportsDir).filter(f => f.endsWith('.json'));
      
      let matchingReport: any = null;
      
      for (const file of reportFiles) {
        try {
          const content = fs.readFileSync(path.join(reportsDir, file), 'utf-8');
          const report = JSON.parse(content);
          
          const reportSessionId = report.session?.sessionId || report.session_id;
          if (reportSessionId === sessionId) {
            matchingReport = report;
            break;
          }
        } catch {
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
      
      const result = await intelligencePipeline.analyze({
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
    } catch (error) {
      logger.error('Get intelligence report error:', error);
      res.status(500).json({
        success: false,
        error: `Failed to get report: ${error}`
      });
    }
  }

  async getIntelligenceSummary(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      
      const reportsDir = path.resolve(process.cwd(), 'uploads/reports');
      const reportFiles = fs.readdirSync(reportsDir).filter(f => f.endsWith('.json'));
      
      let matchingReport: any = null;
      
      for (const file of reportFiles) {
        try {
          const content = fs.readFileSync(path.join(reportsDir, file), 'utf-8');
          const report = JSON.parse(content);
          
          const reportSessionId = report.session?.sessionId || report.session_id;
          if (reportSessionId === sessionId) {
            matchingReport = report;
            break;
          }
        } catch {
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
      
      const result = await intelligencePipeline.analyze({
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
    } catch (error) {
      logger.error('Get intelligence summary error:', error);
      res.status(500).json({
        success: false,
        error: `Failed to get summary: ${error}`
      });
    }
  }

  private async loadFromReportFile(reportPath: string): Promise<RawTelemetryEvent[]> {
    try {
      const content = fs.readFileSync(reportPath, 'utf-8');
      const report = JSON.parse(content);
      return this.extractEventsFromReport(report);
    } catch (error) {
      logger.error('Error loading report file:', error);
      return [];
    }
  }

  private async loadFromMonitoringLog(sessionId: string): Promise<RawTelemetryEvent[]> {
    try {
      const logDir = path.resolve(process.cwd(), 'logs/monitoring');
      const logFiles = fs.readdirSync(logDir).filter(f => f.includes(sessionId));

      const events: RawTelemetryEvent[] = [];

      for (const file of logFiles) {
        try {
          const content = fs.readFileSync(path.join(logDir, file), 'utf-8');
          const logEvents = JSON.parse(content);
          
          if (Array.isArray(logEvents)) {
            events.push(...logEvents);
          } else if (logEvents.events && Array.isArray(logEvents.events)) {
            events.push(...logEvents.events);
          }
        } catch {
          continue;
        }
      }

      return events;
    } catch (error) {
      logger.error('Error loading monitoring log:', error);
      return [];
    }
  }

  private extractEventsFromReport(report: any): RawTelemetryEvent[] {
    const events: RawTelemetryEvent[] = [];

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

export const threatAnalysisController = new ThreatAnalysisController();
export default threatAnalysisController;