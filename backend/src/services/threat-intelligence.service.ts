/**
 * Threat Intelligence Service
 * IOC management, correlation, and enrichment
 */

import { IOC, ThreatCorrelation, ThreatEnrichment, ThreatAnalytics, IOCTypes, IOCSeverity, IOCStatus, MITRETactics } from '../models/threat.model';
import { Evidence, Investigation, Alert } from '../models';
import { v4 as uuidv4 } from 'uuid';

export interface IOCInput {
  type: IOCTypes;
  value: string;
  severity?: IOCSeverity;
  category: string;
  description?: string;
  source: string;
  confidence?: number;
  mitreTactics?: MITRETactics[];
  mitreTechniques?: string[];
  tags?: string[];
  linkedEvidence?: string[];
  linkedInvestigations?: string[];
}

export interface ThreatEnrichmentResult {
  matchedIocs: Array<{
    iocId: string;
    iocType: string;
    iocValue: string;
    severity: string;
    confidence: number;
  }>;
  relatedEntities: Array<{
    entityType: string;
    entityId: string;
    relationship: string;
    relevanceScore: number;
  }>;
  behavioralContext: {
    pattern: string;
    anomalies: string[];
    riskIndicators: string[];
  };
  threatContext: {
    threatActor?: string;
    attackCampaign?: string;
    associatedMalware: string[];
    associatedTTPs: string[];
  };
}

