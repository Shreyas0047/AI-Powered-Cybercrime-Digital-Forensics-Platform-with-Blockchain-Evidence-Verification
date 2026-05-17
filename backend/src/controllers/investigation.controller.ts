/**
 * Investigation Controller
 * Handles investigation endpoints
 */

import { Response } from 'express';
import { investigationService } from '../services';
import { AuthenticatedRequest } from '../middleware';
import { ApiResponse } from '../types';

export class InvestigationController {
  /**
   * POST /api/v1/investigations
   * Create new investigation
   */
  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    const investigation = await investigationService.create({
      ...req.body,
      createdBy: req.user?.id,
    });

    const response: ApiResponse = {
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
  async findAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    const {
      page = 1,
      limit = 20,
      status,
      priority,
      assignedTo,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query as Record<string, any>;

    const result = await investigationService.findAll({
      page: Number(page),
      limit: Math.min(Number(limit), 100),
      status,
      priority,
      assignedTo,
      search,
      sortBy,
      sortOrder,
    });

    const response: ApiResponse = {
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
  async findById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const investigation = await investigationService.findById(req.params.id);

    const response: ApiResponse = {
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
  async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    const investigation = await investigationService.update(req.params.id, req.body);

    const response: ApiResponse = {
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
  async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    await investigationService.delete(req.params.id);

    const response: ApiResponse = {
      success: true,
      message: 'Investigation deleted',
    };

    res.json(response);
  }

  /**
   * GET /api/v1/investigations/stats
   * Get investigation statistics
   */
  async getStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    const stats = await investigationService.getStats();

    const response: ApiResponse = {
      success: true,
      message: 'Statistics retrieved',
      data: { stats },
    };

    res.json(response);
  }
}

export const investigationController = new InvestigationController();
export default investigationController;