/**
 * Event Normalizer
 * Converts raw forensic telemetry into standardized behavioral events
 */

import logger from '../config/logger';
import { v4 as uuidv4 } from 'uuid';
import {
  RawTelemetryEvent,
  NormalizedEvent,
  NormalizedEventType
} from './threat_models';

const RANSOMWARE_EXTENSIONS = ['.encrypted', '.locked', '.crypto', '.ransom', '.key', '.encrypted'];
const RANSOM_NOTE_NAMES = ['readme.txt', 'readme.html', 'how_to_decrypt.txt', 'recovery.txt', 'decrypt_instructions.txt'];

export class EventNormalizer {
  private normalizationRules: Map<string, NormalizedEventType>;

  constructor() {
    this.normalizationRules = new Map([
      ['process_start', NormalizedEventType.PROCESS_START],
      ['process_create', NormalizedEventType.PROCESS_START],
      ['process_terminate', NormalizedEventType.PROCESS_TERMINATE],
      ['file_create', NormalizedEventType.FILE_CREATE],
      ['file_modify', NormalizedEventType.FILE_MODIFY],
      ['file_write', NormalizedEventType.FILE_MODIFY],
      ['file_delete', NormalizedEventType.FILE_DELETE],
      ['file_rename', NormalizedEventType.FILE_RENAME],
      ['registry_create', NormalizedEventType.REGISTRY_CREATE],
      ['registry_set', NormalizedEventType.REGISTRY_MODIFY],
      ['registry_delete', NormalizedEventType.REGISTRY_DELETE],
      ['network_connect', NormalizedEventType.NETWORK_CONNECT],
      ['network_connect_outbound', NormalizedEventType.NETWORK_CONNECT],
      ['network_listen', NormalizedEventType.NETWORK_LISTEN],
      ['network_accept', NormalizedEventType.NETWORK_LISTEN],
      ['network_send', NormalizedEventType.NETWORK_DATA_SENT],
      ['network_receive', NormalizedEventType.NETWORK_DATA_RECEIVED],
    ]);
  }

  normalize(events: RawTelemetryEvent[], sessionId: string): NormalizedEvent[] {
    const normalizedEvents: NormalizedEvent[] = [];
    
    for (const event of events) {
      try {
        const normalized = this.normalizeSingleEvent(event, sessionId);
        if (normalized) {
          normalizedEvents.push(normalized);
        }
      } catch (error) {
        logger.error(`Failed to normalize event: ${error}`);
      }
    }

    return this.enrichWithBehavioralPatterns(normalizedEvents);
  }

  private normalizeSingleEvent(event: RawTelemetryEvent, sessionId: string): NormalizedEvent {
    const eventType = this.mapEventType(event.eventType);
    const behavioralTags = this.extractBehavioralTags(event, eventType);

    return {
      id: uuidv4(),
      sessionId,
      originalEvent: event,
      normalizedType: eventType,
      timestamp: new Date(event.timestamp),
      behavioralTags,
      metadata: this.enrichMetadata(event, eventType)
    };
  }

  private mapEventType(rawType: string): NormalizedEventType {
    const normalized = this.normalizationRules.get(rawType.toLowerCase());
    return normalized || NormalizedEventType.UNKNOWN;
  }

