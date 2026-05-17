/**
 * Analytics Controller
 * Handles behavioral analytics and investigation correlation endpoints
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware';
import { ApiResponse } from '../types';
import { behavioralAnalyticsService, Anomaly, ProcessBehavior } from '../services/behavioral-analytics.service';
import { investigationCorrelationService, InvestigationCluster, InvestigationRelationship, CorrelationInsight } from '../services/investigation-correlation.service';

export class AnalyticsController {
  /**
   * GET /api/v1/analytics/patterns
   * Get behavioral patterns
   */
  async getBehavioralPatterns(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const patterns = behavioralAnalyticsService.getBehavioralPatterns();

      const response: ApiResponse = {
        success: true,
        message: 'Behavioral patterns retrieved',
        data: { patterns },
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get behavioral patterns',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/v1/analytics/analyze-behavior
   * Analyze process behavior
   */
  async analyzeProcessBehavior(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { evidenceId } = req.body;

      if (!evidenceId) {
        res.status(400).json({
          success: false,
          message: 'Evidence ID is required',
        });
        return;
      }

      const behavior = await behavioralAnalyticsService.analyzeProcessBehavior(evidenceId);

      const response: ApiResponse = {
        success: true,
        message: 'Process behavior analyzed',
        data: { behavior },
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to analyze process behavior',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/v1/analytics/detect-anomalies
   * Detect anomalies in evidence
   */
  async detectAnomalies(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { evidenceId } = req.body;

      if (!evidenceId) {
        res.status(400).json({
          success: false,
          message: 'Evidence ID is required',
        });
        return;
      }

      const anomalies = await behavioralAnalyticsService.detectAnomalies(evidenceId);

      const response: ApiResponse = {
        success: true,
        message: `Detected ${anomalies.length} anomalies`,
        data: { anomalies },
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to detect anomalies',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/v1/analytics/baseline
   * Analyze behavioral baseline
   */
  async analyzeBaseline(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { investigationId } = req.body;

      if (!investigationId) {
        res.status(400).json({
          success: false,
          message: 'Investigation ID is required',
        });
        return;
      }

      const baseline = await behavioralAnalyticsService.analyzeBehavioralBaseline(investigationId);

      const response: ApiResponse = {
        success: true,
        message: 'Behavioral baseline analyzed',
        data: baseline,
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to analyze baseline',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/v1/analytics/clusters
   * Get investigation clusters
   */
  async getInvestigationClusters(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const clusters = await investigationCorrelationService.correlateInvestigations();

      const response: ApiResponse = {
        success: true,
        message: `Found ${clusters.length} investigation clusters`,
        data: { clusters },
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get investigation clusters',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/v1/analytics/clusters/:investigationId/relationships
   * Get relationships for specific investigation
   */
  async getInvestigationRelationships(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { investigationId } = req.params;

      const relationships = await investigationCorrelationService.getInvestigationRelationships(investigationId);

      const response: ApiResponse = {
        success: true,
        message: `Found ${relationships.length} relationships`,
        data: { relationships },
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get investigation relationships',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/v1/analytics/clusters/:investigationId/score
   * Score relationship between investigations
   */
  async scoreRelationship(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { investigationId } = req.params;
      const { targetInvestigationId } = req.body;

      if (!targetInvestigationId) {
        res.status(400).json({
          success: false,
          message: 'Target investigation ID is required',
        });
        return;
      }

      const score = await investigationCorrelationService.scoreRelationship(
        investigationId,
        targetInvestigationId
      );

      const response: ApiResponse = {
        success: true,
        message: 'Relationship scored',
        data: { score },
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to score relationship',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/v1/analytics/insights
   * Get correlation insights
   */
  async getCorrelationInsights(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { investigationId } = req.query;

      const insights = await investigationCorrelationService.generateCorrelationInsights(
        investigationId as string | undefined
      );

      const response: ApiResponse = {
        success: true,
        message: `Generated ${insights.length} insights`,
        data: { insights },
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get correlation insights',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/v1/analytics/cluster-visualization
   * Get cluster visualization data
   */
  async getClusterVisualization(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const visualization = await investigationCorrelationService.getClusterVisualization();

      const response: ApiResponse = {
        success: true,
        message: 'Cluster visualization retrieved',
        data: visualization,
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get cluster visualization',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/v1/analytics/dashboard
   * Get analytics dashboard data
   */
  async getDashboardData(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Gather all dashboard metrics
      const [clusters, insights, patterns] = await Promise.all([
        investigationCorrelationService.correlateInvestigations(),
        investigationCorrelationService.generateCorrelationInsights(),
        Promise.resolve(behavioralAnalyticsService.getBehavioralPatterns()),
      ]);

      const response: ApiResponse = {
        success: true,
        message: 'Dashboard data retrieved',
        data: {
          summary: {
            totalClusters: clusters.length,
            highSeverityInsights: insights.filter(i => i.severity === 'critical' || i.severity === 'high').length,
            totalPatterns: patterns.length,
            criticalPatterns: patterns.filter(p => p.severityWeight >= 75).length,
          },
          clusters: clusters.slice(0, 10),
          insights: insights.slice(0, 10),
          patterns: patterns.map(p => ({
            name: p.name,
            category: p.category,
            severity: p.severityWeight >= 75 ? 'high' : p.severityWeight >= 50 ? 'medium' : 'low',
            mitreTactics: p.mitreTactics,
          })),
        },
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get dashboard data',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export const analyticsController = new AnalyticsController();
export default analyticsController;
