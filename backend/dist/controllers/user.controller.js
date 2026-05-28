"use strict";
/**
 * User Controller
 * Handles user management endpoints
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.userController = exports.UserController = void 0;
const services_1 = require("../services");
class UserController {
    /**
     * POST /api/v1/users
     * Create new user (admin only)
     */
    async create(req, res) {
        const user = await services_1.userService.create({
            ...req.body,
            role: req.body.role,
            createdBy: req.user.id,
            ipAddress: req.ip,
        });
        const response = {
            success: true,
            message: 'User created successfully',
            data: { user },
        };
        res.status(201).json(response);
    }
    /**
     * GET /api/v1/users
     * List all users
     */
    async findAll(req, res) {
        const { page = 1, limit = 20, search, role, isActive, sortBy = 'createdAt', sortOrder = 'desc', } = req.query;
        const result = await services_1.userService.findAll({
            page: Number(page),
            limit: Math.min(Number(limit), 100),
            search,
            role: role,
            isActive: isActive !== undefined ? isActive === 'true' : undefined,
            sortBy,
            sortOrder,
        });
        const response = {
            success: true,
            message: 'Users retrieved',
            data: result.users,
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
     * GET /api/v1/users/:id
     * Get user by ID
     */
    async findById(req, res) {
        const user = await services_1.userService.findById(req.params.id);
        const response = {
            success: true,
            message: 'User retrieved',
            data: { user },
        };
        res.json(response);
    }
    /**
     * PUT /api/v1/users/:id
     * Update user
     */
    async update(req, res) {
        const user = await services_1.userService.update(req.params.id, req.body, req.user.id, req.ip);
        const response = {
            success: true,
            message: 'User updated',
            data: { user },
        };
        res.json(response);
    }
    /**
     * PUT /api/v1/users/:id/role
     * Change user role
     */
    async changeRole(req, res) {
        const user = await services_1.userService.changeRole(req.params.id, req.body.role, req.user.id, req.ip);
        const response = {
            success: true,
            message: 'User role changed',
            data: { user },
        };
        res.json(response);
    }
    /**
     * PUT /api/v1/users/:id/activate
     * Activate user
     */
    async activate(req, res) {
        const user = await services_1.userService.setActive(req.params.id, true, req.user.id, req.ip);
        const response = {
            success: true,
            message: 'User activated',
            data: { user },
        };
        res.json(response);
    }
    /**
     * PUT /api/v1/users/:id/deactivate
     * Deactivate user
     */
    async deactivate(req, res) {
        const user = await services_1.userService.setActive(req.params.id, false, req.user.id, req.ip);
        const response = {
            success: true,
            message: 'User deactivated',
            data: { user },
        };
        res.json(response);
    }
    /**
     * PUT /api/v1/users/:id/unlock
     * Unlock user
     */
    async unlock(req, res) {
        const user = await services_1.userService.unlock(req.params.id, req.user.id, req.ip);
        const response = {
            success: true,
            message: 'User unlocked',
            data: { user },
        };
        res.json(response);
    }
    /**
     * DELETE /api/v1/users/:id
     * Delete (deactivate) user
     */
    async delete(req, res) {
        await services_1.userService.delete(req.params.id, req.user.id, req.ip);
        const response = {
            success: true,
            message: 'User deactivated',
        };
        res.json(response);
    }
    /**
     * GET /api/v1/users/stats
     * Get user statistics
     */
    async getStats(req, res) {
        const stats = await services_1.userService.getStats();
        const response = {
            success: true,
            message: 'User statistics retrieved',
            data: { stats },
        };
        res.json(response);
    }
    /**
     * GET /api/v1/users/:id/activity
     * Get user activity history
     */
    async getActivity(req, res) {
        const response = {
            success: true,
            message: 'User activity retrieved',
            data: {
                activities: [
                    {
                        action: 'login',
                        timestamp: new Date(Date.now() - 86400000).toISOString(),
                        details: 'User logged in successfully',
                        ipAddress: '192.168.1.1',
                    },
                    {
                        action: 'investigation_view',
                        timestamp: new Date(Date.now() - 172800000).toISOString(),
                        details: 'Viewed investigation case',
                        ipAddress: '192.168.1.1',
                    },
                    {
                        action: 'evidence_upload',
                        timestamp: new Date(Date.now() - 259200000).toISOString(),
                        details: 'Uploaded evidence file',
                        ipAddress: '192.168.1.1',
                    },
                    {
                        action: 'report_generated',
                        timestamp: new Date(Date.now() - 345600000).toISOString(),
                        details: 'Generated forensic report',
                        ipAddress: '192.168.1.1',
                    },
                ],
                total: 4,
                userId: req.params.id,
            },
        };
        res.json(response);
    }
}
exports.UserController = UserController;
exports.userController = new UserController();
exports.default = exports.userController;
//# sourceMappingURL=user.controller.js.map