export class ThreatIntelligenceService {
  /**
   * Create IOC
   */
  async createIOC(input: IOCInput, userId: string): Promise<any> {
    const iocId = `IOC-${input.type.split('_')[0].toUpperCase()}-${uuidv4().substring(0, 8).toUpperCase()}`;

    // Calculate initial threat score
    const threatScore = this.calculateThreatScore(input);

    const ioc = await IOC.create({
      iocId,
      type: input.type,
      value: input.value,
      severity: input.severity || IOCSeverity.MEDIUM,
      status: IOCStatus.ACTIVE,
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
  async getIOC(iocId: string): Promise<any> {
    return await IOC.findOne({ iocId })
      .populate('linkedEvidence')
      .populate('linkedInvestigations')
      .populate('createdBy', 'username email');
  }

  /**
   * Search IOCs
   */
  async searchIOCs(filters: {
    type?: IOCTypes;
    severity?: IOCSeverity;
    status?: IOCStatus;
    category?: string;
    search?: string;
    tags?: string[];
    limit?: number;
    skip?: number;
  }): Promise<{ iocs: any[]; total: number }> {
    const query: any = {};

    if (filters.type) query.type = filters.type;
    if (filters.severity) query.severity = filters.severity;
    if (filters.status) query.status = filters.status;
    if (filters.category) query.category = filters.category;
    if (filters.tags && filters.tags.length > 0) query.tags = { $all: filters.tags };
    if (filters.search) {
      query.$or = [
        { value: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
        { iocId: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const [iocs, total] = await Promise.all([
      IOC.find(query)
        .sort({ threatScore: -1, createdAt: -1 })
        .limit(filters.limit || 50)
        .skip(filters.skip || 0)
        .lean(),
      IOC.countDocuments(query),
    ]);

    return { iocs, total };
  }

  /**
   * Match IOCs against evidence
   */
  async matchIOCs(evidenceHashes: string[]): Promise<any[]> {
    return await IOC.find({
      type: IOCTypes.FILE_HASH,
      value: { $in: evidenceHashes },
      status: IOCStatus.ACTIVE,
    }).lean();
  }

  /**
   * Correlate evidence
   */
  async correlateEvidence(evidenceId: string): Promise<{
    correlations: any[];
    relatedIocs: any[];
    linkedInvestigations: any[];
  }> {
    // Get evidence details
    const evidence = await Evidence.findById(evidenceId);
    if (!evidence) {
      throw new Error('Evidence not found');
    }

    // Find related IOCs
    const relatedIocs = await IOC.find({
      $or: [
        { linkedEvidence: evidenceId },
        { type: IOCTypes.FILE_HASH, value: evidence.fingerprint },
      ],
    }).lean();

    // Find correlations
    const correlations = await ThreatCorrelation.find({
      'entities.entityId': evidenceId,
      status: { $ne: 'dismissed' },
    }).lean();

    // Find linked investigations
    const linkedInvestigations = await Investigation.find({
      _id: { $in: evidence.investigationId ? [evidence.investigationId] : [] },
    }).lean();

    return { correlations, relatedIocs, linkedInvestigations };
  }

  /**
   * Create threat correlation
   */
  async createCorrelation(input: {
    correlationType: string;
    entities: Array<{ entityType: string; entityId: string; entityValue: string }>;
    strength: number;
    description: string;
    clusterId?: string;
    clusterLabel?: string;
  }): Promise<any> {
    const correlationId = `CORR-${uuidv4().substring(0, 8).toUpperCase()}`;

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

    const correlation = await ThreatCorrelation.create({
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
  async enrichInvestigation(investigationId: string): Promise<ThreatEnrichmentResult> {
    const enrichmentId = `ENR-${uuidv4().substring(0, 8).toUpperCase()}`;

    // Get investigation evidence
    const evidence = await Evidence.find({ investigationId }).lean();
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
    await ThreatEnrichment.create({
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
  async generateAnalytics(type: string, timeRange: { start: Date; end: Date }, filters?: any): Promise<any> {
    const analyticsId = `ANLY-${type.substring(0, 3).toUpperCase()}-${uuidv4().substring(0, 8).toUpperCase()}`;

    let data: any = { labels: [], values: [], series: [] };

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

    const analytics = await ThreatAnalytics.create({
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
  async getIOCStatistics(): Promise<{
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    byStatus: Record<string, number>;
    recentActivity: any[];
  }> {
    const [total, byType, bySeverity, byStatus, recentActivity] = await Promise.all([
      IOC.countDocuments({ status: IOCStatus.ACTIVE }),
      this.aggregateByField('type'),
      this.aggregateByField('severity'),
      this.aggregateByField('status'),
      IOC.find({ status: IOCStatus.ACTIVE })
        .sort({ lastSeenAt: -1 })
        .limit(10)
        .lean(),
    ]);

    return { total, byType, bySeverity, byStatus, recentActivity };
  }

  /**
   * Update IOC status
   */
  async updateIOCStatus(iocId: string, status: IOCStatus, notes?: string): Promise<void> {
    const ioc = await IOC.findOne({ iocId });
    if (!ioc) throw new Error('IOC not found');

    ioc.status = status;
    if (status === IOCStatus.FALSE_POSITIVE) {
      ioc.falsePositiveCount++;
    }
    await ioc.save();
  }

  /**
   * Link IOC to evidence
   */
  async linkIOCToEvidence(iocId: string, evidenceId: string): Promise<void> {
    await Promise.all([
      IOC.updateOne({ iocId }, { $addToSet: { linkedEvidence: evidenceId } }),
      Evidence.updateOne({ _id: evidenceId }, { $addToSet: { tags: 'ioc_linked' } }),
    ]);
  }

  /**
   * Get threat relationship graph
   */
  async getThreatGraph(investigationId?: string): Promise<{
    nodes: Array<{ id: string; type: string; label: string; metadata: any }>;
    edges: Array<{ source: string; target: string; relationship: string }>;
  }> {
    const query = investigationId
      ? { linkedInvestigations: investigationId }
      : {};

    const iocs = await IOC.find({ ...query, status: IOCStatus.ACTIVE }).limit(100).lean();
    const correlations = await ThreatCorrelation.find({
      status: { $ne: 'dismissed' },
      ...(investigationId ? { linkedInvestigations: investigationId } : {}),
    }).limit(50).lean();

    const nodes: Array<{ id: string; type: string; label: string; metadata: any }> = [];
    const edges: Array<{ source: string; target: string; relationship: string }> = [];

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

  private calculateThreatScore(input: IOCInput): number {
    let score = 0;

    // Severity contribution
    const severityScores = {
      [IOCSeverity.CRITICAL]: 40,
      [IOCSeverity.HIGH]: 30,
      [IOCSeverity.MEDIUM]: 20,
      [IOCSeverity.LOW]: 10,
      [IOCSeverity.INFO]: 5,
    };
    score += severityScores[input.severity || IOCSeverity.MEDIUM] || 20;

    // Confidence contribution
    score += (input.confidence || 50) * 0.3;

    // MITRE tactics contribution
    score += (input.mitreTactics?.length || 0) * 5;

    return Math.min(100, score);
  }

  private analyzeBehavioralPattern(evidence: any[]): ThreatEnrichmentResult['behavioralContext'] {
    const anomalies: string[] = [];
    const riskIndicators: string[] = [];

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

  private determineThreatContext(matchedIocs: any[]): ThreatEnrichmentResult['threatContext'] {
    const associatedMalware: string[] = [];
    const associatedTTPs: string[] = [];

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

  private async aggregateByField(field: string): Promise<Record<string, number>> {
    const results = await IOC.aggregate([
      { $match: { status: IOCStatus.ACTIVE } },
      { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    ]);

    const data: Record<string, number> = {};
    for (const r of results) {
      data[r._id] = r.count;
    }
    return data;
  }

  private async getIOCCountsByTime(timeRange: { start: Date; end: Date }, filters?: any): Promise<any> {
    const match: any = {
      createdAt: { $gte: timeRange.start, $lte: timeRange.end },
    };

    const results = await IOC.aggregate([
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

  private async getSeverityDistribution(timeRange: { start: Date; end: Date }, filters?: any): Promise<any> {
    const results = await IOC.aggregate([
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

  private async getTypeDistribution(timeRange: { start: Date; end: Date }, filters?: any): Promise<any> {
    const results = await IOC.aggregate([
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

  private async getThreatHeatmap(timeRange: { start: Date; end: Date }, filters?: any): Promise<any> {
    const results = await IOC.aggregate([
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
    const series = Object.values(IOCSeverity).map(severity => ({
      name: severity,
      data: labels.map(label =>
        results.find(r => r._id.category === label && r._id.severity === severity)?.count || 0
      ),
    }));

    return { labels, series };
  }

  private getVisualizationConfig(type: string): any {
    const configs: Record<string, any> = {
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

export const threatIntelligenceService = new ThreatIntelligenceService();
export default threatIntelligenceService;