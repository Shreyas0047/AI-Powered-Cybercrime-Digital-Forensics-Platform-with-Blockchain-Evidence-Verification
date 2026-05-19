"use strict";
/**
 * Feature Extraction Engine
 * Calculates forensic metrics from normalized telemetry
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.featureExtractor = exports.FeatureExtractor = void 0;
const threat_models_1 = require("./threat_models");
const SUSPICIOUS_EXTENSIONS = [
    '.exe', '.dll', '.bat', '.cmd', '.ps1', '.vbs', '.js', '.jse',
    '.wsf', '.wsh', '.scr', '.pif', '.com', '.hta', '.msi'
];
const SUSPICIOUS_PORTS = [
    4444, 5555, 6666, 7777, 8888, 9999,
    31337, 12345, 54321, 1337,
    21, 23, 25, 110, 143, 445, 3389, 5900
];
const PRIVILEGE_ESCALATION_PATTERNS = [
    'token', 'privilege', 'elevation', 'bypassuac', 'uac',
    'system', 'admin', 'root', 'sudo'
];
const SUSPICIOUS_PROCESSES = [
    'mimikatz', 'procdump', 'lsass', 'pwdump', 'wce',
    'netcat', 'ncat', 'nc', 'socat',
    'powershell', 'cmd', 'wscript', 'cscript',
    'rundll32', 'regsvr32', 'mshta', 'bitsadmin',
    'certutil', 'certui'
];
class FeatureExtractor {
    extractFeatures(events) {
        if (events.length === 0) {
            return this.getEmptyFeatures();
        }
        const sortedEvents = [...events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        const startTime = new Date(sortedEvents[0].timestamp).getTime();
        const endTime = new Date(sortedEvents[sortedEvents.length - 1].timestamp).getTime();
        const executionDuration = endTime - startTime;
        const processEvents = events.filter(e => e.normalizedType === threat_models_1.NormalizedEventType.PROCESS_START);
        const processNames = new Set(processEvents.map(e => e.metadata.processName).filter(Boolean));
        const spawnedProcesses = processNames.size;
        const spawnRate = this.calculateSpawnRate(processEvents, executionDuration);
        const fileModifyEvents = events.filter(e => e.normalizedType === threat_models_1.NormalizedEventType.FILE_MODIFY);
        const fileCreateEvents = events.filter(e => e.normalizedType === threat_models_1.NormalizedEventType.FILE_CREATE);
        const fileDeleteEvents = events.filter(e => e.normalizedType === threat_models_1.NormalizedEventType.FILE_DELETE);
        const fileRenameEvents = events.filter(e => e.normalizedType === threat_models_1.NormalizedEventType.FILE_RENAME);
        const allFilePaths = [
            ...fileModifyEvents.map(e => e.metadata.path),
            ...fileCreateEvents.map(e => e.metadata.path),
            ...fileDeleteEvents.map(e => e.metadata.path),
            ...fileRenameEvents.map(e => e.metadata.path || e.metadata.target)
        ].filter(Boolean);
        const suspiciousExtensions = allFilePaths.filter(path => SUSPICIOUS_EXTENSIONS.some(ext => path.toLowerCase().endsWith(ext))).length;
        const registryEvents = events.filter(e => e.normalizedType === threat_models_1.NormalizedEventType.REGISTRY_MODIFY ||
            e.normalizedType === threat_models_1.NormalizedEventType.REGISTRY_CREATE);
        const registryDeleteEvents = events.filter(e => e.normalizedType === threat_models_1.NormalizedEventType.REGISTRY_DELETE);
        const persistenceKeys = registryEvents.filter(e => e.behavioralTags.includes('persistence_registry') ||
            e.behavioralTags.includes('startup_persistence'));
        const networkConnectEvents = events.filter(e => e.normalizedType === threat_models_1.NormalizedEventType.NETWORK_CONNECT);
        const networkSendEvents = events.filter(e => e.normalizedType === threat_models_1.NormalizedEventType.NETWORK_DATA_SENT);
        const uniqueIPs = new Set([
            ...networkConnectEvents.map(e => e.metadata.destination).filter(Boolean),
            ...networkSendEvents.map(e => e.metadata.destination).filter(Boolean)
        ]);
        const uniquePorts = new Set([
            ...networkConnectEvents.map(e => e.metadata.port).filter(Boolean),
            ...networkSendEvents.map(e => e.metadata.port).filter(Boolean)
        ]);
        const suspiciousPorts = [...uniquePorts].filter(port => SUSPICIOUS_PORTS.includes(port));
        const privilegeEscalationEvents = events.filter(e => {
            const processName = (e.metadata.processName || '').toLowerCase();
            const path = (e.metadata.path || '').toLowerCase();
            return PRIVILEGE_ESCALATION_PATTERNS.some(pattern => processName.includes(pattern) || path.includes(pattern));
        });
        const powershellEvents = events.filter(e => {
            const processName = (e.metadata.processName || '').toLowerCase();
            return processName.includes('powershell') || processName.includes('pwsh');
        });
        const cmdEvents = events.filter(e => {
            const processName = (e.metadata.processName || '').toLowerCase();
            return processName.includes('cmd') && !processName.includes('cmstp');
        });
        const wmiEvents = events.filter(e => {
            const processName = (e.metadata.processName || '').toLowerCase();
            return processName.includes('wmi') || processName.includes('mof');
        });
        const suspiciousBehaviors = events.filter(e => e.behavioralTags.includes('derived_behavior') ||
            e.normalizedType === threat_models_1.NormalizedEventType.MASS_FILE_MODIFICATION ||
            e.normalizedType === threat_models_1.NormalizedEventType.PERSISTENCE_ATTEMPT ||
            e.normalizedType === threat_models_1.NormalizedEventType.SUSPICIOUS_NETWORK_ACTIVITY ||
            e.normalizedType === threat_models_1.NormalizedEventType.RAPID_PROCESS_SPAWNING ||
            e.normalizedType === threat_models_1.NormalizedEventType.RANSOM_NOTE_CREATION);
        return {
            totalEvents: events.length,
            totalProcesses: processNames.size,
            spawnedProcesses,
            rapidProcessSpawnRate: spawnRate,
            fileModificationCount: fileModifyEvents.length,
            fileCreateCount: fileCreateEvents.length,
            fileDeleteCount: fileDeleteEvents.length,
            renamedFilesCount: fileRenameEvents.length,
            suspiciousExtensionsCount: suspiciousExtensions,
            registryModificationCount: registryEvents.length,
            persistenceKeysModified: persistenceKeys.length,
            networkConnectionCount: networkConnectEvents.length + networkSendEvents.length,
            outboundConnectionCount: networkConnectEvents.filter(e => e.behavioralTags.includes('external_network')).length,
            inboundConnectionCount: networkConnectEvents.filter(e => e.behavioralTags.includes('internal_network')).length,
            uniqueDestinationIPs: [...uniqueIPs],
            uniqueDestinationPorts: [...uniquePorts],
            suspiciousPortsUsed: suspiciousPorts,
            processTreeDepth: this.estimateProcessTreeDepth(processEvents),
            privilegeEscalationAttempts: privilegeEscalationEvents.length,
            executionDuration,
            suspiciousBehaviorCount: suspiciousBehaviors.length,
            powershellExecutions: powershellEvents.length,
            cmdExecutions: cmdEvents.length,
            wmiExecutions: wmiEvents.length
        };
    }
    calculateSpawnRate(events, duration) {
        if (events.length < 2 || duration === 0)
            return 0;
        return (events.length / duration) * 1000;
    }
    estimateProcessTreeDepth(events) {
        if (events.length === 0)
            return 0;
        return Math.min(5, Math.ceil(Math.log2(events.length + 1)));
    }
    getEmptyFeatures() {
        return {
            totalEvents: 0,
            totalProcesses: 0,
            spawnedProcesses: 0,
            rapidProcessSpawnRate: 0,
            fileModificationCount: 0,
            fileCreateCount: 0,
            fileDeleteCount: 0,
            renamedFilesCount: 0,
            suspiciousExtensionsCount: 0,
            registryModificationCount: 0,
            persistenceKeysModified: 0,
            networkConnectionCount: 0,
            outboundConnectionCount: 0,
            inboundConnectionCount: 0,
            uniqueDestinationIPs: [],
            uniqueDestinationPorts: [],
            suspiciousPortsUsed: [],
            processTreeDepth: 0,
            privilegeEscalationAttempts: 0,
            executionDuration: 0,
            suspiciousBehaviorCount: 0,
            powershellExecutions: 0,
            cmdExecutions: 0,
            wmiExecutions: 0
        };
    }
}
exports.FeatureExtractor = FeatureExtractor;
exports.featureExtractor = new FeatureExtractor();
exports.default = exports.featureExtractor;
//# sourceMappingURL=feature_extractor.js.map