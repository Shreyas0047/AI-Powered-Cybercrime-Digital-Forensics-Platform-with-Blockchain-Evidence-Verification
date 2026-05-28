import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import AnalysisReport from '../models/analysis-report.model';
import { documentAnalysisService } from '../document_analysis';
import { urlIntelligenceService } from '../url_intelligence';
import { iocExtractionService } from '../ioc_extraction';
import { AppError } from '../middleware';
import logger from '../config/logger';

export class AnalysisService {
  private readonly uploadDir = './uploads/analysis';

  async analyzeDocument(filePath: string, filename: string): Promise<any> {
    const ext = path.extname(filename).toLowerCase();
    let result: any;

    if (ext === '.pdf') {
      result = await documentAnalysisService.analyzePdf(filePath, filename);
    } else if (ext === '.docx') {
      result = await documentAnalysisService.analyzeDocx(filePath, filename);
    } else {
      throw new AppError('Unsupported document format', 400, 'UNSUPPORTED_FORMAT');
    }

    const analysisId = uuidv4();
    const report = await AnalysisReport.create({
      analysisId,
      analysisType: 'document_analysis',
      sourceType: ext === '.pdf' ? 'pdf' : 'docx',
      sourceName: filename,
      sourceSize: result.file_size,
      threatScore: result.threat_score,
      threatLevel: result.threat_level,
      confidence: result.confidence,
      predictedThreat: result.predicted_threat,
      findings: result.findings,
      indicators: result.extractedIocs?.map((ioc: any) => ({
        type: ioc.type,
        value: ioc.value,
        context: ioc.context || '',
        severity: ioc.severity || 'medium',
        source: 'document_analysis',
      })) || [],
      iocCount: result.ioc_count,
      mitreTechniques: result.mitre_techniques,
      heuristicsTriggered: result.findings.map((f: any) => f.type),
      recommendations: this.generateRecommendations(result),
      summary: result.summary,
      metadata: {
        file_type: result.file_type,
        text_length: result.text_length,
        embedded_urls: result.embedded_urls,
        suspicious_scripts: result.suspicious_scripts,
        macro_risk: result.macro_risk,
        extracted_text_preview: result.extracted_text?.substring(0, 2000),
      },
      analysisTimestamp: new Date(),
    });

    return { analysisId, ...result, report: report.toJSON() };
  }

  async analyzeUrl(url: string): Promise<any> {
    const result = await urlIntelligenceService.analyzeUrl(url);

    const analysisId = uuidv4();
    const report = await AnalysisReport.create({
      analysisId,
      analysisType: 'url_analysis',
      sourceType: 'url',
      sourceName: url,
      threatScore: result.risk_score,
      threatLevel: result.risk_level,
      confidence: result.confidence,
      predictedThreat: result.predicted_threat,
      findings: result.indicators,
      indicators: result.extracted_iocs,
      iocCount: result.extracted_iocs.length,
      mitreTechniques: this.getUrlMitreTechniques(result),
      heuristicsTriggered: result.heuristics_triggered,
      recommendations: this.generateUrlRecommendations(result),
      summary: result.summary,
      metadata: {
        parsed: result.parsed,
        domain_intel: result.domain_intel,
        redirect_analysis: result.redirect_analysis,
        phishing_probability: result.phishing_probability,
      },
      analysisTimestamp: new Date(),
    });

    return { analysisId, ...result, report: report.toJSON() };
  }

  async getAnalysisById(analysisId: string): Promise<any> {
    const report = await AnalysisReport.findOne({ analysisId });
    if (!report) {
      throw new AppError('Analysis not found', 404, 'ANALYSIS_NOT_FOUND');
    }
    return report.toJSON();
  }

  async getAnalysisHistory(page: number = 1, limit: number = 20, type?: string): Promise<{ items: any[]; total: number; page: number; totalPages: number }> {
    const filter: any = {};
    if (type) filter.analysisType = type;

    const [items, total] = await Promise.all([
      AnalysisReport.find(filter).sort({ analysisTimestamp: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      AnalysisReport.countDocuments(filter),
    ]);

    return {
      items: items.map((i: any) => ({ ...i, id: i._id })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  private generateRecommendations(result: any): string[] {
    const recs: string[] = [];
    if (result.threat_score >= 50) {
      recs.push('Do not open this document in a production environment');
      recs.push('Quarantine and flag for security review');
    }
    if (result.findings?.some((f: any) => f.type === 'embedded_javascript' || f.type === 'vba_macro_detected')) {
      recs.push('Disable macros and JavaScript before viewing');
    }
    if (result.embedded_urls?.length > 0) {
      recs.push('Scan extracted URLs for phishing indicators');
    }
    if (recs.length === 0) recs.push('Document appears benign, standard caution advised');
    return recs;
  }

  private generateUrlRecommendations(result: any): string[] {
    const recs: string[] = [];
    if (result.risk_score >= 50) {
      recs.push('Do not visit this URL');
      recs.push('Block at network perimeter if possible');
    }
    if (result.phishing_probability >= 0.4) {
      recs.push('Flag as potential phishing attempt');
    }
    if (recs.length === 0) recs.push('URL appears benign, standard caution advised');
    return recs;
  }

  private getUrlMitreTechniques(result: any): string[] {
    const techniques: string[] = [];
    if (result.phishing_probability >= 0.4) techniques.push('T1566');
    if (result.heuristics_triggered?.includes('credential_harvesting_path')) techniques.push('T1566.004');
    if (result.heuristics_triggered?.includes('encoded_payload')) techniques.push('T1027');
    if (result.heuristics_triggered?.includes('path_traversal')) techniques.push('T1003');
    return techniques;
  }
}

export const analysisService = new AnalysisService();
export default analysisService;
