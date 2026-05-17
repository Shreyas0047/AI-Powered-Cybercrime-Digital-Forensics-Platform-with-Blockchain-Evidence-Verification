# Threat Intelligence Runbook

## Overview

The Threat Intelligence module provides enterprise-grade IOC (Indicators of Compromise) management, threat correlation, and investigation enrichment. This runbook covers operational procedures, workflows, and best practices.

## Components

### 1. IOC Management System

Manages Indicators of Compromise for forensic analysis.

**Supported IOC Types:**
- `ip_address` - Suspicious IP addresses
- `domain` - Malicious domains
- `url` - Suspicious URLs
- `file_hash` - SHA-256 file hashes
- `process_name` - Suspicious process names
- `registry_key` - Registry indicators
- `file_path` - File path indicators
- `command_line` - Command line patterns
- `email` - Email addresses
- `mutex` - Mutex indicators
- `yara_rule` - YARA rules
- `behavioral` - Behavioral signatures

**Severity Levels:**
- `critical` - Immediate action required
- `high` - High priority
- `medium` - Medium priority
- `low` - Low priority
- `info` - Informational

**Status Values:**
- `active` - Active threat indicator
- `inactive` - Inactive indicator
- `obsolete` - Obsolete indicator
- `false_positive` - Marked as false positive

### 2. Threat Correlation Engine

Links related forensic entities and identifies attack patterns.

**Correlation Types:**
- `ioc_match` - IOC matched against evidence
- `behavioral_pattern` - Similar behavioral patterns
- `telemetry_similarity` - Related telemetry
- `investigation_link` - Linked investigations
- `time_correlation` - Time-based correlation

**Correlation Strength (0-100):**
- 80-100: Strong correlation
- 60-79: High correlation
- 40-59: Moderate correlation
- 0-39: Low correlation

### 3. Threat Enrichment

Enriches investigations with threat intelligence.

**Enrichment Types:**
- `ioc_lookup` - IOC matching
- `behavioral_analysis` - Behavioral pattern analysis
- `historical_correlation` - Historical investigation correlation
- `threat_actor_mapping` - Threat actor identification
- `geolocation` - IP geolocation
- `reputation_check` - Reputation scoring

### 4. MITRE ATT&CK Mapping

Educational classification of suspicious behaviors.

**Supported Tactics:**
- reconnaissance - Reconnaissance activities
- resource_development - Resource development
- initial_access - Initial access vectors
- execution - Execution patterns
- persistence - Persistence mechanisms
- privilege_escalation - Privilege escalation
- defense_evasion - Defense evasion
- credential_access - Credential access
- discovery - Discovery activities
- lateral_movement - Lateral movement
- collection - Data collection
- command_and_control - C2 communications
- exfiltration - Data exfiltration
- impact - Impact activities

## Operational Procedures

### Creating an IOC

```bash
# Create a new IOC
POST /api/v1/threat/ioc
{
  "type": "ip_address",
  "value": "192.168.1.100",
  "severity": "high",
  "category": "command_control",
  "description": "Suspicious C2 IP address",
  "source": "manual",
  "confidence": 75,
  "mitreTactics": ["command_and_control"],
  "tags": ["c2", "suspicious"]
}
```

### Searching IOCs

```bash
# Search by type and severity
GET /api/v1/threat/iocs?type=file_hash&severity=critical&limit=50

# Search by keyword
GET /api/v1/threat/iocs?search=malware&category=threat

# Search by tags
GET /api/v1/threat/iocs?tags=c2,suspicious
```

### Matching IOCs Against Evidence

```bash
# Match evidence hashes against IOC database
POST /api/v1/threat/ioc/match
{
  "evidenceHashes": [
    "a1b2c3d4e5f6...",
    "1234567890ab..."
  ]
}
```

### Correlating Evidence

```bash
# Get correlations for evidence
GET /api/v1/threat/correlation/:evidenceId

# Create manual correlation
POST /api/v1/threat/correlation
{
  "correlationType": "behavioral_pattern",
  "entities": [
    { "entityType": "evidence", "entityId": "abc123", "entityValue": "suspicious.exe" },
    { "entityType": "ioc", "entityId": "IOC-HASH-123", "entityValue": "known_malware_hash" }
  ],
  "strength": 85,
  "description": "Behavioral match with known malware",
  "clusterLabel": "emotet_campaign"
}
```

