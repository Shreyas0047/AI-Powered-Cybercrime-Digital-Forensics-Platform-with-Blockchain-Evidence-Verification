/**
 * Evidence Artifacts Service
 * Reads forensic evidence artifacts from monitoring directories
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  EvidenceArtifact,
  ForensicEvidenceDetail,
  EvidenceArtifactCategory,
  EventRelationship,
} from '../types/reports';

const MONITORING_DIR = path.resolve(process.cwd(), 'logs/monitoring');
const REPORTS_DIR = path.resolve(process.cwd(), 'uploads/reports');

function generateId(prefix: string, index: number): string {
  return `${prefix}-${String(index).padStart(4, '0')}`;
}

function categorizeByFileName(name: string): EvidenceArtifactCategory {
  const lower = name.toLowerCase();
  if (lower.includes('process') || lower.includes('proc')) return 'process_dump';
  if (lower.includes('file') || lower.includes('sample')) return 'file_sample';
  if (lower.includes('registry') || lower.includes('reg')) return 'registry_snapshot';
  if (lower.includes('network') || lower.includes('pcap') || lower.includes('capture')) return 'network_capture';
  if (lower.includes('memory') || lower.includes('dump')) return 'memory_dump';
  if (lower.includes('screen') || lower.includes('shot')) return 'screenshot';
  if (lower.includes('log')) return 'log_file';
  if (lower.includes('config')) return 'config_file';
  return 'configuration';
}

function extractMetadata(content: Record<string, unknown>): Record<string, unknown> {
  const meta: Record<string, unknown> = {};

  if (content.event_id) meta.eventId = content.event_id;
  if (content.session_id) meta.sessionId = content.session_id;
  if (content.simulator_id) meta.simulatorId = content.simulator_id;
  if (content.timestamp) meta.timestamp = content.timestamp;
  if (content.category) meta.category = content.category;
  if (content.severity) meta.severity = content.severity;
  if (content.operation) meta.operation = content.operation;
  if (content.details) meta.details = content.details;

  return meta;
}

function computeHash(filePath: string): { sha256?: string; md5?: string } {
  try {
    const crypto = require('crypto');
    const data = fs.readFileSync(filePath);
    return {
      sha256: crypto.createHash('sha256').update(data).digest('hex'),
      md5: crypto.createHash('md5').update(data).digest('hex'),
    };
  } catch {
    return {};
  }
}

export class EvidenceArtifactsService {
  async getArtifacts(options: {
    page?: number;
    limit?: number;
    category?: EvidenceArtifactCategory;
    search?: string;
    source?: string;
  } = {}): Promise<{ artifacts: EvidenceArtifact[]; total: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const artifacts: EvidenceArtifact[] = [];
    const searchDirs = [MONITORING_DIR, REPORTS_DIR];

    let index = 0;

    for (const dir of searchDirs) {
      if (!fs.existsSync(dir)) continue;

      try {
        const files = fs.readdirSync(dir);

        for (const file of files) {
          if (!file.endsWith('.json')) continue;

          const filePath = path.join(dir, file);
          let content: Record<string, unknown> = {};

          try {
            const raw = fs.readFileSync(filePath, 'utf-8');
            content = JSON.parse(raw);
          } catch {
            continue;
          }

          // If it's a forensic report with nested events, extract individual events
          const events = (content.process_activity as Record<string, unknown>[] | undefined) || [];
          const fileEvents = (content.file_activity as Record<string, unknown>[] | undefined) || [];
          const regEvents = (content.registry_activity as Record<string, unknown>[] | undefined) || [];
          const netEvents = (content.network_activity as Record<string, unknown>[] | undefined) || [];

          const allEvents = [...events, ...fileEvents, ...regEvents, ...netEvents];

          if (allEvents.length > 0) {
            // Treat each event as an artifact
            for (const event of allEvents) {
              if (!event || typeof event !== 'object') continue;

              const ev = event as Record<string, unknown>;
              const cat = (ev.category as string || 'configuration').toLowerCase();
              const artifactCat: EvidenceArtifactCategory =
                cat === 'process' ? 'process_dump' :
                cat === 'file' ? 'file_sample' :
                cat === 'registry' ? 'registry_snapshot' :
                cat === 'network' ? 'network_capture' :
                'configuration';

              if (options.category && options.category !== artifactCat) continue;

              const id = (ev.event_id || ev.id || generateId('ART', index)) as string;
              const timestamp = (ev.timestamp as string) || new Date().toISOString();

              if (options.search) {
                const q = options.search.toLowerCase();
                const idStr = String(id).toLowerCase();
                const opStr = (ev.operation as string || '').toLowerCase();
                if (!idStr.includes(q) && !opStr.includes(q)) continue;
              }

              if (options.source && !filePath.includes(options.source)) continue;

              artifacts.push({
                id: String(id),
                evidenceId: `ART-${index + 1}`.padStart(10, '0'),
                name: `${cat}_event_${id}.json`,
                source: path.relative(process.cwd(), filePath),
                category: artifactCat,
                timestamp,
                filePath,
                fileSize: JSON.stringify(event).length,
                hash: {},
                blockchainVerified: false,
                metadata: extractMetadata(ev),
                relatedEvents: [],
                relatedProcesses: [],
                relatedNetworkConnections: [],
              });

              index++;
            }
          } else {
            // Standalone JSON file (not a report) - treat as artifact
            const stats = fs.statSync(filePath);
            const artifact: EvidenceArtifact = {
              id: generateId('ART', index),
              evidenceId: `ART-${index + 1}`.padStart(10, '0'),
              name: file,
              source: path.relative(process.cwd(), filePath),
              category: categorizeByFileName(file),
              timestamp: new Date(stats.mtime).toISOString(),
              filePath,
              fileSize: stats.size,
              hash: computeHash(filePath),
              blockchainVerified: false,
              metadata: extractMetadata(content),
              relatedEvents: [],
              relatedProcesses: [],
              relatedNetworkConnections: [],
            };

            if (options.category && options.category !== artifact.category) continue;

            if (options.search) {
              const q = options.search.toLowerCase();
              if (!artifact.name.toLowerCase().includes(q) &&
                  !artifact.id.toLowerCase().includes(q)) continue;
            }

            artifacts.push(artifact);
            index++;
          }
        }
      } catch (error) {
        console.error(`Error scanning directory ${dir}:`, error);
      }
    }

    // Sort by timestamp desc
    artifacts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const total = artifacts.length;
    const start = (page - 1) * limit;
    const paginated = artifacts.slice(start, start + limit);

    return { artifacts: paginated, total };
  }

  async getArtifactById(id: string): Promise<ForensicEvidenceDetail | null> {
    const { artifacts } = await this.getArtifacts({ limit: 1000 });

    const artifact = artifacts.find(a => a.id === id || a.evidenceId === id);
    if (!artifact) return null;

    let rawEvent: Record<string, unknown> = {};
    let timeline: ForensicEvidenceDetail['timeline'] = [];
    let relationships: EventRelationship[] = [];

    try {
      if (fs.existsSync(artifact.filePath)) {
        const content = fs.readFileSync(artifact.filePath, 'utf-8');
        rawEvent = JSON.parse(content);

        // Build timeline from all events
        const processEvents = (rawEvent.process_activity as Record<string, unknown>[] | undefined) || [];
        const fileEvents = (rawEvent.file_activity as Record<string, unknown>[] | undefined) || [];
        const regEvents = (rawEvent.registry_activity as Record<string, unknown>[] | undefined) || [];
        const netEvents = (rawEvent.network_activity as Record<string, unknown>[] | undefined) || [];

        for (const ev of [...processEvents, ...fileEvents, ...regEvents, ...netEvents]) {
          if (!ev || typeof ev !== 'object') continue;
          const e = ev as Record<string, unknown>;
          const severityValue = (e.severity as string) || 'info';
          const categoryValue = (e.category as string) || 'system';
          timeline.push({
            eventId: (e.event_id as string) || 'unknown',
            timestamp: (e.timestamp as string) || new Date().toISOString(),
            category: categoryValue as 'process' | 'file' | 'registry' | 'network' | 'system',
            operation: (e.operation as string) || '',
            severity: severityValue as 'critical' | 'high' | 'medium' | 'low' | 'info',
            source: (e.source as string) || artifact.source,
            details: (e.details as Record<string, unknown>) || {},
          });
        }
        timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      }
    } catch (error) {
      console.error(`Error loading artifact detail ${artifact.filePath}:`, error);
    }

    return {
      ...artifact,
      rawEvent,
      eventRelationships: relationships,
      timeline,
    };
  }
}

export const evidenceArtifactsService = new EvidenceArtifactsService();