"use strict";
/**
 * User Management Service
 * Enterprise user administration with RBAC
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userService = exports.UserService = void 0;
const models_1 = require("../models");
const audit_log_model_1 = require("../models/audit-log.model");
const types_1 = require("../types");
const middleware_1 = require("../middleware");
const logger_1 = __importDefault(require("../config/logger"));
class UserService {
    /**
     * Create a new user (admin function)
     */
    async create(data) {
        // Check if user exists
        const existingUser = await models_1.User.findOne({ email: data.email.toLowerCase() });
        if (existingUser) {
            throw new middleware_1.ValidationError('Email already registered', [
                { field: 'email', message: 'A user with this email already exists' },
            ]);
        }
        // Verify creator can assign this role
        const creator = await models_1.User.findById(data.createdBy);
        if (!creator) {
            throw new middleware_1.ForbiddenError('Invalid creator');
        }
        if (!creator.canAssignRole(data.role)) {
            throw new middleware_1.ForbiddenError(`Cannot assign role ${data.role}`);
        }
        // Create user
        const user = await models_1.User.create({
            email: data.email.toLowerCase(),
            password: data.password,
            firstName: data.firstName,
            lastName: data.lastName,
            role: data.role,
            createdBy: data.createdBy,
        });
        // Audit
        await audit_log_model_1.AuditLog.log({
            userId: data.createdBy,
            action: types_1.AuditAction.USER_CREATE,
            entityType: 'User',
            entityId: user._id.toString(),
            ipAddress: data.ipAddress,
            status: 'success',
            details: { email: user.email, role: user.role },
        });
        logger_1.default.info(`User created by ${data.createdBy}: ${user.email} with role ${user.role}`);
        return user;
    }
    /**
     * Get all users with pagination
     */
    async findAll(options) {
        const { page, limit, search, role, isActive, sortBy = 'createdAt', sortOrder = 'desc' } = options;
        const query = {};
        if (search) {
            query.$or = [
                { email: { $regex: search, $options: 'i' } },
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
            ];
        }
        if (role)
            query.role = role;
        if (isActive !== undefined)
            query.isActive = isActive;
        const total = await models_1.User.countDocuments(query);
        const totalPages = Math.ceil(total / limit);
        const users = await models_1.User.find(query)
            .select('-password -failedLoginAttempts -lockedUntil')
            .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();
        return { users, total, totalPages };
    }
    /**
     * Get user by ID
     */
    async findById(id) {
        const user = await models_1.User.findById(id)
            .select('-password -failedLoginAttempts -lockedUntil')
            .lean();
        if (!user) {
            throw new middleware_1.NotFoundError('User');
        }
        return user;
    }
    /**
     * Update user
     */
    async update(id, data, updatedBy, ipAddress) {
        const user = await models_1.User.findById(id);
        if (!user) {
            throw new middleware_1.NotFoundError('User');
        }
        // Only allow updating own profile name, or admin can update others
        const updater = await models_1.User.findById(updatedBy);
        if (id !== updatedBy && !updater.canManageUser(user)) {
            throw new middleware_1.ForbiddenError('Cannot update this user');
        }
        // Update fields
        if (data.firstName)
            user.firstName = data.firstName;
        if (data.lastName)
            user.lastName = data.lastName;
        if (data.email)
            user.email = data.email.toLowerCase();
        await user.save();
        // Audit
        await audit_log_model_1.AuditLog.log({
            userId: updatedBy,
            action: types_1.AuditAction.USER_UPDATE,
            entityType: 'User',
            entityId: id,
            ipAddress,
            status: 'success',
            details: { updatedFields: Object.keys(data) },
        });
        return user;
    }
    /**
     * Change user role
     */
    async changeRole(userId, newRole, changedBy, ipAddress) {
        const user = await models_1.User.findById(userId);
        if (!user) {
            throw new middleware_1.NotFoundError('User');
        }
        const changer = await models_1.User.findById(changedBy);
        if (!changer.canAssignRole(newRole)) {
            throw new middleware_1.ForbiddenError('Cannot assign this role');
        }
        if (!changer.canManageUser(user)) {
            throw new middleware_1.ForbiddenError('Cannot change role of this user');
        }
        const oldRole = user.role;
        user.role = newRole;
        await user.save();
        // Audit
        await audit_log_model_1.AuditLog.log({
            userId: changedBy,
            action: types_1.AuditAction.USER_ROLE_CHANGE,
            entityType: 'User',
            entityId: userId,
            ipAddress,
            status: 'success',
            details: { oldRole, newRole },
        });
        logger_1.default.info(`User ${userId} role changed from ${oldRole} to ${newRole} by ${changedBy}`);
        return user;
    }
    /**
     * Activate/deactivate user
     */
    async setActive(userId, isActive, changedBy, ipAddress) {
        const user = await models_1.User.findById(userId);
        if (!user) {
            throw new middleware_1.NotFoundError('User');
        }
        const changer = await models_1.User.findById(changedBy);
        if (!changer.canManageUser(user)) {
            throw new middleware_1.ForbiddenError('Cannot modify this user');
        }
        user.isActive = isActive;
        if (isActive) {
            user.isLocked = false;
            user.lockedUntil = undefined;
            user.failedLoginAttempts = 0;
        }
        await user.save();
        // Audit
        await audit_log_model_1.AuditLog.log({
            userId: changedBy,
            action: isActive ? types_1.AuditAction.USER_ACTIVATE : types_1.AuditAction.USER_DEACTIVATE,
            entityType: 'User',
            entityId: userId,
            ipAddress,
            status: 'success',
        });
        logger_1.default.info(`User ${userId} ${isActive ? 'activated' : 'deactivated'} by ${changedBy}`);
        return user;
    }
    /**
     * Unlock locked user
     */
    async unlock(userId, unlockedBy, ipAddress) {
        const user = await models_1.User.findById(userId);
        if (!user) {
            throw new middleware_1.NotFoundError('User');
        }
        user.isLocked = false;
        user.lockedUntil = undefined;
        user.failedLoginAttempts = 0;
        await user.save();
        await audit_log_model_1.AuditLog.log({
            userId: unlockedBy,
            action: types_1.AuditAction.USER_UPDATE,
            entityType: 'User',
            entityId: userId,
            ipAddress,
            status: 'success',
            details: { action: 'unlock' },
        });
        logger_1.default.info(`User ${userId} unlocked by ${unlockedBy}`);
        return user;
    }
    /**
     * Delete user (soft delete - deactivate)
     */
    async delete(userId, deletedBy, ipAddress) {
        const user = await models_1.User.findById(userId);
        if (!user) {
            throw new middleware_1.NotFoundError('User');
        }
        const deleter = await models_1.User.findById(deletedBy);
        if (!deleter.canManageUser(user)) {
            throw new middleware_1.ForbiddenError('Cannot delete this user');
        }
        // Instead of hard delete, deactivate
        user.isActive = false;
        await user.save();
        await audit_log_model_1.AuditLog.log({
            userId: deletedBy,
            action: types_1.AuditAction.USER_DELETE,
            entityType: 'User',
            entityId: userId,
            ipAddress,
            status: 'success',
        });
        logger_1.default.info(`User ${userId} deactivated by ${deletedBy}`);
    }
    /**
     * Get user statistics
     */
    async getStats() {
        const total = await models_1.User.countDocuments();
        const active = await models_1.User.countDocuments({ isActive: true });
        const locked = await models_1.User.countDocuments({ isLocked: true });
        const byRole = await models_1.User.aggregate([
            { $group: { _id: '$role', count: { $sum: 1 } } },
        ]);
        return {
            total,
            active,
            locked,
            byRole: byRole.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {}),
        };
    }
}
exports.UserService = UserService;
exports.userService = new UserService();
exports.default = exports.userService;
//# sourceMappingURL=user.service.js.map