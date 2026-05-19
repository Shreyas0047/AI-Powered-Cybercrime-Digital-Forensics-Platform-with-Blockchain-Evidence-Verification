"use strict";
/**
 * Event Normalizer
 * Converts raw forensic telemetry into standardized behavioral events
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventNormalizer = exports.EventNormalizer = void 0;
const uuid_1 = require("uuid");
const threat_models_1 = require("./threat_models");
const RANSOMWARE_EXTENSIONS = ['.encrypted', '.locked', '.crypto', '.ransom', '.key', '.encrypted'];
const RANSOM_NOTE_NAMES = ['readme.txt', 'readme.html', 'how_to_decrypt.txt', 'recovery.txt', 'decrypt_instructions.txt'];
class EventNormalizer {
    normalizationRules;
    constructor() {
        this.normalizationRules = new Map([
            ['process_start', threat_models_1.NormalizedEventType.PROCESS_START],
            ['process_create', threat_models_1.NormalizedEventType.PROCESS_START],
            ['process_terminate', threat_models_1.NormalizedEventType.PROCESS_TERMINATE],
            ['file_create', threat_models_1.NormalizedEventType.FILE_CREATE],
            ['file_modify', threat_models_1.NormalizedEventType.FILE_MODIFY],
            ['file_write', threat_models_1.NormalizedEventType.FILE_MODIFY],
            ['file_delete', threat_models_1.NormalizedEventType.FILE_DELETE],
            ['file_rename', threat_models_1.NormalizedEventType.FILE_RENAME],
            ['registry_create', threat_models_1.NormalizedEventType.REGISTRY_CREATE],
            ['registry_set', threat_models_1.NormalizedEventType.REGISTRY_MODIFY],
            ['registry_delete', threat_models_1.NormalizedEventType.REGISTRY_DELETE],
            ['network_connect', threat_models_1.NormalizedEventType.NETWORK_CONNECT],
            ['network_connect_outbound', threat_models_1.NormalizedEventType.NETWORK_CONNECT],
            ['network_listen', threat_models_1.NormalizedEventType.NETWORK_LISTEN],
            ['network_accept', threat_models_1.NormalizedEventType.NETWORK_LISTEN],
            ['network_send', threat_models_1.NormalizedEventType.NETWORK_DATA_SENT],
            ['network_receive', threat_models_1.NormalizedEventType.NETWORK_DATA_RECEIVED],
        ]);
    }
    normalize(events, sessionId) {
        const normalizedEvents = [];
        for (const event of events) {
            try {
                const normalized = this.normalizeSingleEvent(event, sessionId);
                if (normalized) {
                    normalizedEvents.push(normalized);
                }
            }
            catch (error) {
                console.error(`Failed to normalize event: ${error}`);
            }
        }
        return this.enrichWithBehavioralPatterns(normalizedEvents);
    }
    normalizeSingleEvent(event, sessionId) {
        const eventType = this.mapEventType(event.eventType);
        const behavioralTags = this.extractBehavioralTags(event, eventType);
        return {
            id: (0, uuid_1.v4)(),
            sessionId,
            originalEvent: event,
            normalizedType: eventType,
            timestamp: new Date(event.timestamp),
            behavioralTags,
            metadata: this.enrichMetadata(event, eventType)
        };
    }
    mapEventType(rawType) {
        const normalized = this.normalizationRules.get(rawType.toLowerCase());
        return normalized || threat_models_1.NormalizedEventType.UNKNOWN;
    }
    extractBehavioralTags(event, normalizedType) {
        const tags = [];
        const path = event.path || event.target || '';
        const processName = event.processName || '';
        const operation = event.operation || '';
        if (normalizedType === threat_models_1.NormalizedEventType.FILE_MODIFY || normalizedType === threat_models_1.NormalizedEventType.FILE_CREATE) {
            if (RANSOMWARE_EXTENSIONS.some(ext => path.toLowerCase().endsWith(ext))) {
                tags.push('encrypted_file');
            }
            if (path.toLowerCase().includes('temp') || path.toLowerCase().includes('appdata')) {
                tags.push('suspicious_location');
            }
        }
        if (normalizedType === threat_models_1.NormalizedEventType.REGISTRY_MODIFY || normalizedType === threat_models_1.NormalizedEventType.REGISTRY_CREATE) {
            if (path.toLowerCase().includes('run') || path.toLowerCase().includes('autorun')) {
                tags.push('persistence_registry');
            }
            if (path.toLowerCase().includes('currentversion\\run')) {
                tags.push('startup_persistence');
            }
        }
        if (normalizedType === threat_models_1.NormalizedEventType.NETWORK_CONNECT) {
            if (event.destination?.startsWith('192.168.') || event.destination?.startsWith('10.') || event.destination?.startsWith('172.')) {
                tags.push('internal_network');
            }
            else {
                tags.push('external_network');
            }
        }
        if (processName.toLowerCase().includes('powershell') || processName.toLowerCase().includes('cmd')) {
            tags.push('script_execution');
        }
        if (operation.toLowerCase().includes('spawn') || operation.toLowerCase().includes('create')) {
            tags.push('process_spawn');
        }
        return tags;
    }
    enrichMetadata(event, normalizedType) {
        const metadata = {};
        if (event.processId)
            metadata.processId = event.processId;
        if (event.processName)
            metadata.processName = event.processName;
        if (event.path)
            metadata.path = event.path;
        if (event.target)
            metadata.target = event.target;
        if (event.source)
            metadata.source = event.source;
        if (event.destination)
            metadata.destination = event.destination;
        if (event.port)
            metadata.port = event.port;
        if (event.protocol)
            metadata.protocol = event.protocol;
        if (event.details)
            metadata.details = event.details;
        metadata.rawEventType = event.eventType;
        return metadata;
    }
    enrichWithBehavioralPatterns(events) {
        const processEvents = events.filter(e => e.normalizedType === threat_models_1.NormalizedEventType.PROCESS_START);
        if (processEvents.length > 5) {
            const threshold = 300000;
            if (processEvents.length > 10) {
                events.push(this.createBehavioralEvent(events[0].sessionId, threat_models_1.NormalizedEventType.RAPID_PROCESS_SPAWNING, { count: processEvents.length, processes: processEvents.map(e => e.metadata.processName) }));
            }
        }
        const fileModEvents = events.filter(e => e.normalizedType === threat_models_1.NormalizedEventType.FILE_MODIFY ||
            e.normalizedType === threat_models_1.NormalizedEventType.FILE_CREATE);
        if (fileModEvents.length > 20) {
            events.push(this.createBehavioralEvent(events[0].sessionId, threat_models_1.NormalizedEventType.MASS_FILE_MODIFICATION, { count: fileModEvents.length }));
        }
        const registryPersist = events.filter(e => e.behavioralTags.includes('persistence_registry'));
        if (registryPersist.length > 0) {
            events.push(this.createBehavioralEvent(events[0].sessionId, threat_models_1.NormalizedEventType.PERSISTENCE_ATTEMPT, { count: registryPersist.length, keys: registryPersist.map(e => e.metadata.path) }));
        }
        const suspiciousNet = events.filter(e => e.behavioralTags.includes('external_network') &&
            (e.normalizedType === threat_models_1.NormalizedEventType.NETWORK_CONNECT || e.normalizedType === threat_models_1.NormalizedEventType.NETWORK_DATA_SENT));
        if (suspiciousNet.length > 3) {
            events.push(this.createBehavioralEvent(events[0].sessionId, threat_models_1.NormalizedEventType.SUSPICIOUS_NETWORK_ACTIVITY, { connections: suspiciousNet.length, destinations: [...new Set(suspiciousNet.map(e => e.metadata.destination))] }));
        }
        for (const event of events) {
            const path = event.metadata.path || event.metadata.target || '';
            if (RANSOM_NOTE_NAMES.some(name => path.toLowerCase().includes(name.toLowerCase()))) {
                events.push(this.createBehavioralEvent(event.sessionId, threat_models_1.NormalizedEventType.RANSOM_NOTE_CREATION, { path }));
                break;
            }
        }
        return events;
    }
    createBehavioralEvent(sessionId, type, data) {
        return {
            id: (0, uuid_1.v4)(),
            sessionId,
            originalEvent: {
                eventType: type,
                timestamp: new Date(),
                details: data
            },
            normalizedType: type,
            timestamp: new Date(),
            behavioralTags: ['derived_behavior'],
            metadata: data
        };
    }
}
exports.EventNormalizer = EventNormalizer;
exports.eventNormalizer = new EventNormalizer();
exports.default = exports.eventNormalizer;
//# sourceMappingURL=event_normalizer.js.map