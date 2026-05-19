"use strict";
/**
 * Threat Intelligence Controller
 * Handles IOC and threat intelligence endpoints
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.threatIntelligenceController = exports.ThreatIntelligenceController = void 0;
const threat_intelligence_service_1 = require("../services/threat-intelligence.service");
const threat_model_1 = require("../models/threat.model");
class ThreatIntelligenceController {
    /**
     * POST /api/v1/threat/ioc
     * Create IOC
     */
    async createIOC(req, res) {
        try {
            const { type, value, severity, category, description, source, confidence, mitreTactics, mitreTechniques, tags } = req.body;
            if (!type || !value || !category || !source) {
                res.status(400).json({
                    success: false,
                    message: 'Type, value, category, and source are required',
                });
                return;
            }
            const ioc = await threat_intelligence_service_1.threatIntelligenceService.createIOC({
                type,
                value,
                severity: severity || threat_model_1.IOCSeverity.MEDIUM,
                category,
                description,
                source,
                confidence,
                mitreTactics,
                mitreTechniques,
                tags,
            }, req.user?.id || 'system');
            const response = {
                success: true,
                message: 'IOC created',
                data: { ioc },
            };
            res.status(201).json(response);
        }
        catch (error) {
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
    async getIOC(req, res) {
        try {
            const { iocId } = req.params;
            const ioc = await threat_intelligence_service_1.threatIntelligenceService.getIOC(iocId);
            if (!ioc) {
                res.status(404).json({
                    success: false,
                    message: 'IOC not found',
                });
                return;
            }
            const response = {
                success: true,
                message: 'IOC retrieved',
                data: { ioc },
            };
            res.json(response);
        }
        catch (error) {
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
    async searchIOCs(req, res) {
        try {
            const { type, severity, status, category, search, tags, limit, skip } = req.query;
            const result = await threat_intelligence_service_1.threatIntelligenceService.searchIOCs({
                type: type,
                severity: severity,
                status: status,
                category: category,
                search: search,
                tags: tags ? tags.split(',') : undefined,
                limit: limit ? parseInt(limit) : 50,
                skip: skip ? parseInt(skip) : 0,
            });
            const response = {
                success: true,
                message: 'IOCs retrieved',
                data: result,
            };
            res.json(response);
        }
        catch (error) {
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
    async updateIOCStatus(req, res) {
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
            await threat_intelligence_service_1.threatIntelligenceService.updateIOCStatus(iocId, status, notes);
            const response = {
                success: true,
                message: 'IOC status updated',
            };
            res.json(response);
        }
        catch (error) {
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
    async linkIOCToEvidence(req, res) {
        try {
            const { iocId, evidenceId } = req.body;
            if (!iocId || !evidenceId) {
                res.status(400).json({
                    success: false,
                    message: 'IOC ID and evidence ID are required',
                });
                return;
            }
            await threat_intelligence_service_1.threatIntelligenceService.linkIOCToEvidence(iocId, evidenceId);
            const response = {
                success: true,
                message: 'IOC linked to evidence',
            };
            res.json(response);
        }
        catch (error) {
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
    async matchIOCs(req, res) {
        try {
            const { evidenceHashes } = req.body;
            if (!evidenceHashes || !Array.isArray(evidenceHashes)) {
                res.status(400).json({
                    success: false,
                    message: 'Evidence hashes array is required',
                });
                return;
            }
            const matched = await threat_intelligence_service_1.threatIntelligenceService.matchIOCs(evidenceHashes);
            const response = {
                success: true,
                message: `Found ${matched.length} matching IOCs`,
                data: { matched },
            };
            res.json(response);
        }
        catch (error) {
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
    async correlateEvidence(req, res) {
        try {
            const { evidenceId } = req.params;
            const result = await threat_intelligence_service_1.threatIntelligenceService.correlateEvidence(evidenceId);
            const response = {
                success: true,
                message: 'Evidence correlation retrieved',
                data: result,
            };
            res.json(response);
        }
        catch (error) {
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
    async createCorrelation(req, res) {
        try {
            const { correlationType, entities, strength, description, clusterId, clusterLabel } = req.body;
            if (!correlationType || !entities || !strength || !description) {
                res.status(400).json({
                    success: false,
                    message: 'Correlation type, entities, strength, and description are required',
                });
                return;
            }
            const correlation = await threat_intelligence_service_1.threatIntelligenceService.createCorrelation({
                correlationType,
                entities,
                strength,
                description,
                clusterId,
                clusterLabel,
            });
            const response = {
                success: true,
                message: 'Correlation created',
                data: { correlation },
            };
            res.status(201).json(response);
        }
        catch (error) {
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
    async enrichInvestigation(req, res) {
        try {
            const { investigationId } = req.params;
            const result = await threat_intelligence_service_1.threatIntelligenceService.enrichInvestigation(investigationId);
            const response = {
                success: true,
                message: 'Investigation enriched',
                data: result,
            };
            res.json(response);
        }
        catch (error) {
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
    async generateAnalytics(req, res) {
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
            const analytics = await threat_intelligence_service_1.threatIntelligenceService.generateAnalytics(type, { start: new Date(startDate), end: new Date(endDate) });
            const response = {
                success: true,
                message: 'Analytics generated',
                data: { analytics },
            };
            res.json(response);
        }
        catch (error) {
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
    async getStats(req, res) {
        try {
            const stats = await threat_intelligence_service_1.threatIntelligenceService.getIOCStatistics();
            const response = {
                success: true,
                message: 'Statistics retrieved',
                data: { stats },
            };
            res.json(response);
        }
        catch (error) {
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
    async getThreatGraph(req, res) {
        try {
            const { investigationId } = req.query;
            const graph = await threat_intelligence_service_1.threatIntelligenceService.getThreatGraph(investigationId);
            const response = {
                success: true,
                message: 'Threat graph retrieved',
                data: graph,
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to get threat graph',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
}
exports.ThreatIntelligenceController = ThreatIntelligenceController;
exports.threatIntelligenceController = new ThreatIntelligenceController();
exports.default = exports.threatIntelligenceController;
//# sourceMappingURL=threat.controller.js.map