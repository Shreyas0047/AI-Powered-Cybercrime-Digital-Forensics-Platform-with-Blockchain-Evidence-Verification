# Blockchain Operations Runbook

## Overview

The Blockchain Operations module provides enterprise-grade Web3 synchronization and distributed forensic verification infrastructure. This runbook covers operational procedures, troubleshooting, and maintenance tasks.

## Components

### 1. Synchronization Service (`synchronization.service.ts`)

Manages evidence registration and verification synchronization with blockchain.

**Key Operations:**
- Queue evidence for blockchain registration
- Process synchronization queue
- Retry failed sync operations
- Validate evidence-chain consistency

**Status Values:**
- `pending` - Waiting to be processed
- `in_progress` - Currently processing
- `completed` - Successfully synced
- `failed` - Failed after max retries
- `retrying` - Retrying after failure

**Queue Management:**
```bash
# Process sync queue
POST /api/v1/blockchain/sync/process

# Retry failed operations
POST /api/v1/blockchain/sync/retry

# Check consistency for specific evidence
GET /api/v1/blockchain/sync/consistency/:evidenceId
```

### 2. Verification Worker Service (`verification-worker.service.ts`)

Handles distributed verification workflows with priority-based job processing.

**Job Types:**
- `single` - Single evidence verification
- `batch` - Batch verification
- `scheduled` - Scheduled verification
- `reconciliation` - Reconciliation verification

**Priority Levels:**
- `critical` - Processed first
- `high` - High priority
- `normal` - Standard priority
- `low` - Processed last

**Job Status:**
- `queued` - Waiting for processing
- `processing` - Currently verifying
- `completed` - Successfully completed
- `failed` - Failed with error

### 3. Reconciliation Service (`reconciliation.service.ts`)

Detects and resolves inconsistencies between database and blockchain records.

**Issue Types:**
- `hash_mismatch` - Hash mismatch between records
- `orphan_record` - Record exists without corresponding record
- `sync_failure` - Synchronization failed
- `transaction_failure` - Blockchain transaction failed
- `drift_detected` - Evidence integrity drift detected

**Severity Levels:**
- `critical` - Immediate attention required
- `high` - High priority issue
- `medium` - Medium priority issue
- `low` - Low priority issue

### 4. State Tracking Service (`state-tracking.service.ts`)

Monitors and tracks blockchain operational state.

**Metrics Tracked:**
- Blockchain connection status
- Verification statistics
- Integrity statistics
- Sync queue health
- Transaction metrics
- Performance metrics

**Health Score (0-100):**
- `healthy` (70-100) - Normal operation
- `degraded` (40-69) - Some issues detected
- `unhealthy` (0-39) - Critical issues detected

## Operational Procedures

### Starting the Blockchain Operations System

The system starts automatically with the backend server. No manual intervention required.

### Monitoring Blockchain Health

```bash
# Get overall health metrics
GET /api/v1/blockchain/state/health

# Get performance metrics
GET /api/v1/blockchain/state/metrics

# Get current state snapshot
GET /api/v1/blockchain/state
```

### Processing Sync Queue

```bash
# Check queue status
GET /api/v1/blockchain/sync/status

# Manually process queue (if automatic processing is delayed)
POST /api/v1/blockchain/sync/process
```

### Running Reconciliation

```bash
# Run full reconciliation
POST /api/v1/blockchain/reconciliation/run

# Check for specific issues
GET /api/v1/blockchain/reconciliation/issues?severity=critical

# Resolve an issue
POST /api/v1/blockchain/reconciliation/issues/:issueId/resolve
```

### Creating Verification Jobs

```bash
# Create a batch verification job
POST /api/v1/blockchain/worker/job
{
  "type": "batch",
  "evidenceIds": ["id1", "id2", "id3"],
  "priority": "normal"
}

# Check job status
GET /api/v1/blockchain/worker/job/:jobId

# Cancel a job
POST /api/v1/blockchain/worker/job/:jobId/cancel
```

## Troubleshooting

### Issue: Sync Queue Backlog

**Symptoms:**
- `pendingOperations` count continuously growing
- `syncHealth` shows `unhealthy`

**Resolution:**
1. Check blockchain connectivity: `GET /api/v1/blockchain/state/health`
2. Process queue manually: `POST /api/v1/blockchain/sync/process`
3. Retry failed operations: `POST /api/v1/blockchain/sync/retry`
4. If still failing, check blockchain RPC configuration

### Issue: High Verification Failure Rate

**Symptoms:**
- `verificationSuccessRate` below 80%
- Many `hash_mismatch` reconciliation issues

**Resolution:**
1. Run reconciliation: `POST /api/v1/blockchain/reconciliation/run`
2. Check for evidence tampering
3. Verify source evidence files are unchanged
4. Check database integrity

### Issue: Worker Queue Full

**Symptoms:**
- New jobs rejected with "queue is full" error

**Resolution:**
1. Check worker status: `GET /api/v1/blockchain/worker/status`
2. Cancel old/completed jobs: `POST /api/v1/blockchain/worker/job/:jobId/cancel`
3. Wait for queue to process

### Issue: Blockchain Unavailable

**Symptoms:**
- `blockchainConnection: false` in health metrics
- Transactions failing

**Resolution:**
1. Check RPC URL configuration in `blockchain.config.ts`
2. Verify network connectivity
3. System runs in offline mode if blockchain unavailable
4. Evidence verification continues locally

## Health Indicators

### Green (Healthy)
- Health score: 70-100
- Blockchain connected
- Verification success rate: >80%
- Sync queue: Normal
- Data integrity: >90%

### Yellow (Degraded)
- Health score: 40-69
- Some sync failures
- Verification success rate: 60-80%
- Minor reconciliation issues

### Red (Unhealthy)
- Health score: 0-39
- Blockchain disconnected or high failures
- Verification success rate: <60%
- Critical reconciliation issues
- Evidence integrity compromised

## API Endpoints Summary

### Synchronization
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/blockchain/sync/status` | Get sync status |
| POST | `/blockchain/sync/queue` | Queue evidence |
| POST | `/blockchain/sync/process` | Process queue |
| POST | `/blockchain/sync/retry` | Retry failed |
| GET | `/blockchain/sync/consistency/:id` | Check consistency |

### Verification Worker
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/blockchain/worker/status` | Get worker status |
| POST | `/blockchain/worker/job` | Create job |
| GET | `/blockchain/worker/job/:id` | Get job status |
| POST | `/blockchain/worker/job/:id/cancel` | Cancel job |

### Reconciliation
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/blockchain/reconciliation/run` | Run reconciliation |
| GET | `/blockchain/reconciliation/issues` | Get issues |
| POST | `/blockchain/reconciliation/issues/:id/resolve` | Resolve issue |
| GET | `/blockchain/reconciliation/stats` | Get stats |

### State Tracking
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/blockchain/state` | Get state |
| GET | `/blockchain/state/health` | Get health |
| GET | `/blockchain/state/metrics` | Get metrics |
| GET | `/blockchain/state/operations` | Get operations |

## Performance Considerations

- Sync queue processes every 5 seconds automatically
- Verification worker handles up to 5 concurrent jobs
- Queue size limited to 1000 items
- Operation history limited to 1000 entries

## Security Notes

- All endpoints require authentication
- Admin role required for reconciliation and queue processing
- Analyst role required for verification operations
- Audit logging for all blockchain operations