import { documentAnalysisService } from '../document_analysis';
import { urlIntelligenceService } from '../url_intelligence';
import { AnalysisReport } from '../models/analysis-report.model';

export type AnalysisSourceType = 'exe' | 'pdf' | 'docx' | 'url' | 'unknown';

export class AnalysisRouterService {
  async route(sourceType: AnalysisSourceType, input: any): Promise<{ engine: string; result: any }> {
    switch (sourceType) {
      case 'pdf':
        return { engine: 'document_analysis', result: await documentAnalysisService.analyzePdf(input.filePath, input.filename) };
      case 'docx':
        return { engine: 'document_analysis', result: await documentAnalysisService.analyzeDocx(input.filePath, input.filename) };
      case 'url':
        return { engine: 'url_intelligence', result: await urlIntelligenceService.analyzeUrl(input.url) };
      case 'exe':
        return { engine: 'sandbox_behavioral', result: null };
      default:
        return { engine: 'unknown', result: null };
    }
  }
}

export const analysisRouterService = new AnalysisRouterService();
export default analysisRouterService;
