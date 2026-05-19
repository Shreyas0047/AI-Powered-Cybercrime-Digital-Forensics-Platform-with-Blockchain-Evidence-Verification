/**
 * Reports Service
 * Reads and processes forensic reports from the filesystem
 */

import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config';
import type {
  ForensicReportSummary,
  ForensicReportDetail,
  SeverityCounts,
  CategoryCounts
} from '../types/reports';

const REPORTS_DIR = path.resolve(process.cwd(), 'uploads/reports');
const MONITORING_DIR = path.resolve(process.cwd(), 'logs/monitoring');

function countSeverity(events: Array<{ severity?: string }>): SeverityCounts {
  const counts: SeverityCounts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const event of events) {
    const sev = (event.severity || 'info').toLowerCase() as keyof SeverityCounts;
    if (sev in counts) counts[sev]++;
  }
  return counts;
}

function countCategories(events: Array<{ category?: string }>): CategoryCounts {
  const counts: CategoryCounts = { process: 0, file: 0, registry: 0, network: 0, behavior: 0, system: 0 };
  for (const event of events) {
    const cat = (event.category || 'system').toLowerCase() as keyof CategoryCounts;
    if (cat in counts) counts[cat]++;
  }
  return counts;
}

function calculateFileHash(filePath: string): { sha256?: string; md5?: string } {
  try {
    const crypto = require('crypto');
    const data = fs.readFileSync(filePath);
    return {
      sha256: crypto.createHash('sha256').update(data).digest('hex'),
      md5: crypto.createHash('md5').update(data).digest('hex'),
    };
  } catch {
    return {};
  }
}

function parseReportFile(filePath: string): ForensicReportDetail | null {
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
      suspiciousActivities: (report.suspicious_activities || report.suspiciousActivities || []).map((a: Record<string, unknown>, i: number) => ({
        timestamp: (a.timestamp as string) || new Date().toISOString(),
        severity: (a.severity as string) || 'medium',
        description: (a.description as string) || JSON.stringify(a),
        category: (a.category as string) || 'behavior',
        details: a,
        indicators: (a.indicators as Array<{ type: string; description: string; score: number }>) || [],
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
  } catch (error) {
    console.error(`Error parsing report ${filePath}:`, error);
    return null;
  }
}

export class ReportsService {
  async getReports(options: {
    page?: number;
    limit?: number;
    simulator?: string;
    severity?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  } = {}): Promise<{ reports: ForensicReportSummary[]; total: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const reports: ForensicReportSummary[] = [];

    // Primary: uploads/reports/
    const reportDirs = [REPORTS_DIR, MONITORING_DIR];

    for (const dir of reportDirs) {
      if (!fs.existsSync(dir)) continue;

      const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

      for (const file of files) {
        const filePath = path.join(dir, file);
        const detail = parseReportFile(filePath);

        if (!detail) continue;

        const summary: ForensicReportSummary = {
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
        if (options.simulator && summary.simulatorName.toLowerCase() !== options.simulator.toLowerCase()) continue;
        if (options.severity) {
          const sevCount = (summary.severityCounts as unknown as Record<string, number>)[options.severity] || 0;
          if (sevCount === 0) continue;
        }
        if (options.dateFrom && new Date(summary.generatedAt) < new Date(options.dateFrom)) continue;
        if (options.dateTo && new Date(summary.generatedAt) > new Date(options.dateTo)) continue;
        if (options.search) {
          const q = options.search.toLowerCase();
          if (!summary.simulatorName.toLowerCase().includes(q) &&
              !summary.sessionId.toLowerCase().includes(q)) continue;
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

  async getReportById(id: string): Promise<ForensicReportDetail | null> {
    const searchPaths = [REPORTS_DIR, MONITORING_DIR];

    for (const dir of searchPaths) {
      if (!fs.existsSync(dir)) continue;
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

  async exportReport(id: string, format: 'json' | 'text' = 'json'): Promise<{ content: string; contentType: string; filename: string } | null> {
    const report = await this.getReportById(id);
    if (!report) return null;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeName = report.simulatorName.replace(/[^a-zA-Z0-9]/g, '_');

    if (format === 'json') {
      return {
        content: JSON.stringify(report, null, 2),
        contentType: 'application/json',
        filename: `forensic_report_${safeName}_${timestamp}.json`,
      };
    }

    // Text summary
    const lines: string[] = [
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
}

export const reportsService = new ReportsService();