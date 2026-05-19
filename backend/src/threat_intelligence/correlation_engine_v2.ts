/**
 * Forensic Correlation Engine
 * Centralized engine to correlate raw forensic events into meaningful attack narratives
 */

import { v4 as uuidv4 } from 'uuid';
import {
  NormalizedEvent,
  ExtractedFeatures,
  AttackChain,
  AttackStage,
  EventRelationship,
  CorrelatedIncident,
  EvidenceGraph,
  EvidenceNode,
  EvidenceEdge,
  ProcessTreeNode
} from './threat_models';

export class ForensicCorrelationEngine {
  correlateEvents(
    events: NormalizedEvent[],
    features: ExtractedFeatures,
    sessionId: string
  ): {
    attack_chains: AttackChain[];
    incidents: CorrelatedIncident[];
    evidence_graph: EvidenceGraph;
    relationships: EventRelationship[];
    process_tree: ProcessTreeNode[];
  } {
    const sortedEvents = [...events].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const relationships = this.extractRelationships(sortedEvents);
    const attackChains = this.reconstructAttackChains(sortedEvents, features, sessionId);
    const incidents = this.detectIncidents(sortedEvents, attackChains, sessionId);
    const evidenceGraph = this.buildEvidenceGraph(sortedEvents, relationships);
    const processTree = this.buildProcessTree(sortedEvents);

    return {
      attack_chains: attackChains,
      incidents,
      evidence_graph: evidenceGraph,
      relationships,
      process_tree: processTree
    };
  }

  private extractRelationships(events: NormalizedEvent[]): EventRelationship[] {
    const relationships: EventRelationship[] = [];
    const processMap = new Map<string, NormalizedEvent[]>();

    for (const event of events) {
      const processName = event.metadata.processName || 'unknown';
      if (!processMap.has(processName)) {
        processMap.set(processName, []);
      }
      processMap.get(processName)!.push(event);
    }

    for (let i = 0; i < events.length - 1; i++) {
      const current = events[i];
      const next = events[i + 1];

      const timeDiff = new Date(next.timestamp).getTime() - new Date(current.timestamp).getTime();

      if (current.metadata.processName === next.metadata.processName) {
        relationships.push({
          relationship_id: uuidv4(),
          source_event_id: current.id,
          target_event_id: next.id,
          relationship_type: 'sequential',
          confidence: 0.8,
          metadata: { time_diff_ms: timeDiff }
        });
      }

      if (timeDiff < 5000 && current.normalizedType !== next.normalizedType) {
        relationships.push({
          relationship_id: uuidv4(),
          source_event_id: current.id,
          target_event_id: next.id,
          relationship_type: 'correlated',
          confidence: 0.5,
          metadata: { time_diff_ms: timeDiff }
        });
      }

      if (this.isParentChildRelationship(current, next)) {
        relationships.push({
          relationship_id: uuidv4(),
          source_event_id: current.id,
          target_event_id: next.id,
          relationship_type: 'parent_child',
          confidence: 0.9,
          metadata: { relationship: 'process_chain' }
        });
      }
    }

    return relationships;
  }

  private isParentChildRelationship(event1: NormalizedEvent, event2: NormalizedEvent): boolean {
    if (event1.normalizedType === 'process_start' as any && event2.normalizedType === 'file_create' as any) {
      return true;
    }
    if (event1.normalizedType === 'file_create' as any && event2.normalizedType === 'network_connect' as any) {
      return true;
    }
    if (event1.normalizedType === 'network_connect' as any && event2.normalizedType === 'registry_modify' as any) {
      return true;
    }
    return false;
  }

  private reconstructAttackChains(
    events: NormalizedEvent[],
    features: ExtractedFeatures,
    sessionId: string
  ): AttackChain[] {
    const chains: AttackChain[] = [];

    const stages = this.identifyAttackStages(events);

    if (stages.length > 0) {
      const mitreTactics = this.extractMitreTacticsFromStages(stages);
      const severity = this.calculateChainSeverity(features);
      const confidence = this.calculateChainConfidence(events, stages);

      chains.push({
        chain_id: `CHAIN-${sessionId}-${Date.now()}`,
        session_id: sessionId,
        stages,
        total_events: events.length,
        severity,
        confidence,
        mitre_tactics: mitreTactics,
        reconstructed_at: new Date()
      });
    }

    return chains;
  }

