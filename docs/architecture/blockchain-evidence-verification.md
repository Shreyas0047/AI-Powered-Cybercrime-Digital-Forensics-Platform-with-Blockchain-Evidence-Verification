# Blockchain Evidence Verification

## Overview

The blockchain evidence verification module provides immutable, tamper-evident forensic evidence integrity validation through SHA-256 hashing and blockchain-ready audit trails.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Blockchain Module                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐     │
│  │   Config    │  │   Types      │  │   Models           │     │
│  │   Service   │  │   & Enums    │  │   (MongoDB)        │     │
│  └─────────────┘  └──────────────┘  └────────────────────┘     │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐     │
│  │  Blockchain │  │    Hashing   │  │  Verification      │     │
│  │  Service    │  │    Service   │  │  Service           │     │
│  │  (Web3)     │  │  (SHA-256)   │  │  (Integrity)       │     │
│  └─────────────┘  └──────────────┘  └────────────────────┘     │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐     │
│  │  Orchestrator│ │  Controller  │  │   Routes           │     │
│  └─────────────┘  └──────────────┘  └────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### 1. Configuration (`config.ts`)

Blockchain connection and verification settings:

```typescript
{
  blockchain: {
    enabled: boolean,
    network: 'mainnet' | 'testnet' | 'sepolia' | 'local',
    rpcUrl: string,
    contractAddress: string,
    chainId: number,
    explorerUrl: string
  },
  verification: {
    hashAlgorithm: 'sha256' | 'sha3-256',
    verificationBatchSize: number,
    autoVerifyOnUpload: boolean,
    storeHashesOnChain: boolean
  }
}
```

### 2. Core Services

#### BlockchainService
- Web3 provider management (ethers.js)
- RPC communication
- Transaction handling
- Network status checking
- Offline mode support

#### EvidenceHashingService
- SHA-256 file fingerprinting
- Data hashing
- Hash chaining for evidence lineage
- Merkle root generation for packages
- Hash caching for performance

#### VerificationService
- Evidence integrity verification
- Tamper detection
- Verification history tracking
- Audit log management

#### BlockchainVerificationService (Orchestrator)
- Coordinates all blockchain operations
- MongoDB model management
- Batch verification
- Audit trail generation

### 3. Data Models

#### BlockchainVerification
Stores blockchain verification records:
- `evidenceId` - Reference to evidence
- `fingerprint` - SHA-256 hash
- `transactionHash` - On-chain transaction (when available)
- `blockNumber` - Blockchain block number
- `status` - Verification status enum

#### EvidenceIntegrity
Tracks evidence integrity state:
- `evidenceId` - Reference to evidence
- `currentHash` / `previousHash` - Hash chain
- `integrityState` - Current state enum
- `verificationHistory` - Array of verification records
- `tamperAlerts` - Detected modifications

#### BlockchainAudit
Immutable audit log:
- `eventType` - Type of blockchain event
- `evidenceId` - Related evidence
- `transactionHash` - Blockchain transaction
- `timestamp` - Event timestamp
- `performedBy` - User who performed action

#### EvidencePackageHash
Merkle tree-based package verification:
- `packageId` - Unique package identifier
- `rootHash` - Merkle root hash
- `evidenceHashes` - Individual evidence hashes
- `manifestHash` - Package manifest hash

## API Endpoints

### Status & Statistics
- `GET /api/v1/blockchain/status` - Blockchain connection status
- `GET /api/v1/blockchain/verification/stats` - Verification statistics

### Evidence Verification
- `POST /api/v1/blockchain/evidence/register` - Register evidence
- `POST /api/v1/blockchain/evidence/verify` - Verify single evidence
- `POST /api/v1/blockchain/evidence/batch-verify` - Batch verification

### Package Operations
- `POST /api/v1/blockchain/package/create` - Create evidence package
- `POST /api/v1/blockchain/package/verify` - Verify package

### Audit & Alerts
- `GET /api/v1/blockchain/audit` - Get audit log
- `GET /api/v1/blockchain/alerts` - Get tamper alerts
- `POST /api/v1/blockchain/alerts/:evidenceId/:alertId/acknowledge` - Acknowledge alert

