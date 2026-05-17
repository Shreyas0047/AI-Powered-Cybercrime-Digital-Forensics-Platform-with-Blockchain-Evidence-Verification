# Forensic Analytics Runbook

## Overview

The Forensic Analytics module provides enterprise-grade behavioral intelligence, anomaly detection, and investigation correlation capabilities. This runbook covers operational procedures and best practices.

## Components

### 1. Behavioral Analytics Engine

Analyzes suspicious behavior patterns and process execution.

**Supported Behavioral Categories:**
- `process_execution` - Process behavior analysis
- `registry_activity` - Registry modification tracking
- `filesystem_behavior` - File system operations
- `network_activity` - Network communication patterns
- `persistence_mechanism` - Persistence indicators
- `privilege_escalation` - Privilege escalation attempts
- `lateral_movement` - Lateral movement detection
- `data_exfiltration` - Data exfiltration patterns
- `command_execution` - Command execution tracking
- `suspicious_download` - Suspicious download detection

**Pre-defined Behavioral Patterns:**
1. Registry Run Key Persistence - Suspicious autorun modifications
2. Process Injection - Process injection detection
3. Encoded Command Execution - Obfuscated command detection
4. Suspicious Network Behavior - Unusual network patterns
5. Large Data Transfer - Data exfiltration detection
6. Suspicious File Operation - Anomalous file modifications

### 2. Anomaly Detection

Identifies unusual forensic activity based on behavioral baselines.

**Anomaly Severity Levels:**
- `critical` - Immediate investigation required
- `high` - High priority anomaly
- `medium` - Medium priority anomaly
- `low` - Low priority anomaly
- `info` - Informational

**Anomaly Status:**
- `new` - Newly detected
- `investigating` - Under investigation
- `confirmed` - Confirmed suspicious
- `false_positive` - Marked as false positive
- `mitigated` - Anomaly mitigated

### 3. Investigation Correlation Engine

Links related investigations through shared indicators.

**Correlation Methods:**
- **IOC-based** - Shared IOCs between investigations
- **Evidence-based** - Shared evidence hashes
- **Temporal** - Overlapping time ranges
- **Pattern-based** - Similar behavioral patterns
- **Telemetry** - Related telemetry signatures

**Relationship Scoring:**
- Evidence overlap (up to 40 points)
- IOC overlap (up to 30 points)
- Temporal proximity (up to 25 points)
- Analyst notes correlation (up to 5 points)

### 4. MITRE ATT&CK Mapping

Educational classification system for suspicious behaviors.

**Supported Tactics:**
- Reconnaissance
- Resource Development
- Initial Access
- Execution
- Persistence
- Privilege Escalation
- Defense Evasion
- Credential Access
- Discovery
- Lateral Movement
- Collection
- Command and Control
- Exfiltration
- Impact

## Operational Procedures

### Analyzing Process Behavior

```bash
# Analyze behavioral patterns for evidence
POST /api/v1/analytics/analyze-behavior
{
  "evidenceId": "evidence_id_here"
}
```

### Detecting Anomalies

```bash
# Detect anomalies in evidence
POST /api/v1/analytics/detect-anomalies
{
  "evidenceId": "evidence_id_here"
}
```

### Getting Behavioral Patterns

```bash
# Get all behavioral patterns
GET /api/v1/analytics/patterns
```

### Analyzing Baseline

```bash
# Analyze behavioral baseline for investigation
POST /api/v1/analytics/baseline
{
  "investigationId": "investigation_id_here"
}
```

## Investigation Correlation

### Getting Investigation Clusters

```bash
# Get all investigation clusters
GET /api/v1/analytics/clusters
```

### Getting Relationships

```bash
# Get relationships for specific investigation
GET /api/v1/analytics/clusters/:investigationId/relationships
```

### Scoring Relationship

```bash
# Score relationship between investigations
POST /api/v1/analytics/clusters/:investigationId/score
{
  "targetInvestigationId": "target_investigation_id"
}
```

### Getting Correlation Insights

```bash
# Get all correlation insights
GET /api/v1/analytics/insights

# Get insights for specific investigation
GET /api/v1/analytics/insights?investigationId=:id
```

### Getting Cluster Visualization

```bash
# Get visualization data for clusters
GET /api/v1/analytics/cluster-visualization
```

## Dashboard Analytics

### Getting Dashboard Data

```bash
# Get full analytics dashboard
GET /api/v1/analytics/dashboard
```

Returns:
- Summary statistics
- Top investigation clusters
- High severity insights
- Behavioral pattern coverage
- MITRE ATT&CK tactics

## Threat Scoring

Threat scores are calculated based on multiple factors:

1. **Behavioral Patterns (Variable)**
   - Each pattern has severity weight 0-100
   - Higher weight = higher threat

2. **Anomaly Confidence (0-100)**
   - Based on detection reliability
   - Higher confidence = higher score

3. **Investigation Correlation (0-100)**
   - Based on shared indicators
   - More shared = higher score

4. **Evidence Integrity (Fixed)**
   - Hash mismatch: 90 points
   - Integrity verified: 0 points

## Troubleshooting

### Issue: No Anomalies Detected

**Possible Causes:**
- Evidence has no behavioral indicators
- Pattern database not populated
- Evidence is clean

**Resolution:**
1. Verify evidence has telemetry data
2. Check pattern matching rules
3. Review evidence metadata

### Issue: Low Correlation Scores

**Possible Causes:**
- Investigations are unrelated
- Insufficient shared indicators
- Different time periods

**Resolution:**
1. Review shared IOCs and evidence
2. Check temporal overlap
3. Verify investigation metadata

### Issue: Missing Behavioral Patterns

**Possible Causes:**
- Telemetry not linked to evidence
- Missing telemetry events
- Pattern rules not matching

**Resolution:**
1. Verify telemetry integration
2. Check telemetry event types
3. Review pattern detection rules

## Dashboard Visualization

### Overview Tab
- Total investigation clusters
- High severity insights count
- Total behavioral patterns
- Critical patterns count

### Patterns Tab
- All behavioral patterns with MITRE mapping
- Pattern severity indicators
- Category classification
- Detection rules

### Clusters Tab
- Investigation cluster list
- Correlation strength
- Shared indicators
- Linked investigations

### Anomalies Tab
- Detected anomalies
- Threat scores
- Confidence levels
- MITRE tactic mapping

## API Endpoints Summary

### Behavioral Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/analytics/patterns` | Get behavioral patterns |
| POST | `/analytics/analyze-behavior` | Analyze process behavior |
| POST | `/analytics/detect-anomalies` | Detect anomalies |
| POST | `/analytics/baseline` | Analyze baseline |

### Investigation Correlation
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/analytics/clusters` | Get investigation clusters |
| GET | `/analytics/clusters/:id/relationships` | Get relationships |
| POST | `/analytics/clusters/:id/score` | Score relationship |
| GET | `/analytics/insights` | Get correlation insights |
| GET | `/analytics/cluster-visualization` | Get visualization data |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/analytics/dashboard` | Get dashboard data |

## Security Considerations

- All endpoints require authentication
- Admin/Analyst role required for analysis operations
- Analyst role required for investigation correlation
- All operations are audit logged
- RBAC protection on all endpoints

## Performance Notes

- Pattern matching uses indexed fields
- Correlation analysis limited to recent investigations
- Cluster visualization limited to top 10 clusters
- Anomaly detection processes in batches
- Baseline analysis uses time-window filtering

## Future Enhancements

- Machine learning-based anomaly detection
- Predictive investigation clustering
- Automated behavioral baseline learning
- Real-time pattern evolution
- Cross-organization threat sharing