  private identifyAttackStages(events: NormalizedEvent[]): AttackStage[] {
    const stages: AttackStage[] = [];
    const stageDefinitions = [
      { name: 'Initial Access', types: ['process_start' as any] },
      { name: 'Execution', types: ['file_create' as any, 'file_modify' as any] },
      { name: 'Persistence', types: ['registry_modify' as any, 'registry_create' as any, 'persistence_attempt' as any] },
      { name: 'Discovery', types: ['file_scan' as any] },
      { name: 'Collection', types: ['file_create' as any, 'file_modify' as any] },
      { name: 'Exfiltration', types: ['network_connect' as any, 'network_data_sent' as any] },
      { name: 'Impact', types: ['mass_file_modification' as any, 'ransom_note_creation' as any] }
    ];

    for (const stageDef of stageDefinitions) {
      const stageEvents = events.filter(e =>
        stageDef.types.includes(e.normalizedType)
      );

      if (stageEvents.length > 0) {
        const startTime = new Date(stageEvents[0].timestamp);
        const endTime = new Date(stageEvents[stageEvents.length - 1].timestamp);

        stages.push({
          stage_number: stages.length + 1,
          stage_name: stageDef.name,
          events: stageEvents,
          start_time: startTime,
          end_time: endTime,
          duration_ms: endTime.getTime() - startTime.getTime(),
          indicators: this.extractStageIndicators(stageEvents),
          mitre_techniques: this.extractMitreFromEvents(stageEvents)
        });
      }
    }

    return stages;
  }

  private extractStageIndicators(events: NormalizedEvent[]): string[] {
    const indicators: string[] = [];
    for (const event of events) {
      if (event.behavioralTags.length > 0) {
        indicators.push(...event.behavioralTags);
      }
    }
    return [...new Set(indicators)];
  }

  private extractMitreFromEvents(events: NormalizedEvent[]): string[] {
    const techniques: string[] = [];
    for (const event of events) {
      const eventType = event.normalizedType;
      if (eventType.includes('process')) techniques.push('T1059');
      if (eventType.includes('file_modify') || eventType.includes('file_create')) techniques.push('T1486');
      if (eventType.includes('registry')) techniques.push('T1547.001');
      if (eventType.includes('network')) techniques.push('T1071');
    }
    return [...new Set(techniques)];
  }

  private extractMitreTacticsFromStages(stages: AttackStage[]): string[] {
    const tacticsSet = new Set<string>();
    const techniqueToTactic: Record<string, string> = {
      'T1059': 'Execution',
      'T1486': 'Impact',
      'T1547.001': 'Persistence',
      'T1071': 'Command & Control',
      'T1083': 'Discovery',
      'T1003': 'Credential Access'
    };

    for (const stage of stages) {
      for (const tech of stage.mitre_techniques) {
        const tactic = techniqueToTactic[tech];
        if (tactic) tacticsSet.add(tactic);
      }
    }

    return [...tacticsSet];
  }

  private calculateChainSeverity(features: ExtractedFeatures): string {
    const score = features.fileModificationCount * 0.5 +
      features.persistenceKeysModified * 10 +
      features.outboundConnectionCount * 3 +
      features.privilegeEscalationAttempts * 15 +
      features.suspiciousBehaviorCount * 5;

    if (score > 80) return 'critical';
    if (score > 50) return 'high';
    if (score > 25) return 'medium';
    return 'low';
  }

  private calculateChainConfidence(events: NormalizedEvent[], stages: AttackStage[]): number {
    let confidence = 50;

    confidence += stages.length * 5;

    const eventDiversity = new Set(events.map(e => e.normalizedType)).size;
    confidence += eventDiversity * 3;

    const totalEvents = events.length;
    if (totalEvents > 50) confidence += 15;
    else if (totalEvents > 20) confidence += 10;

    return Math.min(95, Math.max(20, confidence));
  }

