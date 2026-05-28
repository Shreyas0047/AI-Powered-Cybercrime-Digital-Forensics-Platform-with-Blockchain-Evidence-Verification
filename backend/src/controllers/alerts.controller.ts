/**
 * Alerts Controller
 * Handles alert management endpoints
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware';
import { ApiResponse } from '../types';
import { Alert, AlertStatus } from '../models';

export class AlertController {
  /**
   * GET /api/v1/alerts
   * List all alerts with pagination and search
   */
  async findAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      severity,
      type,
    } = req.query as Record<string, any>;

    const query: Record<string, any> = {};

    if (status) {
      query.status = status;
    }

    if (severity) {
      query.severity = severity;
    }

    if (type) {
      query.type = type;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Alert.countDocuments(query);
    const totalPages = Math.ceil(total / Math.min(Number(limit), 100));

    const alerts = await Alert.find(query)
      .sort({ detectedAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Math.min(Number(limit), 100))
      .populate('assignedTo', 'firstName lastName email')
      .populate('acknowledgedBy', 'firstName lastName email')
      .populate('resolvedBy', 'firstName lastName email')
      .lean();

    const response: ApiResponse = {
      success: true,
      message: 'Alerts retrieved',
      data: alerts,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
      },
    };

    res.json(response);
  }

  /**
   * GET /api/v1/alerts/:id
   * Get alert by ID
   */
  async findById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const alert = await Alert.findById(req.params.id)
      .populate('assignedTo', 'firstName lastName email')
      .populate('acknowledgedBy', 'firstName lastName email')
      .populate('resolvedBy', 'firstName lastName email')
      .lean();

    if (!alert) {
      res.status(404).json({
        success: false,
        message: 'Alert not found',
      });
      return;
    }

    const response: ApiResponse = {
      success: true,
      message: 'Alert retrieved',
      data: { alert },
    };

    res.json(response);
  }

  /**
   * POST /api/v1/alerts/:id/acknowledge
   * Acknowledge an alert
   */
  async acknowledge(req: AuthenticatedRequest, res: Response): Promise<void> {
    const alert = await Alert.findById(req.params.id);

    if (!alert) {
      res.status(404).json({
        success: false,
        message: 'Alert not found',
      });
      return;
    }

    alert.status = AlertStatus.ACKNOWLEDGED;
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = req.user?._id;
    alert.acknowledgmentNote = req.body.note;

    await alert.save();

    const response: ApiResponse = {
      success: true,
      message: 'Alert acknowledged',
      data: { alert },
    };

    res.json(response);
  }

  /**
   * POST /api/v1/alerts/:id/resolve
   * Resolve an alert
   */
  async resolve(req: AuthenticatedRequest, res: Response): Promise<void> {
    const alert = await Alert.findById(req.params.id);

    if (!alert) {
      res.status(404).json({
        success: false,
        message: 'Alert not found',
      });
      return;
    }

    alert.status = AlertStatus.RESOLVED;
    alert.resolvedAt = new Date();
    alert.resolvedBy = req.user?._id;
    alert.resolution = {
      summary: req.body.summary || req.body.resolution?.summary || '',
      rootCause: req.body.rootCause || req.body.resolution?.rootCause || '',
      actionTaken: req.body.actionTaken || req.body.resolution?.actionTaken || '',
      falsePositive: req.body.falsePositive || false,
      escalated: req.body.escalated || false,
    };

    await alert.save();

    const response: ApiResponse = {
      success: true,
      message: 'Alert resolved',
      data: { alert },
    };

    res.json(response);
  }
}

export const alertController = new AlertController();
export default alertController;
