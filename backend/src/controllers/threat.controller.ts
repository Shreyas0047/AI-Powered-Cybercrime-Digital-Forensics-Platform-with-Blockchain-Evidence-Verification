/**
 * Threat Intelligence Controller
 * Handles IOC and threat intelligence endpoints
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware';
import { ApiResponse } from '../types';
import { threatIntelligenceService } from '../services/threat-intelligence.service';
import { IOCTypes, IOCSeverity, IOCStatus } from '../models/threat.model';

export class ThreatIntelligenceController {
  /**
   * POST /api/v1/threat/ioc
   * Create IOC
   */
  async createIOC(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { type, value, severity, category, description, source, confidence, mitreTactics, mitreTechniques, tags } = req.body;

      if (!type || !value || !category || !source) {
        res.status(400).json({
          success: false,
          message: 'Type, value, category, and source are required',
        });
        return;
      }

      const ioc = await threatIntelligenceService.createIOC(
        {
          type,
          value,
          severity: severity || IOCSeverity.MEDIUM,
          category,
          description,
          source,
          confidence,
          mitreTactics,
          mitreTechniques,
          tags,
        },
        req.user?.id || 'system'
      );

      const response: ApiResponse = {
        success: true,
        message: 'IOC created',
        data: { ioc },
      };

      res.status(201).json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to create IOC',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/v1/threat/ioc/:iocId
   * Get IOC by ID
   */
  async getIOC(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { iocId } = req.params;

      const ioc = await threatIntelligenceService.getIOC(iocId);

      if (!ioc) {
        res.status(404).json({
          success: false,
          message: 'IOC not found',
        });
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'IOC retrieved',
        data: { ioc },
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get IOC',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/v1/threat/iocs
   * Search IOCs
   */
  async searchIOCs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { type, severity, status, category, search, tags, limit, skip } = req.query;

      const result = await threatIntelligenceService.searchIOCs({
        type: type as IOCTypes,
        severity: severity as IOCSeverity,
        status: status as IOCStatus,
        category: category as string,
        search: search as string,
        tags: tags ? (tags as string).split(',') : undefined,
        limit: limit ? parseInt(limit as string) : 50,
        skip: skip ? parseInt(skip as string) : 0,
      });

      const response: ApiResponse = {
        success: true,
        message: 'IOCs retrieved',
        data: result,
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to search IOCs',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * PATCH /api/v1/threat/ioc/:iocId/status
   * Update IOC status
   */
  async updateIOCStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { iocId } = req.params;
      const { status, notes } = req.body;

      if (!status) {
        res.status(400).json({
          success: false,
          message: 'Status is required',
        });
        return;
      }

      await threatIntelligenceService.updateIOCStatus(iocId, status, notes);

      const response: ApiResponse = {
        success: true,
        message: 'IOC status updated',
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update IOC status',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/v1/threat/ioc/link
   * Link IOC to evidence
   */
  async linkIOCToEvidence(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { iocId, evidenceId } = req.body;

      if (!iocId || !evidenceId) {
        res.status(400).json({
          success: false,
          message: 'IOC ID and evidence ID are required',
        });
        return;
      }

      await threatIntelligenceService.linkIOCToEvidence(iocId, evidenceId);

      const response: ApiResponse = {
        success: true,
        message: 'IOC linked to evidence',
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to link IOC',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/v1/threat/ioc/match
   * Match IOCs against evidence hashes
   */
  async matchIOCs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { evidenceHashes } = req.body;

      if (!evidenceHashes || !Array.isArray(evidenceHashes)) {
        res.status(400).json({
          success: false,
          message: 'Evidence hashes array is required',
        });
        return;
      }

      const matched = await threatIntelligenceService.matchIOCs(evidenceHashes);

      const response: ApiResponse = {
        success: true,
        message: `Found ${matched.length} matching IOCs`,
        data: { matched },
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to match IOCs',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/v1/threat/correlation/:evidenceId
   * Correlate evidence
   */
  async correlateEvidence(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { evidenceId } = req.params;

      const result = await threatIntelligenceService.correlateEvidence(evidenceId);

      const response: ApiResponse = {
        success: true,
        message: 'Evidence correlation retrieved',
        data: result,
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to correlate evidence',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/v1/threat/correlation
   * Create threat correlation
   */
  async createCorrelation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { correlationType, entities, strength, description, clusterId, clusterLabel } = req.body;

      if (!correlationType || !entities || !strength || !description) {
        res.status(400).json({
          success: false,
          message: 'Correlation type, entities, strength, and description are required',
        });
        return;
      }

      const correlation = await threatIntelligenceService.createCorrelation({
        correlationType,
        entities,
        strength,
        description,
        clusterId,
        clusterLabel,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Correlation created',
        data: { correlation },
      };

      res.status(201).json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to create correlation',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/v1/threat/enrich/:investigationId
   * Enrich investigation
   */
  async enrichInvestigation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { investigationId } = req.params;

      const result = await threatIntelligenceService.enrichInvestigation(investigationId);

      const response: ApiResponse = {
        success: true,
        message: 'Investigation enriched',
        data: result,
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to enrich investigation',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/v1/threat/analytics/:type
   * Generate threat analytics
   */
  async generateAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { type } = req.params;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          message: 'Start date and end date are required',
        });
        return;
      }

      const analytics = await threatIntelligenceService.generateAnalytics(
        type,
        { start: new Date(startDate as string), end: new Date(endDate as string) }
      );

      const response: ApiResponse = {
        success: true,
        message: 'Analytics generated',
        data: { analytics },
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to generate analytics',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/v1/threat/stats
   * Get IOC statistics
   */
  async getStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const stats = await threatIntelligenceService.getIOCStatistics();

      const response: ApiResponse = {
        success: true,
        message: 'Statistics retrieved',
        data: { stats },
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get statistics',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/v1/threat/graph
   * Get threat relationship graph
   */
  async getThreatGraph(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { investigationId } = req.query;

      const graph = await threatIntelligenceService.getThreatGraph(investigationId as string);

      const response: ApiResponse = {
        success: true,
        message: 'Threat graph retrieved',
        data: graph,
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get threat graph',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export const threatIntelligenceController = new ThreatIntelligenceController();
export default threatIntelligenceController;
