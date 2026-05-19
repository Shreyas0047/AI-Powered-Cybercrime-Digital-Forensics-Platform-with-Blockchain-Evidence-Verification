"use strict";
/**
 * Reports Controller
 * Handles forensic report endpoints
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportsController = exports.ReportsController = void 0;
const services_1 = require("../services");
class ReportsController {
    async findAll(req, res) {
        const { page = 1, limit = 20, simulator, severity, dateFrom, dateTo, search } = req.query;
        const result = await services_1.reportsService.getReports({
            page: Number(page),
            limit: Number(limit),
            simulator,
            severity,
            dateFrom,
            dateTo,
            search,
        });
        const response = {
            success: true,
            message: 'Reports retrieved',
            data: result.reports,
            meta: {
                page: Number(page),
                limit: Number(limit),
                total: result.total,
                totalPages: Math.ceil(result.total / Number(limit)),
            },
        };
        res.json(response);
    }
    async findById(req, res) {
        const report = await services_1.reportsService.getReportById(req.params.id);
        if (!report) {
            res.status(404).json({
                success: false,
                message: 'Report not found',
            });
            return;
        }
        const response = {
            success: true,
            message: 'Report retrieved',
            data: report,
        };
        res.json(response);
    }
    async exportReport(req, res) {
        const { format = 'json' } = req.query;
        const result = await services_1.reportsService.exportReport(req.params.id, format);
        if (!result) {
            res.status(404).json({
                success: false,
                message: 'Report not found',
            });
            return;
        }
        res.setHeader('Content-Type', result.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        res.send(result.content);
    }
}
exports.ReportsController = ReportsController;
exports.reportsController = new ReportsController();
exports.default = exports.reportsController;
//# sourceMappingURL=reports.controller.js.map