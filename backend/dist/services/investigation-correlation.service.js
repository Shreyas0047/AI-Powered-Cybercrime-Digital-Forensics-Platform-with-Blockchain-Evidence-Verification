"use strict";
/**
 * Investigation Correlation Service
 * Correlate investigations, evidence, and forensic data
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.investigationCorrelationService = exports.InvestigationCorrelationService = void 0;
const models_1 = require("../models");
const threat_model_1 = require("../models/threat.model");
const uuid_1 = require("uuid");
class InvestigationCorrelationService {
    /**
     * Correlate all investigations and find clusters
     */
    async correlateInvestigations() {
        const clusters = [];
        // Get all investigations
        const investigations = await models_1.Investigation.find()
            .select('_id name status threatLevel tags metadata')
            .lean();
        // Find clusters based on shared IOCs
        const iocClusters = await this.findIOCBasedClusters(investigations);
        clusters.push(...iocClusters);
        // Find clusters based on evidence similarity
        const evidenceClusters = await this.findEvidenceBasedClusters(investigations);
        clusters.push(...evidenceClusters);
        // Find clusters based on telemetry patterns
        const telemetryClusters = await this.findTelemetryBasedClusters(investigations);
        clusters.push(...telemetryClusters);
        return clusters;
    }
    /**
     * Find clusters based on shared IOCs
     */
    async findIOCBasedClusters(investigations) {
        const clusters = [];
        const processedPairs = new Set();
        // Group investigations by IOCs
        for (let i = 0; i < investigations.length; i++) {
            for (let j = i + 1; j < investigations.length; j++) {
                const inv1 = investigations[i];
                const inv2 = investigations[j];
                const pairKey = `${inv1._id}-${inv2._id}`;
                if (processedPairs.has(pairKey))
                    continue;
                // Check for shared IOCs
                const inv1Evidence = await models_1.Evidence.find({ investigationId: inv1._id }).select('_id fingerprint').lean();
                const inv2Evidence = await models_1.Evidence.find({ investigationId: inv2._id }).select('_id fingerprint').lean();
                const inv1Hashes = new Set(inv1Evidence.map(e => e.fingerprint));
                const inv2Hashes = new Set(inv2Evidence.map(e => e.fingerprint));
                // Find intersection
                const sharedHashes = [...inv1Hashes].filter(h => inv2Hashes.has(h));
                if (sharedHashes.length > 0) {
                    const cluster = {
                        clusterId: (0, uuid_1.v4)(),
                        label: `IOC Cluster - ${sharedHashes.length} shared indicators`,
                        investigationIds: [inv1._id.toString(), inv2._id.toString()],
                        sharedIndicators: sharedHashes.slice(0, 10),
                        strength: Math.min(100, sharedHashes.length * 10 + 50),
                        detectedAt: new Date(),
                        relatedIocs: sharedHashes,
                    };
                    clusters.push(cluster);
                    processedPairs.add(pairKey);
                }
            }
        }
        return clusters;
    }
    /**
     * Find clusters based on evidence similarity
     */
    async findEvidenceBasedClusters(investigations) {
        const clusters = [];
        // Group by threat level similarity
        const byThreatLevel = new Map();
        for (const inv of investigations) {
            const level = inv.threatLevel || 'medium';
            if (!byThreatLevel.has(level)) {
                byThreatLevel.set(level, []);
            }
            byThreatLevel.get(level).push(inv);
        }
        for (const [level, invs] of byThreatLevel) {
            if (invs.length > 1) {
                clusters.push({
                    clusterId: (0, uuid_1.v4)(),
                    label: `Threat Level ${level} Cluster`,
                    investigationIds: invs.map(i => i._id.toString()),
                    sharedIndicators: [`threat_level:${level}`],
                    strength: 60,
                    detectedAt: new Date(),
                    relatedIocs: [],
                });
            }
        }
        return clusters;
    }
    /**
     * Find clusters based on telemetry patterns
     */
    async findTelemetryBasedClusters(investigations) {
        const clusters = [];
        // Group by temporal overlap
        for (const inv of investigations) {
            const relatedInvs = await this.findTemporalOverlaps(inv, investigations);
            if (relatedInvs.length > 0) {
                clusters.push({
                    clusterId: (0, uuid_1.v4)(),
                    label: `Temporal Cluster - ${inv.name}`,
                    investigationIds: [inv._id.toString(), ...relatedInvs.map(r => r._id.toString())],
                    sharedIndicators: ['temporal_overlap'],
                    strength: 50,
                    detectedAt: new Date(),
                    relatedIocs: [],
                });
            }
        }
        return clusters;
    }
    /**
     * Find investigations with temporal overlap
     */
    async findTemporalOverlaps(inv, allInvestigations) {
        if (!inv.metadata?.startTime)
            return [];
        const related = [];
        for (const other of allInvestigations) {
            if (other._id.toString() === inv._id.toString())
                continue;
            if (!other.metadata?.startTime)
                continue;
            const invStart = new Date(inv.metadata.startTime).getTime();
            const invEnd = inv.metadata.endTime ? new Date(inv.metadata.endTime).getTime() : Date.now();
            const otherStart = new Date(other.metadata.startTime).getTime();
            const otherEnd = other.metadata.endTime ? new Date(other.metadata.endTime).getTime() : Date.now();
            // Check for overlap
            if (invStart <= otherEnd && invEnd >= otherStart) {
                related.push(other);
            }
        }
        return related;
    }
    /**
     * Get relationships between specific investigations
     */
    async getInvestigationRelationships(investigationId) {
        const relationships = [];
        const investigation = await models_1.Investigation.findById(investigationId);
        if (!investigation) {
            return relationships;
        }
        // Get all other investigations
        const otherInvestigations = await models_1.Investigation.find({ _id: { $ne: investigationId } }).lean();
        for (const other of otherInvestigations) {
            const relationship = await this.analyzeRelationship(investigation, other);
            if (relationship && relationship.confidence > 30) {
                relationships.push(relationship);
            }
        }
        return relationships.sort((a, b) => b.confidence - a.confidence);
    }
    /**
     * Analyze relationship between two investigations
     */
    async analyzeRelationship(inv1, inv2) {
        const sharedDetails = [];
        const evidence = [];
        const relationshipTypes = [];
        // Check for shared evidence
        const inv1Evidence = await models_1.Evidence.find({ investigationId: inv1._id }).lean();
        const inv2Evidence = await models_1.Evidence.find({ investigationId: inv2._id }).lean();
        const inv1Hashes = new Set(inv1Evidence.map(e => e.fingerprint));
        const inv2Hashes = new Set(inv2Evidence.map(e => e.fingerprint));
        const sharedEvidence = [...inv1Hashes].filter(h => inv2Hashes.has(h));
        if (sharedEvidence.length > 0) {
            relationshipTypes.push('shares_evidence');
            sharedDetails.push(`${sharedEvidence.length} shared evidence hashes`);
            evidence.push(...sharedEvidence);
        }
        // Check for shared IOCs
        const inv1Iocs = await threat_model_1.IOC.find({ linkedInvestigations: inv1._id }).lean();
        const inv2Iocs = await threat_model_1.IOC.find({ linkedInvestigations: inv2._id }).lean();
        const sharedIocs = inv1Iocs.filter(i1 => inv2Iocs.some(i2 => i2.iocId === i1.iocId));
        if (sharedIocs.length > 0) {
            relationshipTypes.push('shares_ioc');
            sharedDetails.push(`${sharedIocs.length} shared IOCs`);
        }
        // Check for threat level similarity
        if (inv1.threatLevel === inv2.threatLevel && inv1.threatLevel !== 'unknown') {
            relationshipTypes.push('shares_pattern');
            sharedDetails.push(`Same threat level: ${inv1.threatLevel}`);
        }
        // Check temporal overlap
        if (inv1.metadata?.startTime && inv2.metadata?.startTime) {
            const inv1Start = new Date(inv1.metadata.startTime).getTime();
            const inv1End = inv1.metadata.endTime ? new Date(inv1.metadata.endTime).getTime() : Date.now();
            const inv2Start = new Date(inv2.metadata.startTime).getTime();
            const inv2End = inv2.metadata.endTime ? new Date(inv2.metadata.endTime).getTime() : Date.now();
            if (inv1Start <= inv2End && inv1End >= inv2Start) {
                relationshipTypes.push('temporal_overlap');
                sharedDetails.push('Investigations have temporal overlap');
            }
        }
        if (relationshipTypes.length === 0) {
            return null;
        }
        return {
            sourceInvestigationId: inv1._id.toString(),
            targetInvestigationId: inv2._id.toString(),
            relationshipType: relationshipTypes[0],
            confidence: Math.min(100, relationshipTypes.length * 30 + sharedDetails.length * 5),
            sharedDetails,
            evidence,
            detectedAt: new Date(),
        };
    }
    /**
     * Generate correlation insights
     */
    async generateCorrelationInsights(investigationId) {
        const insights = [];
        // Get clusters
        const clusters = await this.correlateInvestigations();
        for (const cluster of clusters) {
            if (investigationId && !cluster.investigationIds.includes(investigationId)) {
                continue;
            }
            insights.push({
                insightId: (0, uuid_1.v4)(),
                type: 'investigation_link',
                title: `Investigation Cluster: ${cluster.label}`,
                description: `${cluster.investigationIds.length} investigations share ${cluster.sharedIndicators.length} indicators`,
                investigations: cluster.investigationIds,
                confidence: cluster.strength,
                severity: cluster.strength >= 80 ? 'critical' : cluster.strength >= 60 ? 'high' : 'medium',
                indicators: cluster.sharedIndicators.slice(0, 5),
                recommendations: [
                    'Review related investigations for potential campaign links',
                    'Analyze shared indicators for common TTPs',
                    'Consider consolidating investigation efforts',
                ],
                detectedAt: cluster.detectedAt,
            });
        }
        // Generate IOC-based insights
        const iocInsights = await this.generateIOCInsights();
        insights.push(...iocInsights);
        return insights.sort((a, b) => b.confidence - a.confidence);
    }
    /**
     * Generate insights from IOC analysis
     */
    async generateIOCInsights() {
        const insights = [];
        // Find IOCs linked to multiple investigations
        const iocs = await threat_model_1.IOC.aggregate([
            { $match: { status: 'active' } },
            { $project: { iocId: 1, linkedInvestigations: 1, value: 1, type: 1 } },
            { $match: { linkedInvestigations: { $exists: true, $ne: [] } } },
        ]);
        const byInvestigation = new Map();
        for (const ioc of iocs) {
            for (const invId of ioc.linkedInvestigations) {
                if (!byInvestigation.has(invId.toString())) {
                    byInvestigation.set(invId.toString(), new Set());
                }
                byInvestigation.get(invId.toString()).add(ioc.iocId);
            }
        }
        // Find IOCs linked to multiple investigations
        for (const ioc of iocs) {
            if (ioc.linkedInvestigations.length > 1) {
                const uniqueInvs = [...new Set(ioc.linkedInvestigations.map((id) => id.toString()))];
                if (uniqueInvs.length > 1) {
                    insights.push({
                        insightId: (0, uuid_1.v4)(),
                        type: 'ioc_connection',
                        title: `IOC Linked to Multiple Investigations`,
                        description: `IOC ${ioc.value} is linked to ${uniqueInvs.length} different investigations`,
                        investigations: uniqueInvs,
                        confidence: Math.min(100, 40 + uniqueInvs.length * 20),
                        severity: uniqueInvs.length >= 3 ? 'high' : 'medium',
                        indicators: [ioc.iocId, `${ioc.type}:${ioc.value}`],
                        recommendations: [
                            'Investigate IOC for broader campaign attribution',
                            'Review all linked investigations for common indicators',
                        ],
                        detectedAt: new Date(),
                    });
                }
            }
        }
        return insights;
    }
    /**
     * Score investigation relationship strength
     */
    async scoreRelationship(sourceId, targetId) {
        const factors = {};
        let explanation = '';
        // Get evidence overlap score
        const sourceEvidence = await models_1.Evidence.find({ investigationId: sourceId }).lean();
        const targetEvidence = await models_1.Evidence.find({ investigationId: targetId }).lean();
        const sourceHashes = new Set(sourceEvidence.map(e => e.fingerprint));
        const targetHashes = new Set(targetEvidence.map(e => e.fingerprint));
        const sharedHashes = [...sourceHashes].filter(h => targetHashes.has(h));
        factors.evidenceOverlap = sharedHashes.length > 0 ? Math.min(40, sharedHashes.length * 5) : 0;
        // Get IOC overlap score
        const sourceIocs = await threat_model_1.IOC.find({ linkedInvestigations: sourceId }).lean();
        const targetIocs = await threat_model_1.IOC.find({ linkedInvestigations: targetId }).lean();
        const sharedIocs = sourceIocs.filter(s => targetIocs.some(t => t.iocId === s.iocId));
        factors.iocOverlap = sharedIocs.length > 0 ? Math.min(30, sharedIocs.length * 10) : 0;
        // Get temporal proximity score
        factors.temporalProximity = 10; // Base score
        const sourceInv = await models_1.Investigation.findById(sourceId);
        const targetInv = await models_1.Investigation.findById(targetId);
        if (sourceInv?.metadata?.startTime && targetInv?.metadata?.startTime) {
            const timeDiff = Math.abs(new Date(sourceInv.metadata.startTime).getTime() -
                new Date(targetInv.metadata.startTime).getTime()) / (1000 * 60 * 60); // Hours
            if (timeDiff < 24)
                factors.temporalProximity += 15;
            else if (timeDiff < 168)
                factors.temporalProximity += 10;
            else if (timeDiff < 720)
                factors.temporalProximity += 5;
        }
        // Get analyst notes similarity score
        factors.analystCorrelation = 5; // Base score
        // Calculate total
        const totalScore = Object.values(factors).reduce((a, b) => a + b, 0);
        // Generate explanation
        explanation = `Relationship score of ${totalScore} based on: ` +
            `${factors.evidenceOverlap > 0 ? `evidence overlap (${factors.evidenceOverlap}), ` : ''}` +
            `${factors.iocOverlap > 0 ? `IOC overlap (${factors.iocOverlap}), ` : ''}` +
            `temporal proximity (${factors.temporalProximity})`;
        return { totalScore: Math.min(100, totalScore), factors, explanation };
    }
    /**
     * Get investigation cluster visualization data
     */
    async getClusterVisualization() {
        const clusters = await this.correlateInvestigations();
        const nodes = [];
        const edges = [];
        const addedNodes = new Set();
        for (const cluster of clusters) {
            // Add investigation nodes
            for (const invId of cluster.investigationIds) {
                if (!addedNodes.has(invId)) {
                    const inv = await models_1.Investigation.findById(invId).lean();
                    if (inv) {
                        nodes.push({
                            id: invId,
                            label: inv.name || invId,
                            type: 'investigation',
                            metadata: { threatLevel: inv.threatLevel, status: inv.status },
                        });
                        addedNodes.add(invId);
                    }
                }
            }
            // Add edges between related investigations
            for (let i = 1; i < cluster.investigationIds.length; i++) {
                edges.push({
                    source: cluster.investigationIds[i - 1],
                    target: cluster.investigationIds[i],
                    relationship: cluster.label,
                    strength: cluster.strength,
                });
            }
        }
        return { nodes, edges };
    }
}
exports.InvestigationCorrelationService = InvestigationCorrelationService;
exports.investigationCorrelationService = new InvestigationCorrelationService();
exports.default = exports.investigationCorrelationService;
//# sourceMappingURL=investigation-correlation.service.js.map