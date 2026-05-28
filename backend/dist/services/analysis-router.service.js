"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analysisRouterService = exports.AnalysisRouterService = void 0;
const document_analysis_1 = require("../document_analysis");
const url_intelligence_1 = require("../url_intelligence");
class AnalysisRouterService {
    async route(sourceType, input) {
        switch (sourceType) {
            case 'pdf':
                return { engine: 'document_analysis', result: await document_analysis_1.documentAnalysisService.analyzePdf(input.filePath, input.filename) };
            case 'docx':
                return { engine: 'document_analysis', result: await document_analysis_1.documentAnalysisService.analyzeDocx(input.filePath, input.filename) };
            case 'url':
                return { engine: 'url_intelligence', result: await url_intelligence_1.urlIntelligenceService.analyzeUrl(input.url) };
            case 'exe':
                return { engine: 'sandbox_behavioral', result: null };
            default:
                return { engine: 'unknown', result: null };
        }
    }
}
exports.AnalysisRouterService = AnalysisRouterService;
exports.analysisRouterService = new AnalysisRouterService();
exports.default = exports.analysisRouterService;
//# sourceMappingURL=analysis-router.service.js.map