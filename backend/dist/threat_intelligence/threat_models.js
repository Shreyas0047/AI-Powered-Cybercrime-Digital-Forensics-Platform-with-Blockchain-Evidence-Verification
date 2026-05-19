"use strict";
/**
 * Threat Intelligence Models
 * Core data structures for threat analysis
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnomalyType = exports.HeuristicCategory = exports.MITRE_TECHNIQUES = exports.RiskSeverity = exports.BehaviorSeverity = exports.BehaviorType = exports.NormalizedEventType = void 0;
var NormalizedEventType;
(function (NormalizedEventType) {
    NormalizedEventType["PROCESS_START"] = "process_start";
    NormalizedEventType["PROCESS_TERMINATE"] = "process_terminate";
    NormalizedEventType["FILE_CREATE"] = "file_create";
    NormalizedEventType["FILE_MODIFY"] = "file_modify";
    NormalizedEventType["FILE_DELETE"] = "file_delete";
    NormalizedEventType["FILE_RENAME"] = "file_rename";
    NormalizedEventType["REGISTRY_CREATE"] = "registry_create";
    NormalizedEventType["REGISTRY_MODIFY"] = "registry_modify";
    NormalizedEventType["REGISTRY_DELETE"] = "registry_delete";
    NormalizedEventType["NETWORK_CONNECT"] = "network_connect";
    NormalizedEventType["NETWORK_LISTEN"] = "network_listen";
    NormalizedEventType["NETWORK_DATA_SENT"] = "network_data_sent";
    NormalizedEventType["NETWORK_DATA_RECEIVED"] = "network_data_received";
    NormalizedEventType["MASS_FILE_MODIFICATION"] = "mass_file_modification";
    NormalizedEventType["PERSISTENCE_ATTEMPT"] = "persistence_attempt";
    NormalizedEventType["SUSPICIOUS_NETWORK_ACTIVITY"] = "suspicious_network_activity";
    NormalizedEventType["RAPID_PROCESS_SPAWNING"] = "rapid_process_spawning";
    NormalizedEventType["PRIVILEGE_ESCALATION"] = "privilege_escalation";
    NormalizedEventType["CREDENTIAL_ACCESS"] = "credential_access";
    NormalizedEventType["SUSPICIOUS_POWERSHELL"] = "suspicious_powershell";
    NormalizedEventType["RANSOM_NOTE_CREATION"] = "ransom_note_creation";
    NormalizedEventType["UNKNOWN"] = "unknown";
})(NormalizedEventType || (exports.NormalizedEventType = NormalizedEventType = {}));
var BehaviorType;
(function (BehaviorType) {
    BehaviorType["RANSOMWARE_LIKE"] = "ransomware_like";
    BehaviorType["SPYWARE_LIKE"] = "spyware_like";
    BehaviorType["TROJAN_LIKE"] = "trojan_like";
    BehaviorType["WORM_LIKE"] = "worm_like";
    BehaviorType["PERSISTENCE_BEHAVIOR"] = "persistence_behavior";
    BehaviorType["CREDENTIAL_ACCESS"] = "credential_access";
    BehaviorType["NETWORK_BEACONING"] = "network_beaconing";
    BehaviorType["MASS_FILE_OPS"] = "mass_file_ops";
    BehaviorType["PRIVILEGE_ESCALATION"] = "privilege_escalation";
    BehaviorType["SUSPICIOUS_PROCESS"] = "suspicious_process";
    BehaviorType["REGISTRY_PERSISTENCE"] = "registry_persistence";
    BehaviorType["LATERAL_MOVEMENT"] = "lateral_movement";
})(BehaviorType || (exports.BehaviorType = BehaviorType = {}));
var BehaviorSeverity;
(function (BehaviorSeverity) {
    BehaviorSeverity["CRITICAL"] = "critical";
    BehaviorSeverity["HIGH"] = "high";
    BehaviorSeverity["MEDIUM"] = "medium";
    BehaviorSeverity["LOW"] = "low";
    BehaviorSeverity["INFO"] = "info";
})(BehaviorSeverity || (exports.BehaviorSeverity = BehaviorSeverity = {}));
var RiskSeverity;
(function (RiskSeverity) {
    RiskSeverity["CRITICAL"] = "critical";
    RiskSeverity["HIGH"] = "high";
    RiskSeverity["MEDIUM"] = "medium";
    RiskSeverity["LOW"] = "low";
    RiskSeverity["INFO"] = "info";
})(RiskSeverity || (exports.RiskSeverity = RiskSeverity = {}));
exports.MITRE_TECHNIQUES = {
    'T1059': { id: 'T1059', name: 'Command & Scripting Interpreter', tactic: 'Execution', description: 'Adversaries may abuse command and script interpreters to execute commands' },
    'T1059.001': { id: 'T1059.001', name: 'PowerShell', tactic: 'Execution', description: 'Adversaries may use PowerShell to execute code' },
    'T1059.003': { id: 'T1059.003', name: 'Windows Command Shell', tactic: 'Execution', description: 'Adversaries may abuse the Windows command shell to execute code' },
    'T1486': { id: 'T1486', name: 'Data Encrypted for Impact', tactic: 'Impact', description: 'Adversaries may encrypt data on target systems to interrupt availability' },
    'T1489': { id: 'T1489', name: 'Service Stop', tactic: 'Impact', description: 'Adversaries may stop or disable services to render systems unusable' },
    'T1490': { id: 'T1490', name: 'Inhibit System Recovery', tactic: 'Impact', description: 'Adversaries may delete backups or inhibit recovery' },
    'T1547': { id: 'T1547', name: 'Boot or Logon Autostart Execution', tactic: 'Persistence', description: 'Adversaries may set a program to run at startup' },
    'T1547.001': { id: 'T1547.001', name: 'Registry Run Keys', tactic: 'Persistence', description: 'Adversaries may add program to registry autorun' },
    'T1547.002': { id: 'T1547.002', name: 'Scheduled Task', tactic: 'Persistence', description: 'Adversaries may create scheduled tasks for persistence' },
    'T1021': { id: 'T1021', name: 'Remote Services', tactic: 'Lateral Movement', description: 'Adversaries may use valid accounts to access remote services' },
    'T1021.004': { id: 'T1021.004', name: 'SMB/Windows Admin Shares', tactic: 'Lateral Movement', description: 'Adversaries may use SMB to move laterally' },
    'T1053': { id: 'T1053', name: 'Scheduled Task/Job', tactic: 'Persistence', description: 'Adversaries may schedule tasks for execution' },
    'T1003': { id: 'T1003', name: 'OS Credential Dumping', tactic: 'Credential Access', description: 'Adversaries may attempt to dump credentials' },
    'T1003.001': { id: 'T1003.001', name: 'LSASS Memory', tactic: 'Credential Access', description: 'Adversaries may dump LSASS memory' },
    'T1555': { id: 'T1555', name: 'Credentials from Password Stores', tactic: 'Credential Access', description: 'Adversaries may search compromised systems for credentials' },
    'T1082': { id: 'T1082', name: 'System Information Discovery', tactic: 'Discovery', description: 'Adversaries may gather system information' },
    'T1083': { id: 'T1083', name: 'File and Directory Discovery', tactic: 'Discovery', description: 'Adversaries may enumerate files and directories' },
    'T1041': { id: 'T1041', name: 'Exfiltration Over C2 Channel', tactic: 'Exfiltration', description: 'Adversaries may exfiltrate data over C2 channel' },
    'T1071': { id: 'T1071', name: 'Application Layer Protocol', tactic: 'Command & Control', description: 'Adversaries may communicate using application layer protocols' },
    'T1071.004': { id: 'T1071.004', name: 'DNS', tactic: 'Command & Control', description: 'Adversaries may use DNS for C2' },
    'T1105': { id: 'T1105', name: 'Ingress Tool Transfer', tactic: 'Command & Control', description: 'Adversaries may transfer tools onto victim' },
    'T1567': { id: 'T1567', name: 'Exfiltration Over Web Service', tactic: 'Exfiltration', description: 'Adversaries may exfiltrate data to cloud storage' },
    'T1113': { id: 'T1113', name: 'Screen Capture', tactic: 'Collection', description: 'Adversaries may take screenshots' },
    'T1056': { id: 'T1056', name: 'Input Capture', tactic: 'Collection', description: 'Adversaries may capture user input' },
    'T1056.001': { id: 'T1056.001', name: 'Keylogging', tactic: 'Collection', description: 'Adversaries may log keystrokes' },
    'T1028': { id: 'T1028', name: 'Windows Remote Management', tactic: 'Lateral Movement', description: 'Adversaries may use WinRM for lateral movement' },
    'T1210': { id: 'T1210', name: 'Exploitation of Remote Services', tactic: 'Lateral Movement', description: 'Adversaries may exploit remote services' },
    'T1204': { id: 'T1204', name: 'User Execution', tactic: 'Initial Access', description: 'Adversaries may trick users into executing code' },
    'T1204.002': { id: 'T1204.002', name: 'Malicious File', tactic: 'Initial Access', description: 'Adversaries may execute malicious files' },
    'T1037': { id: 'T1037', name: 'Boot or Logon Initialization Scripts', tactic: 'Persistence', description: 'Adversaries may use initialization scripts' },
    'T1067': { id: 'T1067', name: 'Bootkit', tactic: 'Persistence', description: 'Adversaries may use bootkits' },
    'T1542': { id: 'T1542', name: 'Pre-OS Boot', tactic: 'Persistence', description: 'Adversaries may persist at boot level' },
    'T1055': { id: 'T1055', name: 'Process Injection', tactic: 'Privilege Escalation', description: 'Adversaries may inject code into processes' },
};
var HeuristicCategory;
(function (HeuristicCategory) {
    HeuristicCategory["PROCESS_ANOMALY"] = "process_anomaly";
    HeuristicCategory["FILE_BEHAVIOR"] = "file_behavior";
    HeuristicCategory["NETWORK_PATTERN"] = "network_pattern";
    HeuristicCategory["REGISTRY_PERSISTENCE"] = "registry_persistence";
    HeuristicCategory["EXECUTION_PATTERN"] = "execution_pattern";
    HeuristicCategory["ENCODED_COMMAND"] = "encoded_command";
    HeuristicCategory["LATERAL_MOVEMENT"] = "lateral_movement";
    HeuristicCategory["RECONNAISSANCE"] = "reconnaissance";
})(HeuristicCategory || (exports.HeuristicCategory = HeuristicCategory = {}));
var AnomalyType;
(function (AnomalyType) {
    AnomalyType["BURST_DETECTION"] = "burst_detection";
    AnomalyType["THRESHOLD_EXCEEDED"] = "threshold_exceeded";
    AnomalyType["PROCESS_DEVIATION"] = "process_deviation";
    AnomalyType["NETWORK_SPIKE"] = "network_spike";
    AnomalyType["EXECUTION_FREQUENCY"] = "execution_frequency";
    AnomalyType["FILE_OPERATION_ANOMALY"] = "file_operation_anomaly";
    AnomalyType["RARE_PATTERN"] = "rare_pattern";
})(AnomalyType || (exports.AnomalyType = AnomalyType = {}));
//# sourceMappingURL=threat_models.js.map