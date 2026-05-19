"use strict";
/**
 * Evidence Artifacts Controller
 * Handles forensic evidence artifact endpoints
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.evidenceArtifactsController = exports.EvidenceArtifactsController = void 0;
const services_1 = require("../services");
class EvidenceArtifactsController {
    async findAll(req, res) {
        const { page = 1, limit = 20, category, search, source } = req.query;
        const result = await services_1.evidenceArtifactsService.getArtifacts({
            page: Number(page),
            limit: Number(limit),
            category: category,
            search,
            source,
        });
        const response = {
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
    async findById(req, res) {
        const artifact = await services_1.evidenceArtifactsService.getArtifactById(req.params.id);
        if (!artifact) {
            res.status(404).json({
                success: false,
                message: 'Artifact not found',
            });
            return;
        }
        const response = {
            success: true,
            message: 'Artifact retrieved',
            data: artifact,
        };
        res.json(response);
    }
}
exports.EvidenceArtifactsController = EvidenceArtifactsController;
exports.evidenceArtifactsController = new EvidenceArtifactsController();
exports.default = exports.evidenceArtifactsController;
//# sourceMappingURL=evidence-artifacts.controller.js.map