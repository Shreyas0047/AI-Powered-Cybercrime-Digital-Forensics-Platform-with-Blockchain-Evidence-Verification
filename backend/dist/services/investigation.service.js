"use strict";
/**
 * Investigation Service
 * Business logic for investigation management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.investigationService = exports.InvestigationService = void 0;
const models_1 = require("../models");
const types_1 = require("../types");
const middleware_1 = require("../middleware");
const uuid_1 = require("uuid");
class InvestigationService {
    /**
     * Create a new investigation
     */
    async create(data) {
        // Generate case number if not provided
        const caseNumber = data.caseNumber || this.generateCaseNumber();
        // Check for duplicate case number
        const existing = await models_1.Investigation.findOne({ caseNumber });
        if (existing) {
            throw new middleware_1.ValidationError('Case number already exists', [
                { field: 'caseNumber', message: 'An investigation with this case number already exists' },
            ]);
        }
        const investigation = await models_1.Investigation.create({
            title: data.title,
            description: data.description,
            priority: data.priority || types_1.InvestigationPriority.MEDIUM,
            caseNumber,
            assignedTo: data.assignedTo,
            createdBy: data.createdBy,
            tags: data.tags || [],
        });
        return investigation;
    }
    /**
     * Get all investigations with pagination and filters
     */
    async findAll(options) {
        const { page, limit, status, priority, assignedTo, search, sortBy = 'createdAt', sortOrder = 'desc' } = options;
        // Build query
        const query = {};
        if (status)
            query.status = status;
        if (priority)
            query.priority = priority;
        if (assignedTo)
            query.assignedTo = assignedTo;
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { caseNumber: { $regex: search, $options: 'i' } },
            ];
        }
        // Execute query
        const total = await models_1.Investigation.countDocuments(query);
        const totalPages = Math.ceil(total / limit);
        const investigations = await models_1.Investigation.find(query)
            .populate('assignedTo', 'firstName lastName email')
            .populate('createdBy', 'firstName lastName email')
            .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();
        return { investigations: investigations, total, totalPages };
    }
    /**
     * Get investigation by ID
     */
    async findById(id) {
        const investigation = await models_1.Investigation.findById(id)
            .populate('assignedTo', 'firstName lastName email')
            .populate('createdBy', 'firstName lastName email')
            .lean();
        if (!investigation) {
            throw new middleware_1.NotFoundError('Investigation');
        }
        return investigation;
    }
    /**
     * Update investigation
     */
    async update(id, data) {
        const investigation = await models_1.Investigation.findById(id);
        if (!investigation) {
            throw new middleware_1.NotFoundError('Investigation');
        }
        // Handle status change to closed
        if (data.status === types_1.InvestigationStatus.CLOSED && investigation.status !== types_1.InvestigationStatus.CLOSED) {
            data.status = types_1.InvestigationStatus.CLOSED;
            investigation.closedAt = new Date();
        }
        Object.assign(investigation, data);
        await investigation.save();
        return investigation;
    }
    /**
     * Delete investigation
     */
    async delete(id) {
        const result = await models_1.Investigation.findByIdAndDelete(id);
        if (!result) {
            throw new middleware_1.NotFoundError('Investigation');
        }
    }
    /**
     * Get investigation statistics
     */
    async getStats() {
        const total = await models_1.Investigation.countDocuments();
        const byStatus = await models_1.Investigation.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]);
        const byPriority = await models_1.Investigation.aggregate([
            { $group: { _id: '$priority', count: { $sum: 1 } } },
        ]);
        return {
            total,
            byStatus: byStatus.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
            byPriority: byPriority.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
        };
    }
    /**
     * Generate unique case number
     */
    generateCaseNumber() {
        const year = new Date().getFullYear();
        const uuid = (0, uuid_1.v4)().split('-')[0].toUpperCase();
        return `CASE-${year}-${uuid}`;
    }
}
exports.InvestigationService = InvestigationService;
exports.investigationService = new InvestigationService();
exports.default = exports.investigationService;
//# sourceMappingURL=investigation.service.js.map