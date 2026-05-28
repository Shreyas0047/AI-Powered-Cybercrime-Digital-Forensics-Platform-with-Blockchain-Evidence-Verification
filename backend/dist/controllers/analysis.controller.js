"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analysisController = exports.AnalysisController = void 0;
const analysis_service_1 = require("../services/analysis.service");
class AnalysisController {
    async analyzeDocument(req, res) {
        try {
            if (!req.file) {
                res.status(400).json({ success: false, message: 'No file uploaded', errors: [{ code: 'NO_FILE', message: 'A PDF or DOCX file is required' }] });
                return;
            }
            const result = await analysis_service_1.analysisService.analyzeDocument(req.file.path, req.file.originalname);
            const response = {
                success: true,
                message: 'Document analysis complete',
                data: result,
            };
            res.json(response);
        }
        catch (error) {
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Document analysis failed',
                errors: [{ code: error.code || 'ANALYSIS_ERROR', message: error.message }],
            });
        }
    }
    async analyzeUrl(req, res) {
        try {
            const { url } = req.body;
            if (!url) {
                res.status(400).json({ success: false, message: 'URL is required', errors: [{ code: 'MISSING_URL', message: 'url field is required' }] });
                return;
            }
            try {
                new URL(url.startsWith('http') ? url : `http://${url}`);
            }
            catch {
                res.status(400).json({ success: false, message: 'Invalid URL format', errors: [{ code: 'INVALID_URL', message: 'The provided URL is not valid' }] });
                return;
            }
            const result = await analysis_service_1.analysisService.analyzeUrl(url);
            const response = {
                success: true,
                message: 'URL analysis complete',
                data: result,
            };
            res.json(response);
        }
        catch (error) {
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'URL analysis failed',
                errors: [{ code: error.code || 'ANALYSIS_ERROR', message: error.message }],
            });
        }
    }
    async getAnalysisById(req, res) {
        try {
            const result = await analysis_service_1.analysisService.getAnalysisById(req.params.id);
            const response = { success: true, message: 'Analysis retrieved', data: result };
            res.json(response);
        }
        catch (error) {
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to retrieve analysis',
                errors: [{ code: error.code || 'FETCH_ERROR', message: error.message }],
            });
        }
    }
    async getAnalysisHistory(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = Math.min(parseInt(req.query.limit) || 20, 100);
            const type = req.query.type;
            const result = await analysis_service_1.analysisService.getAnalysisHistory(page, limit, type);
            const response = {
                success: true,
                message: 'Analysis history retrieved',
                data: result.items,
                meta: { page: result.page, limit, total: result.total, totalPages: result.totalPages },
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve analysis history',
                errors: [{ code: 'FETCH_ERROR', message: error.message }],
            });
        }
    }
}
exports.AnalysisController = AnalysisController;
exports.analysisController = new AnalysisController();
exports.default = exports.analysisController;
//# sourceMappingURL=analysis.controller.js.map