/**
 * Logs Controller
 * Handles log retrieval endpoints
 */

import { Response } from 'express';
import { logsService } from '../services';
import { AuthenticatedRequest } from '../middleware';
import type { ApiResponse, LogEntry } from '../types';
import { AuditLog } from '../models/audit-log.model';

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

  /**
   * GET /api/v1/logs/audit
   * Returns historical audit log records (User Login, Evidence Uploaded,
   * Session Started/Completed, etc.) from the AuditLog MongoDB collection.
   * Used by the Audit Log page to show the structured event trail.
   */
  async getAuditLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    const {
      page = 1,
      limit = 100,
      action,
      userId,
      entityType,
      status,
      search,
    } = req.query as Record<string, string>;

    const filter: Record<string, any> = {};
    if (action) filter.action = { $regex: action, $options: 'i' };
    if (userId) filter.userId = userId;
    if (entityType) filter.entityType = entityType;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { action: { $regex: search, $options: 'i' } },
        { entityType: { $regex: search, $options: 'i' } },
        { entityId: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(500, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('userId', 'username email firstName lastName')
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    const response: ApiResponse = {
      success: true,
      message: 'Audit logs retrieved',
      data: items.map((entry: any) => ({
        id: entry._id?.toString() || entry.id,
        timestamp: entry.timestamp,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        status: entry.status,
        details: entry.details,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        errorMessage: entry.errorMessage,
        user: entry.userId
          ? {
              id: entry.userId._id?.toString() || entry.userId.id || String(entry.userId),
              username: entry.userId.username,
              email: entry.userId.email,
              name: entry.userId.firstName && entry.userId.lastName
                ? `${entry.userId.firstName} ${entry.userId.lastName}`
                : undefined,
            }
          : null,
      })),
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };

    res.json(response);
  }

  /**
   * GET /api/v1/logs/audit/stats
   * Counts audit events by action and status for dashboard summary.
   */
  async getAuditStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    const [byAction, byStatus, total] = await Promise.all([
      AuditLog.aggregate([
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]),
      AuditLog.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      AuditLog.countDocuments({}),
    ]);

    const response: ApiResponse = {
      success: true,
      message: 'Audit stats retrieved',
      data: {
        total,
        byAction: byAction.map((r: any) => ({ action: r._id, count: r.count })),
        byStatus: byStatus.reduce((acc: Record<string, number>, r: any) => {
          acc[r._id || 'unknown'] = r.count;
          return acc;
        }, {}),
      },
    };

    res.json(response);
  }
}

export const logsController = new LogsController();
export default logsController;