  private extractBehavioralTags(event: RawTelemetryEvent, normalizedType: NormalizedEventType): string[] {
    const tags: string[] = [];

    const path = event.path || event.target || '';
    const processName = event.processName || '';
    const operation = event.operation || '';

    if (normalizedType === NormalizedEventType.FILE_MODIFY || normalizedType === NormalizedEventType.FILE_CREATE) {
      if (RANSOMWARE_EXTENSIONS.some(ext => path.toLowerCase().endsWith(ext))) {
        tags.push('encrypted_file');
      }
      if (path.toLowerCase().includes('temp') || path.toLowerCase().includes('appdata')) {
        tags.push('suspicious_location');
      }
    }

    if (normalizedType === NormalizedEventType.REGISTRY_MODIFY || normalizedType === NormalizedEventType.REGISTRY_CREATE) {
      if (path.toLowerCase().includes('run') || path.toLowerCase().includes('autorun')) {
        tags.push('persistence_registry');
      }
      if (path.toLowerCase().includes('currentversion\\run')) {
        tags.push('startup_persistence');
      }
    }

    if (normalizedType === NormalizedEventType.NETWORK_CONNECT) {
      if (event.destination?.startsWith('192.168.') || event.destination?.startsWith('10.') || event.destination?.startsWith('172.')) {
        tags.push('internal_network');
      } else {
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

  private enrichMetadata(event: RawTelemetryEvent, normalizedType: NormalizedEventType): Record<string, any> {
    const metadata: Record<string, any> = {};

    if (event.processId) metadata.processId = event.processId;
    if (event.processName) metadata.processName = event.processName;
    if (event.path) metadata.path = event.path;
    if (event.target) metadata.target = event.target;
    if (event.source) metadata.source = event.source;
    if (event.destination) metadata.destination = event.destination;
    if (event.port) metadata.port = event.port;
    if (event.protocol) metadata.protocol = event.protocol;
    if (event.details) metadata.details = event.details;

    metadata.rawEventType = event.eventType;

    return metadata;
  }

  private enrichWithBehavioralPatterns(events: NormalizedEvent[]): NormalizedEvent[] {
    const processEvents = events.filter(e => 
      e.normalizedType === NormalizedEventType.PROCESS_START
    );
    if (processEvents.length > 5) {
      const threshold = 300000; 
      if (processEvents.length > 10) {
        events.push(this.createBehavioralEvent(
          events[0].sessionId,
          NormalizedEventType.RAPID_PROCESS_SPAWNING,
          { count: processEvents.length, processes: processEvents.map(e => e.metadata.processName) }
        ));
      }
    }

    const fileModEvents = events.filter(e => 
      e.normalizedType === NormalizedEventType.FILE_MODIFY || 
      e.normalizedType === NormalizedEventType.FILE_CREATE
    );
    if (fileModEvents.length > 20) {
      events.push(this.createBehavioralEvent(
        events[0].sessionId,
        NormalizedEventType.MASS_FILE_MODIFICATION,
        { count: fileModEvents.length }
      ));
    }

    const registryPersist = events.filter(e =>
      e.behavioralTags.includes('persistence_registry')
    );
    if (registryPersist.length > 0) {
      events.push(this.createBehavioralEvent(
        events[0].sessionId,
        NormalizedEventType.PERSISTENCE_ATTEMPT,
        { count: registryPersist.length, keys: registryPersist.map(e => e.metadata.path) }
      ));
    }

    const suspiciousNet = events.filter(e =>
      e.behavioralTags.includes('external_network') &&
      (e.normalizedType === NormalizedEventType.NETWORK_CONNECT || e.normalizedType === NormalizedEventType.NETWORK_DATA_SENT)
    );
    if (suspiciousNet.length > 3) {
      events.push(this.createBehavioralEvent(
        events[0].sessionId,
        NormalizedEventType.SUSPICIOUS_NETWORK_ACTIVITY,
        { connections: suspiciousNet.length, destinations: [...new Set(suspiciousNet.map(e => e.metadata.destination))] }
      ));
    }

    for (const event of events) {
      const path = event.metadata.path || event.metadata.target || '';
      if (RANSOM_NOTE_NAMES.some(name => path.toLowerCase().includes(name.toLowerCase()))) {
        events.push(this.createBehavioralEvent(
          event.sessionId,
          NormalizedEventType.RANSOM_NOTE_CREATION,
          { path }
        ));
        break;
      }
    }

    return events;
  }

  private createBehavioralEvent(sessionId: string, type: NormalizedEventType, data: Record<string, any>): NormalizedEvent {
    return {
      id: uuidv4(),
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

export const eventNormalizer = new EventNormalizer();
export default eventNormalizer;