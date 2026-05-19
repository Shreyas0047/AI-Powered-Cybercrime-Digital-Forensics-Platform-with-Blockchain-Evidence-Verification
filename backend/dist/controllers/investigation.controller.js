"use strict";
/**
 * Investigation Controller
 * Handles investigation endpoints
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.investigationController = exports.InvestigationController = void 0;
const services_1 = require("../services");
class InvestigationController {
    /**
     * POST /api/v1/investigations
     * Create new investigation
     */
    async create(req, res) {
        const investigation = await services_1.investigationService.create({
            ...req.body,
            createdBy: req.user?.id,
        });
        const response = {
            success: true,
            message: 'Investigation created successfully',
            data: { investigation },
        };
        res.status(201).json(response);
    }
    /**
     * GET /api/v1/investigations
     * List all investigations
     */
    async findAll(req, res) {
        const { page = 1, limit = 20, status, priority, assignedTo, search, sortBy = 'createdAt', sortOrder = 'desc', } = req.query;
        const result = await services_1.investigationService.findAll({
            page: Number(page),
            limit: Math.min(Number(limit), 100),
            status,
            priority,
            assignedTo,
            search,
            sortBy,
            sortOrder,
        });
        const response = {
            success: true,
            message: 'Investigations retrieved',
            data: result.investigations,
            meta: {
                page: Number(page),
                limit: Number(limit),
                total: result.total,
                totalPages: result.totalPages,
            },
        };
        res.json(response);
    }
    /**
     * GET /api/v1/investigations/:id
     * Get investigation by ID
     */
    async findById(req, res) {
        const investigation = await services_1.investigationService.findById(req.params.id);
        const response = {
            success: true,
            message: 'Investigation retrieved',
            data: { investigation },
        };
        res.json(response);
    }
    /**
     * PUT /api/v1/investigations/:id
     * Update investigation
     */
    async update(req, res) {
        const investigation = await services_1.investigationService.update(req.params.id, req.body);
        const response = {
            success: true,
            message: 'Investigation updated',
            data: { investigation },
        };
        res.json(response);
    }
    /**
     * DELETE /api/v1/investigations/:id
     * Delete investigation
     */
    async delete(req, res) {
        await services_1.investigationService.delete(req.params.id);
        const response = {
            success: true,
            message: 'Investigation deleted',
        };
        res.json(response);
    }
    /**
     * GET /api/v1/investigations/stats
     * Get investigation statistics
     */
    async getStats(req, res) {
        const stats = await services_1.investigationService.getStats();
        const response = {
            success: true,
            message: 'Statistics retrieved',
            data: { stats },
        };
        res.json(response);
    }
}
exports.InvestigationController = InvestigationController;
exports.investigationController = new InvestigationController();
exports.default = exports.investigationController;
//# sourceMappingURL=investigation.controller.js.map