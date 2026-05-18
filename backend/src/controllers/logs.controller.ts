/**
 * Logs Controller
 * Handles log retrieval endpoints
 */

import { Response } from 'express';
import { logsService } from '../services';
import { AuthenticatedRequest } from '../middleware';
import type { ApiResponse, LogEntry } from '../types';

export class LogsController {
  async findAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { page = 1, limit = 100, level, category, search, since } = req.query as Record<string, string>;

    const result = await logsService.getLogs({
      page: Number(page),
      limit: Number(limit),
      level: level as LogEntry['level'],
      category: category as LogEntry['category'],
      search,
      sinceSeconds: since ? Number(since) : undefined,
    });

    const response: ApiResponse = {
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

  async getStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    const stats = await logsService.getLogStats();

    const response: ApiResponse = {
      success: true,
      message: 'Log stats retrieved',
      data: stats,
    };

    res.json(response);
  }
}

export const logsController = new LogsController();
export default logsController;