"use strict";
/**
 * Chain of Custody Controller
 * Handles chain-of-custody and evidence lineage endpoints
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.custodyController = exports.CustodyController = void 0;
const custody_service_1 = require("../services/custody.service");
const custody_model_1 = require("../models/custody.model");
class CustodyController {
    /**
     * GET /api/v1/custody/chain/:evidenceId
     * Get chain of custody visualization
     */
    async getChainOfCustody(req, res) {
        try {
            const { evidenceId } = req.params;
            const chain = await custody_service_1.chainOfCustodyService.getChainVisualization(evidenceId);
            if (!chain) {
                res.status(404).json({
                    success: false,
                    message: 'Chain of custody not found',
                });
                return;
            }
            const response = {
                success: true,
                message: 'Chain of custody retrieved',
                data: { chain },
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to get chain of custody',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * GET /api/v1/custody/timeline/:evidenceId
     * Get full custody timeline
     */
    async getCustodyTimeline(req, res) {
        try {
            const { evidenceId } = req.params;
            const timeline = await custody_service_1.chainOfCustodyService.getCustodyTimeline(evidenceId);
            const response = {
                success: true,
                message: 'Custody timeline retrieved',
                data: { timeline },
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to get custody timeline',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * POST /api/v1/custody/event
     * Add custody event
     */
    async addCustodyEvent(req, res) {
        try {
            const { evidenceId, eventType, details, investigationId } = req.body;
            if (!evidenceId || !eventType || !details) {
                res.status(400).json({
                    success: false,
                    message: 'Evidence ID, event type, and details are required',
                });
                return;
            }
            const chain = await custody_service_1.chainOfCustodyService.addEvent({
                evidenceId,
                eventType,
                performedBy: req.user?.id || 'system',
                performedByName: req.user?.username || 'System',
                details,
                investigationId,
                integrityStatus: custody_model_1.IntegrityStatus.PENDING_VERIFICATION,
            });
            const response = {
                success: true,
                message: 'Custody event added',
                data: { chain },
            };
            res.status(201).json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to add custody event',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * GET /api/v1/custody/verification-history/:evidenceId
     * Get verification history
     */
    async getVerificationHistory(req, res) {
        try {
            const { evidenceId } = req.params;
            const { limit } = req.query;
            const history = await custody_service_1.chainOfCustodyService.getVerificationHistory(evidenceId, limit ? parseInt(limit) : 100);
            const response = {
                success: true,
                message: 'Verification history retrieved',
                data: { history },
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to get verification history',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * POST /api/v1/custody/transfer
     * Transfer custody
     */
    async transferCustody(req, res) {
        try {
            const { evidenceId, newHolderId, newHolderName } = req.body;
            if (!evidenceId || !newHolderId || !newHolderName) {
                res.status(400).json({
                    success: false,
                    message: 'Evidence ID, new holder ID, and new holder name are required',
                });
                return;
            }
            await custody_service_1.chainOfCustodyService.transferCustody(evidenceId, newHolderId, newHolderName, req.user?.id || 'system', req.user?.username || 'System');
            const response = {
                success: true,
                message: 'Custody transferred',
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to transfer custody',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * GET /api/v1/custody/lineage-graph/:investigationId
     * Get evidence lineage graph
     */
    async getLineageGraph(req, res) {
        try {
            const { investigationId } = req.params;
            const graph = await custody_service_1.chainOfCustodyService.getEvidenceLineageGraph(investigationId);
            const response = {
                success: true,
                message: 'Evidence lineage graph retrieved',
                data: graph,
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to get lineage graph',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * GET /api/v1/custody/integrity-stats
     * Get integrity statistics
     */
    async getIntegrityStats(req, res) {
        try {
            const stats = await custody_service_1.chainOfCustodyService.getIntegrityStatistics();
            const response = {
                success: true,
                message: 'Integrity statistics retrieved',
                data: { stats },
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to get integrity statistics',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * GET /api/v1/custody/tamper-investigations
     * Get open tamper investigations
     */
    async getTamperInvestigations(req, res) {
        try {
            const investigations = await custody_service_1.chainOfCustodyService.getOpenTamperInvestigations();
            const response = {
                success: true,
                message: 'Tamper investigations retrieved',
                data: { investigations },
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to get tamper investigations',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * POST /api/v1/custody/tamper-investigation
     * Create tamper investigation
     */
    async createTamperInvestigation(req, res) {
        try {
            const { evidenceId, expectedHash, actualHash, severity } = req.body;
            if (!evidenceId || !expectedHash || !actualHash) {
                res.status(400).json({
                    success: false,
                    message: 'Evidence ID, expected hash, and actual hash are required',
                });
                return;
            }
            const investigation = await custody_service_1.chainOfCustodyService.createTamperInvestigation(evidenceId, expectedHash, actualHash, severity || 'high');
            const response = {
                success: true,
                message: 'Tamper investigation created',
                data: { investigation },
            };
            res.status(201).json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to create tamper investigation',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * POST /api/v1/custody/tamper-investigation/:investigationId/update
     * Update tamper investigation
     */
    async updateTamperInvestigation(req, res) {
        try {
            const { investigationId } = req.params;
            const updates = req.body;
            await custody_service_1.chainOfCustodyService.updateTamperInvestigation(investigationId, updates);
            const response = {
                success: true,
                message: 'Tamper investigation updated',
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to update tamper investigation',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * POST /api/v1/custody/report
     * Generate verification report
     */
    async generateReport(req, res) {
        try {
            const { investigationId, evidenceIds, reportType } = req.body;
            if (!investigationId || !evidenceIds || !reportType) {
                res.status(400).json({
                    success: false,
                    message: 'Investigation ID, evidence IDs, and report type are required',
                });
                return;
            }
            const report = await custody_service_1.chainOfCustodyService.generateVerificationReport(investigationId, evidenceIds, reportType, req.user?.id || 'system', req.user?.username || 'System');
            const response = {
                success: true,
                message: 'Verification report generated',
                data: { report },
            };
            res.status(201).json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to generate report',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * POST /api/v1/custody/report/:reportId/export
     * Export verification report
     */
    async exportReport(req, res) {
        try {
            const { reportId } = req.params;
            const { exportFormat } = req.body;
            const report = await custody_service_1.chainOfCustodyService.exportReport(reportId, exportFormat || 'json', req.user?.id || 'system');
            const response = {
                success: true,
                message: 'Report exported',
                data: { report },
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to export report',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
}
exports.CustodyController = CustodyController;
exports.custodyController = new CustodyController();
exports.default = exports.custodyController;
//# sourceMappingURL=custody.controller.js.map