### Enriching Investigations

```bash
# Enrich investigation with threat intelligence
POST /api/v1/threat/enrich/:investigationId
```

### Generating Analytics

```bash
# IOC trends over time
GET /api/v1/threat/analytics/ioc_trends?startDate=2024-01-01&endDate=2024-12-31

# Severity distribution
GET /api/v1/threat/analytics/severity_distribution?startDate=2024-01-01&endDate=2024-12-31

# Type distribution
GET /api/v1/threat/analytics/type_distribution?startDate=2024-01-01&endDate=2024-12-31

# Threat heatmap
GET /api/v1/threat/analytics/threat_heatmap?startDate=2024-01-01&endDate=2024-12-31
```

### Getting Threat Graph

```bash
# Get all correlations
GET /api/v1/threat/graph

# Get correlations for specific investigation
GET /api/v1/threat/graph?investigationId=:id
```

## Threat Scoring

Threat scores are calculated based on:

1. **Severity (40% max)**
   - Critical: 40 points
   - High: 30 points
   - Medium: 20 points
   - Low: 10 points
   - Info: 5 points

2. **Confidence (30% max)**
   - Score × 0.3 (0-100 scale)

3. **MITRE Tactics (10% max)**
   - 5 points per tactic mapped

**Total Score: 0-100**

## Troubleshooting

### Issue: No IOC Matches Found

**Possible Causes:**
- IOCs are marked as inactive
- Evidence hashes not in database
- Wrong IOC type specified

**Resolution:**
1. Check IOC status: `GET /api/v1/threat/ioc/:iocId`
2. Verify evidence hashes are correct
3. Check IOC type matches expected type

### Issue: Correlation Strength is Low

**Possible Causes:**
- Entities have weak relationship
- Insufficient metadata
- Different time ranges

**Resolution:**
1. Review correlation entity types
2. Add more relationship context
3. Increase metadata for entities

### Issue: Enrichment Returns Empty Results

**Possible Causes:**
- No evidence in investigation
- Evidence hashes don't match IOCs
- Investigation doesn't exist

**Resolution:**
1. Verify investigation has evidence
2. Check evidence has fingerprints
3. Verify investigation ID is correct

## Dashboard Visualization

### Overview Tab
- Total IOC count
- Severity distribution (critical, high, medium, low)
- IOC distribution by type
- Recent IOC activity timeline

### IOCs Tab
- Searchable IOC table
- Filter by type, severity, category
- Threat score visualization
- Bulk actions

### Correlations Tab
- Threat relationship graph
- Entity connections
- Cluster identification
- Correlation strength indicators

## API Endpoints Summary

### IOC Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/threat/ioc` | Create IOC |
| GET | `/threat/ioc/:iocId` | Get IOC |
| GET | `/threat/iocs` | Search IOCs |
| PATCH | `/threat/ioc/:iocId/status` | Update IOC status |
| POST | `/threat/ioc/link` | Link IOC to evidence |
| POST | `/threat/ioc/match` | Match IOCs |

### Correlation
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/threat/correlation/:evidenceId` | Get correlations |
| POST | `/threat/correlation` | Create correlation |

### Enrichment & Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/threat/enrich/:investigationId` | Enrich investigation |
| GET | `/threat/analytics/:type` | Generate analytics |
| GET | `/threat/stats` | Get IOC statistics |
| GET | `/threat/graph` | Get threat graph |

## Security Considerations

- All endpoints require authentication
- Admin role required for status updates
- Analyst role required for IOC creation
- All operations are audit logged
- RBAC protection on all endpoints

## Performance Notes

- IOC search uses indexed fields for fast queries
- Graph visualization limited to 100 IOCs and 50 correlations
- Analytics queries use time-range filtering for efficiency
- Correlation engine processes entities in batches

## Future Enhancements

- External threat intelligence feeds integration
- Machine learning-based anomaly detection
- Automated threat actor attribution
- Real-time threat hunting workflows
- Cross-platform threat sharing