  private detectIncidents(
    events: NormalizedEvent[],
    chains: AttackChain[],
    sessionId: string
  ): CorrelatedIncident[] {
    const incidents: CorrelatedIncident[] = [];

    for (const chain of chains) {
      if (chain.stages.length >= 3) {
        incidents.push({
          incident_id: `INC-${sessionId}-${Date.now()}`,
          session_id: sessionId,
          title: `Multi-stage attack detected (${chain.stages.length} stages)`,
          description: `Attack chain with ${chain.total_events} events across ${chain.stages.length} stages`,
          severity: chain.severity,
          events: chain.stages.flatMap(s => s.events),
          relationships: [],
          attack_chain: chain,
          detected_at: new Date()
        });
      }
    }

    const suspiciousPatterns = this.detectSuspiciousPatterns(events);
    for (const pattern of suspiciousPatterns) {
      incidents.push({
        incident_id: `INC-${sessionId}-pattern-${Date.now()}`,
        session_id: sessionId,
        title: pattern.name,
        description: pattern.description,
        severity: pattern.severity,
        events: pattern.events,
        relationships: [],
        detected_at: new Date()
      });
    }

    return incidents;
  }

  private detectSuspiciousPatterns(events: NormalizedEvent[]): Array<{
    name: string;
    description: string;
    severity: string;
    events: NormalizedEvent[];
  }> {
    const patterns: Array<{ name: string; description: string; severity: string; events: NormalizedEvent[] }> = [];

    const fileMods = events.filter(e => e.normalizedType === 'file_modify' as any);
    if (fileMods.length > 30) {
      patterns.push({
        name: 'Mass file modification detected',
        description: `${fileMods.length} file modifications in a short period`,
        severity: 'high',
        events: fileMods
      });
    }

    const persistence = events.filter(e =>
      e.normalizedType === 'registry_modify' as any ||
      e.behavioralTags.includes('persistence_registry')
    );
    if (persistence.length > 2) {
      patterns.push({
        name: 'Persistence mechanism detected',
        description: `${persistence.length} registry modifications for persistence`,
        severity: 'high',
        events: persistence
      });
    }

    return patterns;
  }

  private buildEvidenceGraph(events: NormalizedEvent[], relationships: EventRelationship[]): EvidenceGraph {
    const nodes: EvidenceNode[] = [];
    const nodeIds = new Set<string>();

    for (const event of events.slice(0, 100)) {
      if (!nodeIds.has(event.id)) {
        nodes.push({
          node_id: event.id,
          event_type: event.normalizedType,
          event_id: event.id,
          timestamp: new Date(event.timestamp),
          label: this.getNodeLabel(event),
          metadata: event.metadata
        });
        nodeIds.add(event.id);
      }
    }

    const edges: EvidenceEdge[] = [];
    for (const rel of relationships.slice(0, 50)) {
      if (nodeIds.has(rel.source_event_id) && nodeIds.has(rel.target_event_id)) {
        edges.push({
          edge_id: rel.relationship_id,
          source_node_id: rel.source_event_id,
          target_node_id: rel.target_event_id,
          relationship_type: rel.relationship_type,
          confidence: rel.confidence
        });
      }
    }

    return { nodes, edges };
  }

  private getNodeLabel(event: NormalizedEvent): string {
    const processName = event.metadata.processName || 'unknown';
    const path = event.metadata.path || event.metadata.target || '';

    if (path) return `${processName}: ${path.substring(0, 30)}`;
    return processName;
  }

  private buildProcessTree(events: NormalizedEvent[]): ProcessTreeNode[] {
    const processNodes = new Map<string, ProcessTreeNode>();
    const roots: ProcessTreeNode[] = [];

    const processEvents = events.filter(e => e.normalizedType === 'process_start' as any);

    for (const event of processEvents) {
      const pid = event.metadata.processId || event.metadata.processName || uuidv4();
      const name = event.metadata.processName || 'unknown';

      const node: ProcessTreeNode = {
        pid: String(pid),
        name,
        parent_pid: null,
        children: [],
        depth: 0
      };

      processNodes.set(String(pid), node);
    }

    for (const node of processNodes.values()) {
      if (node.parent_pid === null) {
        roots.push(node);
      }
    }

    return roots.length > 0 ? roots : [{
      pid: 'root',
      name: 'Primary Process',
      parent_pid: null,
      children: [],
      depth: 0
    }];
  }
}

export const forensicCorrelationEngine = new ForensicCorrelationEngine();
export default forensicCorrelationEngine;