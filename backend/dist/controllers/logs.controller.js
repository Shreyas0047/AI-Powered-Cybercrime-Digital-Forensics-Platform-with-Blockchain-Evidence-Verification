"use strict";
/**
 * Logs Controller
 * Handles log retrieval endpoints
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.logsController = exports.LogsController = void 0;
const services_1 = require("../services");
class LogsController {
    async findAll(req, res) {
        const { page = 1, limit = 100, level, category, search, since } = req.query;
        const result = await services_1.logsService.getLogs({
            page: Number(page),
            limit: Number(limit),
            level: level,
            category: category,
            search,
            sinceSeconds: since ? Number(since) : undefined,
        });
        const response = {
            success: true,
            message: 'Logs retrieved',
            data: result.logs,
            meta: {
                page: Number(page),
                limit: Number(limit),
                total: result.total,
                totalPages: Math.ceil(result.total / Number(limit)),
            },
        };
        res.json(response);
    }
    async getStats(req, res) {
        const stats = await services_1.logsService.getLogStats();
        const response = {
            success: true,
            message: 'Log stats retrieved',
            data: stats,
        };
        res.json(response);
    }
}
exports.LogsController = LogsController;
exports.logsController = new LogsController();
exports.default = exports.logsController;
//# sourceMappingURL=logs.controller.js.map