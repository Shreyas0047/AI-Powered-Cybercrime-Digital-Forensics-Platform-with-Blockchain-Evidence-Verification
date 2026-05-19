"use strict";
/**
 * Forensic Correlation Engine
 * Centralized engine to correlate raw forensic events into meaningful attack narratives
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.forensicCorrelationEngine = exports.ForensicCorrelationEngine = void 0;
const uuid_1 = require("uuid");
class ForensicCorrelationEngine {
    correlateEvents(events, features, sessionId) {
        const sortedEvents = [...events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
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
    extractRelationships(events) {
        const relationships = [];
        const processMap = new Map();
        for (const event of events) {
            const processName = event.metadata.processName || 'unknown';
            if (!processMap.has(processName)) {
                processMap.set(processName, []);
            }
            processMap.get(processName).push(event);
        }
        for (let i = 0; i < events.length - 1; i++) {
            const current = events[i];
            const next = events[i + 1];
            const timeDiff = new Date(next.timestamp).getTime() - new Date(current.timestamp).getTime();
            if (current.metadata.processName === next.metadata.processName) {
                relationships.push({
                    relationship_id: (0, uuid_1.v4)(),
                    source_event_id: current.id,
                    target_event_id: next.id,
                    relationship_type: 'sequential',
                    confidence: 0.8,
                    metadata: { time_diff_ms: timeDiff }
                });
            }
            if (timeDiff < 5000 && current.normalizedType !== next.normalizedType) {
                relationships.push({
                    relationship_id: (0, uuid_1.v4)(),
                    source_event_id: current.id,
                    target_event_id: next.id,
                    relationship_type: 'correlated',
                    confidence: 0.5,
                    metadata: { time_diff_ms: timeDiff }
                });
            }
            if (this.isParentChildRelationship(current, next)) {
                relationships.push({
                    relationship_id: (0, uuid_1.v4)(),
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
    isParentChildRelationship(event1, event2) {
        if (event1.normalizedType === 'process_start' && event2.normalizedType === 'file_create') {
            return true;
        }
        if (event1.normalizedType === 'file_create' && event2.normalizedType === 'network_connect') {
            return true;
        }
        if (event1.normalizedType === 'network_connect' && event2.normalizedType === 'registry_modify') {
            return true;
        }
        return false;
    }
    reconstructAttackChains(events, features, sessionId) {
        const chains = [];
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
    identifyAttackStages(events) {
        const stages = [];
        const stageDefinitions = [
            { name: 'Initial Access', types: ['process_start'] },
            { name: 'Execution', types: ['file_create', 'file_modify'] },
            { name: 'Persistence', types: ['registry_modify', 'registry_create', 'persistence_attempt'] },
            { name: 'Discovery', types: ['file_scan'] },
            { name: 'Collection', types: ['file_create', 'file_modify'] },
            { name: 'Exfiltration', types: ['network_connect', 'network_data_sent'] },
            { name: 'Impact', types: ['mass_file_modification', 'ransom_note_creation'] }
        ];
        for (const stageDef of stageDefinitions) {
            const stageEvents = events.filter(e => stageDef.types.includes(e.normalizedType));
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
    extractStageIndicators(events) {
        const indicators = [];
        for (const event of events) {
            if (event.behavioralTags.length > 0) {
                indicators.push(...event.behavioralTags);
            }
        }
        return [...new Set(indicators)];
    }
    extractMitreFromEvents(events) {
        const techniques = [];
        for (const event of events) {
            const eventType = event.normalizedType;
            if (eventType.includes('process'))
                techniques.push('T1059');
            if (eventType.includes('file_modify') || eventType.includes('file_create'))
                techniques.push('T1486');
            if (eventType.includes('registry'))
                techniques.push('T1547.001');
            if (eventType.includes('network'))
                techniques.push('T1071');
        }
        return [...new Set(techniques)];
    }
    extractMitreTacticsFromStages(stages) {
        const tacticsSet = new Set();
        const techniqueToTactic = {
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
                if (tactic)
                    tacticsSet.add(tactic);
            }
        }
        return [...tacticsSet];
    }
    calculateChainSeverity(features) {
        const score = features.fileModificationCount * 0.5 +
            features.persistenceKeysModified * 10 +
            features.outboundConnectionCount * 3 +
            features.privilegeEscalationAttempts * 15 +
            features.suspiciousBehaviorCount * 5;
        if (score > 80)
            return 'critical';
        if (score > 50)
            return 'high';
        if (score > 25)
            return 'medium';
        return 'low';
    }
    calculateChainConfidence(events, stages) {
        let confidence = 50;
        confidence += stages.length * 5;
        const eventDiversity = new Set(events.map(e => e.normalizedType)).size;
        confidence += eventDiversity * 3;
        const totalEvents = events.length;
        if (totalEvents > 50)
            confidence += 15;
        else if (totalEvents > 20)
            confidence += 10;
        return Math.min(95, Math.max(20, confidence));
    }
    detectIncidents(events, chains, sessionId) {
        const incidents = [];
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
    detectSuspiciousPatterns(events) {
        const patterns = [];
        const fileMods = events.filter(e => e.normalizedType === 'file_modify');
        if (fileMods.length > 30) {
            patterns.push({
                name: 'Mass file modification detected',
                description: `${fileMods.length} file modifications in a short period`,
                severity: 'high',
                events: fileMods
            });
        }
        const persistence = events.filter(e => e.normalizedType === 'registry_modify' ||
            e.behavioralTags.includes('persistence_registry'));
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
    buildEvidenceGraph(events, relationships) {
        const nodes = [];
        const nodeIds = new Set();
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
        const edges = [];
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
    getNodeLabel(event) {
        const processName = event.metadata.processName || 'unknown';
        const path = event.metadata.path || event.metadata.target || '';
        if (path)
            return `${processName}: ${path.substring(0, 30)}`;
        return processName;
    }
    buildProcessTree(events) {
        const processNodes = new Map();
        const roots = [];
        const processEvents = events.filter(e => e.normalizedType === 'process_start');
        for (const event of processEvents) {
            const pid = event.metadata.processId || event.metadata.processName || (0, uuid_1.v4)();
            const name = event.metadata.processName || 'unknown';
            const node = {
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
exports.ForensicCorrelationEngine = ForensicCorrelationEngine;
exports.forensicCorrelationEngine = new ForensicCorrelationEngine();
exports.default = exports.forensicCorrelationEngine;
//# sourceMappingURL=correlation_engine_v2.js.map