"use strict";
/**
 * Threat Intelligence Service
 * IOC management, correlation, and enrichment
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.threatIntelligenceService = exports.ThreatIntelligenceService = void 0;
const threat_model_1 = require("../models/threat.model");
const models_1 = require("../models");
const uuid_1 = require("uuid");
class ThreatIntelligenceService {
    /**
     * Create IOC
     */
    async createIOC(input, userId) {
        const iocId = `IOC-${input.type.split('_')[0].toUpperCase()}-${(0, uuid_1.v4)().substring(0, 8).toUpperCase()}`;
        // Calculate initial threat score
        const threatScore = this.calculateThreatScore(input);
        const ioc = await threat_model_1.IOC.create({
            iocId,
            type: input.type,
            value: input.value,
            severity: input.severity || threat_model_1.IOCSeverity.MEDIUM,
            status: threat_model_1.IOCStatus.ACTIVE,
            category: input.category,
            description: input.description,
            source: input.source,
            confidence: input.confidence || 50,
            mitreTactics: input.mitreTactics || [],
            mitreTechniques: input.mitreTechniques || [],
            tags: input.tags || [],
            linkedEvidence: input.linkedEvidence || [],
            linkedInvestigations: input.linkedInvestigations || [],
            threatScore,
            createdBy: userId,
        });
        return ioc;
    }
    /**
     * Get IOC by ID
     */
    async getIOC(iocId) {
        return await threat_model_1.IOC.findOne({ iocId })
            .populate('linkedEvidence')
            .populate('linkedInvestigations')
            .populate('createdBy', 'username email');
    }
    /**
     * Search IOCs
     */
    async searchIOCs(filters) {
        const query = {};
        if (filters.type)
            query.type = filters.type;
        if (filters.severity)
            query.severity = filters.severity;
        if (filters.status)
            query.status = filters.status;
        if (filters.category)
            query.category = filters.category;
        if (filters.tags && filters.tags.length > 0)
            query.tags = { $all: filters.tags };
        if (filters.search) {
            query.$or = [
                { value: { $regex: filters.search, $options: 'i' } },
                { description: { $regex: filters.search, $options: 'i' } },
                { iocId: { $regex: filters.search, $options: 'i' } },
            ];
        }
        const [iocs, total] = await Promise.all([
            threat_model_1.IOC.find(query)
                .sort({ threatScore: -1, createdAt: -1 })
                .limit(filters.limit || 50)
                .skip(filters.skip || 0)
                .lean(),
            threat_model_1.IOC.countDocuments(query),
        ]);
        return { iocs, total };
    }
    /**
     * Match IOCs against evidence
     */
    async matchIOCs(evidenceHashes) {
        return await threat_model_1.IOC.find({
            type: threat_model_1.IOCTypes.FILE_HASH,
            value: { $in: evidenceHashes },
            status: threat_model_1.IOCStatus.ACTIVE,
        }).lean();
    }
    /**
     * Correlate evidence
     */
    async correlateEvidence(evidenceId) {
        // Get evidence details
        const evidence = await models_1.Evidence.findById(evidenceId);
        if (!evidence) {
            throw new Error('Evidence not found');
        }
        // Find related IOCs
        const relatedIocs = await threat_model_1.IOC.find({
            $or: [
                { linkedEvidence: evidenceId },
                { type: threat_model_1.IOCTypes.FILE_HASH, value: evidence.fingerprint },
            ],
        }).lean();
        // Find correlations
        const correlations = await threat_model_1.ThreatCorrelation.find({
            'entities.entityId': evidenceId,
            status: { $ne: 'dismissed' },
        }).lean();
        // Find linked investigations
        const linkedInvestigations = await models_1.Investigation.find({
            _id: { $in: evidence.investigationId ? [evidence.investigationId] : [] },
        }).lean();
        return { correlations, relatedIocs, linkedInvestigations };
    }
    /**
     * Create threat correlation
     */
    async createCorrelation(input) {
        const correlationId = `CORR-${(0, uuid_1.v4)().substring(0, 8).toUpperCase()}`;
        // Build graph data
        const nodes = input.entities.map(e => ({
            id: e.entityId,
            type: e.entityType,
            label: e.entityValue,
        }));
        const edges = [];
        for (let i = 1; i < input.entities.length; i++) {
            edges.push({
                source: input.entities[i - 1].entityId,
                target: input.entities[i].entityId,
                relationship: input.correlationType,
            });
        }
        const correlation = await threat_model_1.ThreatCorrelation.create({
            correlationId,
            correlationType: input.correlationType,
            entities: input.entities,
            strength: input.strength,
            description: input.description,
            clusterId: input.clusterId,
            clusterLabel: input.clusterLabel,
            graphData: { nodes, edges },
        });
        return correlation;
    }
    /**
     * Enrich investigation
     */
    async enrichInvestigation(investigationId) {
        const enrichmentId = `ENR-${(0, uuid_1.v4)().substring(0, 8).toUpperCase()}`;
        // Get investigation evidence
        const evidence = await models_1.Evidence.find({ investigationId }).lean();
        const evidenceHashes = evidence.map(e => e.fingerprint).filter(Boolean);
        // Match IOCs
        const matchedIocs = await this.matchIOCs(evidenceHashes);
        // Get related entities
        const relatedEntities = [];
        for (const e of evidence) {
            relatedEntities.push({
                entityType: 'evidence',
                entityId: e._id.toString(),
                relationship: 'belongs_to_investigation',
                relevanceScore: 100,
            });
        }
        // Analyze behavioral patterns
        const behavioralContext = this.analyzeBehavioralPattern(evidence);
        // Determine threat context
        const threatContext = this.determineThreatContext(matchedIocs);
        // Save enrichment
        await threat_model_1.ThreatEnrichment.create({
            enrichmentId,
            targetType: 'investigation',
            targetId: investigationId,
            enrichmentType: 'investigation_enrichment',
            matchedIocs: matchedIocs.map(i => ({
                iocId: i.iocId,
                iocType: i.type,
                iocValue: i.value,
                severity: i.severity,
                confidence: i.confidence,
            })),
            relatedEntities,
            behavioralContext,
            threatContext,
            enrichedAt: new Date(),
            confidence: Math.min(100, matchedIocs.length * 10),
        });
        return { matchedIocs, relatedEntities, behavioralContext, threatContext };
    }
    /**
     * Generate threat analytics
     */
    async generateAnalytics(type, timeRange, filters) {
        const analyticsId = `ANLY-${type.substring(0, 3).toUpperCase()}-${(0, uuid_1.v4)().substring(0, 8).toUpperCase()}`;
        let data = { labels: [], values: [], series: [] };
        switch (type) {
            case 'ioc_trends':
                data = await this.getIOCCountsByTime(timeRange, filters);
                break;
            case 'severity_distribution':
                data = await this.getSeverityDistribution(timeRange, filters);
                break;
            case 'type_distribution':
                data = await this.getTypeDistribution(timeRange, filters);
                break;
            case 'threat_heatmap':
                data = await this.getThreatHeatmap(timeRange, filters);
                break;
        }
        const analytics = await threat_model_1.ThreatAnalytics.create({
            analyticsId,
            analyticsType: type,
            timeRange,
            data,
            filters,
            visualizationConfig: this.getVisualizationConfig(type),
            generatedAt: new Date(),
        });
        return analytics;
    }
    /**
     * Get IOC statistics
     */
    async getIOCStatistics() {
        const [total, byType, bySeverity, byStatus, recentActivity] = await Promise.all([
            threat_model_1.IOC.countDocuments({ status: threat_model_1.IOCStatus.ACTIVE }),
            this.aggregateByField('type'),
            this.aggregateByField('severity'),
            this.aggregateByField('status'),
            threat_model_1.IOC.find({ status: threat_model_1.IOCStatus.ACTIVE })
                .sort({ lastSeenAt: -1 })
                .limit(10)
                .lean(),
        ]);
        return { total, byType, bySeverity, byStatus, recentActivity };
    }
    /**
     * Update IOC status
     */
    async updateIOCStatus(iocId, status, notes) {
        const ioc = await threat_model_1.IOC.findOne({ iocId });
        if (!ioc)
            throw new Error('IOC not found');
        ioc.status = status;
        if (status === threat_model_1.IOCStatus.FALSE_POSITIVE) {
            ioc.falsePositiveCount++;
        }
        await ioc.save();
    }
    /**
     * Link IOC to evidence
     */
    async linkIOCToEvidence(iocId, evidenceId) {
        await Promise.all([
            threat_model_1.IOC.updateOne({ iocId }, { $addToSet: { linkedEvidence: evidenceId } }),
            models_1.Evidence.updateOne({ _id: evidenceId }, { $addToSet: { tags: 'ioc_linked' } }),
        ]);
    }
    /**
     * Get threat relationship graph
     */
    async getThreatGraph(investigationId) {
        const query = investigationId
            ? { linkedInvestigations: investigationId }
            : {};
        const iocs = await threat_model_1.IOC.find({ ...query, status: threat_model_1.IOCStatus.ACTIVE }).limit(100).lean();
        const correlations = await threat_model_1.ThreatCorrelation.find({
            status: { $ne: 'dismissed' },
            ...(investigationId ? { linkedInvestigations: investigationId } : {}),
        }).limit(50).lean();
        const nodes = [];
        const edges = [];
        // Add IOC nodes
        for (const ioc of iocs) {
            nodes.push({
                id: ioc.iocId,
                type: ioc.type,
                label: ioc.value,
                metadata: { severity: ioc.severity, threatScore: ioc.threatScore },
            });
        }
        // Add correlation edges
        for (const corr of correlations) {
            for (const entity of corr.entities) {
                if (!nodes.find(n => n.id === entity.entityId)) {
                    nodes.push({
                        id: entity.entityId,
                        type: entity.entityType,
                        label: entity.entityValue,
                        metadata: {},
                    });
                }
            }
            for (const edge of corr.graphData?.edges || []) {
                edges.push({
                    source: edge.source,
                    target: edge.target,
                    relationship: corr.correlationType,
                });
            }
        }
        return { nodes, edges };
    }
    // Helper methods
    calculateThreatScore(input) {
        let score = 0;
        // Severity contribution
        const severityScores = {
            [threat_model_1.IOCSeverity.CRITICAL]: 40,
            [threat_model_1.IOCSeverity.HIGH]: 30,
            [threat_model_1.IOCSeverity.MEDIUM]: 20,
            [threat_model_1.IOCSeverity.LOW]: 10,
            [threat_model_1.IOCSeverity.INFO]: 5,
        };
        score += severityScores[input.severity || threat_model_1.IOCSeverity.MEDIUM] || 20;
        // Confidence contribution
        score += (input.confidence || 50) * 0.3;
        // MITRE tactics contribution
        score += (input.mitreTactics?.length || 0) * 5;
        return Math.min(100, score);
    }
    analyzeBehavioralPattern(evidence) {
        const anomalies = [];
        const riskIndicators = [];
        // Check for suspicious patterns
        for (const e of evidence) {
            if (e.metadata?.suspiciousProcessCount > 5) {
                anomalies.push('High number of suspicious processes detected');
                riskIndicators.push('Multiple suspicious process executions');
            }
            if (e.metadata?.networkConnections > 10) {
                anomalies.push('Unusual network activity detected');
                riskIndicators.push('Excessive outbound connections');
            }
            if (e.metadata?.registryModifications > 3) {
                anomalies.push('Multiple registry modifications');
                riskIndicators.push('Registry persistence indicators');
            }
        }
        return {
            pattern: anomalies.length > 0 ? 'suspicious_activity_detected' : 'normal_activity',
            anomalies,
            riskIndicators,
        };
    }
    determineThreatContext(matchedIocs) {
        const associatedMalware = [];
        const associatedTTPs = [];
        for (const ioc of matchedIocs) {
            if (ioc.description) {
                associatedMalware.push(ioc.description);
            }
            if (ioc.mitreTactics) {
                associatedTTPs.push(...ioc.mitreTactics);
            }
        }
        return {
            associatedMalware: [...new Set(associatedMalware)],
            associatedTTPs: [...new Set(associatedTTPs)],
        };
    }
    async aggregateByField(field) {
        const results = await threat_model_1.IOC.aggregate([
            { $match: { status: threat_model_1.IOCStatus.ACTIVE } },
            { $group: { _id: `$${field}`, count: { $sum: 1 } } },
        ]);
        const data = {};
        for (const r of results) {
            data[r._id] = r.count;
        }
        return data;
    }
    async getIOCCountsByTime(timeRange, filters) {
        const match = {
            createdAt: { $gte: timeRange.start, $lte: timeRange.end },
        };
        const results = await threat_model_1.IOC.aggregate([
            { $match: match },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
                    },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);
        return {
            labels: results.map(r => r._id),
            values: results.map(r => r.count),
        };
    }
    async getSeverityDistribution(timeRange, filters) {
        const results = await threat_model_1.IOC.aggregate([
            {
                $match: {
                    createdAt: { $gte: timeRange.start, $lte: timeRange.end },
                },
            },
            { $group: { _id: '$severity', count: { $sum: 1 } } },
        ]);
        return {
            labels: results.map(r => r._id),
            values: results.map(r => r.count),
        };
    }
    async getTypeDistribution(timeRange, filters) {
        const results = await threat_model_1.IOC.aggregate([
            {
                $match: {
                    createdAt: { $gte: timeRange.start, $lte: timeRange.end },
                },
            },
            { $group: { _id: '$type', count: { $sum: 1 } } },
        ]);
        return {
            labels: results.map(r => r._id.replace('_', ' ')),
            values: results.map(r => r.count),
        };
    }
    async getThreatHeatmap(timeRange, filters) {
        const results = await threat_model_1.IOC.aggregate([
            {
                $match: {
                    createdAt: { $gte: timeRange.start, $lte: timeRange.end },
                },
            },
            {
                $group: {
                    _id: {
                        category: '$category',
                        severity: '$severity',
                    },
                    count: { $sum: 1 },
                },
            },
        ]);
        const labels = [...new Set(results.map(r => r._id.category))];
        const series = Object.values(threat_model_1.IOCSeverity).map(severity => ({
            name: severity,
            data: labels.map(label => results.find(r => r._id.category === label && r._id.severity === severity)?.count || 0),
        }));
        return { labels, series };
    }
    getVisualizationConfig(type) {
        const configs = {
            ioc_trends: {
                chartType: 'line',
                colorScheme: ['#3B82F6', '#10B981', '#F59E0B'],
                thresholds: [],
            },
            severity_distribution: {
                chartType: 'pie',
                colorScheme: ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#6B7280'],
                thresholds: [],
            },
            type_distribution: {
                chartType: 'bar',
                colorScheme: ['#8B5CF6'],
                thresholds: [],
            },
            threat_heatmap: {
                chartType: 'heatmap',
                colorScheme: ['#10B981', '#F59E0B', '#EF4444'],
                thresholds: [
                    { value: 5, color: '#10B981', label: 'Low' },
                    { value: 10, color: '#F59E0B', label: 'Medium' },
                    { value: 20, color: '#EF4444', label: 'High' },
                ],
            },
        };
        return configs[type] || { chartType: 'bar', colorScheme: ['#3B82F6'], thresholds: [] };
    }
}
exports.ThreatIntelligenceService = ThreatIntelligenceService;
exports.threatIntelligenceService = new ThreatIntelligenceService();
exports.default = exports.threatIntelligenceService;
//# sourceMappingURL=threat-intelligence.service.js.map