### Hash Operations
- `POST /api/v1/blockchain/hash/generate` - Generate hash from data
- `POST /api/v1/blockchain/hash/verify` - Verify file hash

## Verification Workflow

```
┌──────────────────────────────────────────────────────┐
│ 1. Evidence Registered                               │
│    - SHA-256 fingerprint generated                   │
│    - BlockchainVerification record created            │
│    - EvidenceIntegrity record initialized            │
│    - Audit entry: EVIDENCE_REGISTERED                │
└──────────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────┐
│ 2. Verification Request                             │
│    - Current file hash computed                      │
│    - Compared against stored fingerprint             │
│    - Status determined (verified/modified/failed)    │
└──────────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────┐
│ 3. Verification Result                              │
│    - Verification record stored                     │
│    - Integrity record updated                        │
│    - Tamper alert created if mismatch               │
│    - Audit entry: EVIDENCE_VERIFIED/HASH_MISMATCH   │
└──────────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────┐
│ 4. Blockchain Preparation (Optional)                 │
│    - Transaction data prepared                       │
│    - Ready for on-chain submission                   │
│    - Audit entry: EVIDENCE_REGISTERED (chain)      │
└──────────────────────────────────────────────────────┘
```

## Hash Generation

### File Fingerprint
```typescript
sha256(fileContent) → 64-char hex string
```

### Chained Fingerprint
```typescript
chainHash = sha256(previousFingerprint + ":" + currentHash)
```

### Package Merkle Root
```typescript
1. Generate hashes for all files
2. Sort hashes alphabetically
3. Pair and hash recursively
4. Continue until single root hash
```

## Integrity States

| State | Description | Severity |
|-------|-------------|----------|
| `INTACT` | Hash matches, evidence unmodified | - |
| `MODIFIED` | Hash mismatch detected | Critical |
| `UNKNOWN` | No verification performed | - |
| `VERIFICATION_FAILED` | Unable to verify | High |

## Environment Variables

```
BLOCKCHAIN_ENABLED=true
BLOCKCHAIN_NETWORK=sepolia
BLOCKCHAIN_RPC_URL=https://sepolia.infura.io/v3/your-project-id
BLOCKCHAIN_CONTRACT_ADDRESS=0x...
BLOCKCHAIN_CHAIN_ID=11155111
BLOCKCHAIN_EXPLORER_URL=https://sepolia.etherscan.io
AUTO_VERIFY_ON_UPLOAD=false
STORE_HASHES_ON_CHAIN=false
```

## Frontend Integration

### Store Usage
```typescript
import { useBlockchainStore } from '../stores/blockchainStore';

// Fetch status and stats
await useBlockchainStore.getState().fetchStatus();
await useBlockchainStore.getState().fetchStats();

// Verify evidence
const result = await useBlockchainStore.getState().verifyEvidence(evidenceId, filePath);

// Batch verify
const batchResult = await useBlockchainStore.getState().batchVerify([
  { evidenceId: '1', filePath: '/path/1' },
  { evidenceId: '2', filePath: '/path/2' }
]);

// Handle tamper alerts
await useBlockchainStore.getState().fetchTamperAlerts(true);
await useBlockchainStore.getState().acknowledgeAlert(evidenceId, alertId, 'notes');
```

### Components
- `IntegrityIndicator` - Visual integrity state indicator
- `VerificationStatusBadge` - Status badge component
- `VerificationPanel` - Evidence verification panel
- `VerificationStatsPanel` - Statistics dashboard
- `BlockchainAuditPanel` - Audit log viewer
- `TamperAlertsPanel` - Tamper alert management

## Security Considerations

1. **Offline Mode** - System operates without blockchain when unavailable
2. **Local Verification First** - Always verifies locally before blockchain
3. **Hash Validation** - Validates hash format before processing
4. **Audit Immutability** - Audit entries are append-only
5. **Tamper Detection** - Immediate alert on hash mismatch
6. **No Autonomous Enforcement** - Manual acknowledgment required for alerts