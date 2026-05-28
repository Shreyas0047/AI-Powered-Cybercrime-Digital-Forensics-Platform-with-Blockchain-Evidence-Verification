"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analysisService = exports.AnalysisService = void 0;
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const analysis_report_model_1 = __importDefault(require("../models/analysis-report.model"));
const document_analysis_1 = require("../document_analysis");
const url_intelligence_1 = require("../url_intelligence");
const middleware_1 = require("../middleware");
class AnalysisService {
    uploadDir = './uploads/analysis';
    async analyzeDocument(filePath, filename) {
        const ext = path_1.default.extname(filename).toLowerCase();
        let result;
        if (ext === '.pdf') {
            result = await document_analysis_1.documentAnalysisService.analyzePdf(filePath, filename);
        }
        else if (ext === '.docx') {
            result = await document_analysis_1.documentAnalysisService.analyzeDocx(filePath, filename);
        }
        else {
            throw new middleware_1.AppError('Unsupported document format', 400, 'UNSUPPORTED_FORMAT');
        }
        const analysisId = (0, uuid_1.v4)();
        const report = await analysis_report_model_1.default.create({
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
            indicators: result.extractedIocs?.map((ioc) => ({
                type: ioc.type,
                value: ioc.value,
                context: ioc.context || '',
                severity: ioc.severity || 'medium',
                source: 'document_analysis',
            })) || [],
            iocCount: result.ioc_count,
            mitreTechniques: result.mitre_techniques,
            heuristicsTriggered: result.findings.map((f) => f.type),
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
    async analyzeUrl(url) {
        const result = await url_intelligence_1.urlIntelligenceService.analyzeUrl(url);
        const analysisId = (0, uuid_1.v4)();
        const report = await analysis_report_model_1.default.create({
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
    async getAnalysisById(analysisId) {
        const report = await analysis_report_model_1.default.findOne({ analysisId });
        if (!report) {
            throw new middleware_1.AppError('Analysis not found', 404, 'ANALYSIS_NOT_FOUND');
        }
        return report.toJSON();
    }
    async getAnalysisHistory(page = 1, limit = 20, type) {
        const filter = {};
        if (type)
            filter.analysisType = type;
        const [items, total] = await Promise.all([
            analysis_report_model_1.default.find(filter).sort({ analysisTimestamp: -1 }).skip((page - 1) * limit).limit(limit).lean(),
            analysis_report_model_1.default.countDocuments(filter),
        ]);
        return {
            items: items.map((i) => ({ ...i, id: i._id })),
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    generateRecommendations(result) {
        const recs = [];
        if (result.threat_score >= 50) {
            recs.push('Do not open this document in a production environment');
            recs.push('Quarantine and flag for security review');
        }
        if (result.findings?.some((f) => f.type === 'embedded_javascript' || f.type === 'vba_macro_detected')) {
            recs.push('Disable macros and JavaScript before viewing');
        }
        if (result.embedded_urls?.length > 0) {
            recs.push('Scan extracted URLs for phishing indicators');
        }
        if (recs.length === 0)
            recs.push('Document appears benign, standard caution advised');
        return recs;
    }
    generateUrlRecommendations(result) {
        const recs = [];
        if (result.risk_score >= 50) {
            recs.push('Do not visit this URL');
            recs.push('Block at network perimeter if possible');
        }
        if (result.phishing_probability >= 0.4) {
            recs.push('Flag as potential phishing attempt');
        }
        if (recs.length === 0)
            recs.push('URL appears benign, standard caution advised');
        return recs;
    }
    getUrlMitreTechniques(result) {
        const techniques = [];
        if (result.phishing_probability >= 0.4)
            techniques.push('T1566');
        if (result.heuristics_triggered?.includes('credential_harvesting_path'))
            techniques.push('T1566.004');
        if (result.heuristics_triggered?.includes('encoded_payload'))
            techniques.push('T1027');
        if (result.heuristics_triggered?.includes('path_traversal'))
            techniques.push('T1003');
        return techniques;
    }
}
exports.AnalysisService = AnalysisService;
exports.analysisService = new AnalysisService();
exports.default = exports.analysisService;
//# sourceMappingURL=analysis.service.js.map