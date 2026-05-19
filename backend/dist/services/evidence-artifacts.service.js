"use strict";
/**
 * Evidence Artifacts Service
 * Reads forensic evidence artifacts from monitoring directories
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.evidenceArtifactsService = exports.EvidenceArtifactsService = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const MONITORING_DIR = path.resolve(process.cwd(), 'logs/monitoring');
const REPORTS_DIR = path.resolve(process.cwd(), 'uploads/reports');
function generateId(prefix, index) {
    return `${prefix}-${String(index).padStart(4, '0')}`;
}
function categorizeByFileName(name) {
    const lower = name.toLowerCase();
    if (lower.includes('process') || lower.includes('proc'))
        return 'process_dump';
    if (lower.includes('file') || lower.includes('sample'))
        return 'file_sample';
    if (lower.includes('registry') || lower.includes('reg'))
        return 'registry_snapshot';
    if (lower.includes('network') || lower.includes('pcap') || lower.includes('capture'))
        return 'network_capture';
    if (lower.includes('memory') || lower.includes('dump'))
        return 'memory_dump';
    if (lower.includes('screen') || lower.includes('shot'))
        return 'screenshot';
    if (lower.includes('log'))
        return 'log_file';
    if (lower.includes('config'))
        return 'config_file';
    return 'configuration';
}
function extractMetadata(content) {
    const meta = {};
    if (content.event_id)
        meta.eventId = content.event_id;
    if (content.session_id)
        meta.sessionId = content.session_id;
    if (content.simulator_id)
        meta.simulatorId = content.simulator_id;
    if (content.timestamp)
        meta.timestamp = content.timestamp;
    if (content.category)
        meta.category = content.category;
    if (content.severity)
        meta.severity = content.severity;
    if (content.operation)
        meta.operation = content.operation;
    if (content.details)
        meta.details = content.details;
    return meta;
}
function computeHash(filePath) {
    try {
        const crypto = require('crypto');
        const data = fs.readFileSync(filePath);
        return {
            sha256: crypto.createHash('sha256').update(data).digest('hex'),
            md5: crypto.createHash('md5').update(data).digest('hex'),
        };
    }
    catch {
        return {};
    }
}
class EvidenceArtifactsService {
    async getArtifacts(options = {}) {
        const page = Math.max(1, options.page || 1);
        const limit = Math.min(100, Math.max(1, options.limit || 20));
        const artifacts = [];
        const searchDirs = [MONITORING_DIR, REPORTS_DIR];
        let index = 0;
        for (const dir of searchDirs) {
            if (!fs.existsSync(dir))
                continue;
            try {
                const files = fs.readdirSync(dir);
                for (const file of files) {
                    if (!file.endsWith('.json'))
                        continue;
                    const filePath = path.join(dir, file);
                    let content = {};
                    try {
                        const raw = fs.readFileSync(filePath, 'utf-8');
                        content = JSON.parse(raw);
                    }
                    catch {
                        continue;
                    }
                    // If it's a forensic report with nested events, extract individual events
                    const events = content.process_activity || [];
                    const fileEvents = content.file_activity || [];
                    const regEvents = content.registry_activity || [];
                    const netEvents = content.network_activity || [];
                    const allEvents = [...events, ...fileEvents, ...regEvents, ...netEvents];
                    if (allEvents.length > 0) {
                        // Treat each event as an artifact
                        for (const event of allEvents) {
                            if (!event || typeof event !== 'object')
                                continue;
                            const ev = event;
                            const cat = (ev.category || 'configuration').toLowerCase();
                            const artifactCat = cat === 'process' ? 'process_dump' :
                                cat === 'file' ? 'file_sample' :
                                    cat === 'registry' ? 'registry_snapshot' :
                                        cat === 'network' ? 'network_capture' :
                                            'configuration';
                            if (options.category && options.category !== artifactCat)
                                continue;
                            const id = (ev.event_id || ev.id || generateId('ART', index));
                            const timestamp = ev.timestamp || new Date().toISOString();
                            if (options.search) {
                                const q = options.search.toLowerCase();
                                const idStr = String(id).toLowerCase();
                                const opStr = (ev.operation || '').toLowerCase();
                                if (!idStr.includes(q) && !opStr.includes(q))
                                    continue;
                            }
                            if (options.source && !filePath.includes(options.source))
                                continue;
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
                    }
                    else {
                        // Standalone JSON file (not a report) - treat as artifact
                        const stats = fs.statSync(filePath);
                        const artifact = {
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
                        if (options.category && options.category !== artifact.category)
                            continue;
                        if (options.search) {
                            const q = options.search.toLowerCase();
                            if (!artifact.name.toLowerCase().includes(q) &&
                                !artifact.id.toLowerCase().includes(q))
                                continue;
                        }
                        artifacts.push(artifact);
                        index++;
                    }
                }
            }
            catch (error) {
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
    async getArtifactById(id) {
        const { artifacts } = await this.getArtifacts({ limit: 1000 });
        const artifact = artifacts.find(a => a.id === id || a.evidenceId === id);
        if (!artifact)
            return null;
        let rawEvent = {};
        let timeline = [];
        let relationships = [];
        try {
            if (fs.existsSync(artifact.filePath)) {
                const content = fs.readFileSync(artifact.filePath, 'utf-8');
                rawEvent = JSON.parse(content);
                // Build timeline from all events
                const processEvents = rawEvent.process_activity || [];
                const fileEvents = rawEvent.file_activity || [];
                const regEvents = rawEvent.registry_activity || [];
                const netEvents = rawEvent.network_activity || [];
                for (const ev of [...processEvents, ...fileEvents, ...regEvents, ...netEvents]) {
                    if (!ev || typeof ev !== 'object')
                        continue;
                    const e = ev;
                    const severityValue = e.severity || 'info';
                    const categoryValue = e.category || 'system';
                    timeline.push({
                        eventId: e.event_id || 'unknown',
                        timestamp: e.timestamp || new Date().toISOString(),
                        category: categoryValue,
                        operation: e.operation || '',
                        severity: severityValue,
                        source: e.source || artifact.source,
                        details: e.details || {},
                    });
                }
                timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            }
        }
        catch (error) {
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
exports.EvidenceArtifactsService = EvidenceArtifactsService;
exports.evidenceArtifactsService = new EvidenceArtifactsService();
//# sourceMappingURL=evidence-artifacts.service.js.map