/**
 * Evidence Artifacts Controller
 * Handles forensic evidence artifact endpoints
 */

import { Response } from 'express';
import { evidenceArtifactsService } from '../services';
import { AuthenticatedRequest } from '../middleware';
import type { ApiResponse } from '../types';
import type { EvidenceArtifactCategory } from '../types/reports';

export class EvidenceArtifactsController {
  async findAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { page = 1, limit = 20, category, search, source } = req.query as Record<string, string>;

    const result = await evidenceArtifactsService.getArtifacts({
      page: Number(page),
      limit: Number(limit),
      category: category as EvidenceArtifactCategory,
      search,
      source,
    });

    const response: ApiResponse = {
      success: true,
      message: 'Artifacts retrieved',
      data: result.artifacts,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total: result.total,
        totalPages: Math.ceil(result.total / Number(limit)),
      },
    };

    res.json(response);
  }

  async findById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const artifact = await evidenceArtifactsService.getArtifactById(req.params.id);

    if (!artifact) {
      res.status(404).json({
        success: false,
        message: 'Artifact not found',
      });
      return;
    }

    const response: ApiResponse = {
      success: true,
      message: 'Artifact retrieved',
      data: artifact,
    };

    res.json(response);
  }
}

export const evidenceArtifactsController = new EvidenceArtifactsController();
export default evidenceArtifactsController;