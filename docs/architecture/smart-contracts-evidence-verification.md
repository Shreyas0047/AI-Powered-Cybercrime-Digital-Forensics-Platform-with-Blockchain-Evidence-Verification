# Smart Contracts & Immutable Evidence Verification

## Overview

This document describes the smart contract infrastructure for immutable forensic evidence verification on the blockchain.

## Smart Contracts

### 1. ForensicsEvidence.sol

**Purpose:** Immutable evidence registration and verification

**Features:**
- Register evidence with SHA-256 hashes
- Verify evidence integrity
- Track verification history
- Batch evidence registration
- Investigation linking

**Solidity Version:** ^0.8.19

**Network:** Ethereum Sepolia Testnet

**Contract Functions:**

```solidity
// Register new evidence
function registerEvidence(
    string memory _evidenceId,
    bytes32 _evidenceHash,
    string memory _investigationId,
    bytes memory _metadata
) public returns (bool success)

// Verify evidence integrity
function verifyEvidence(
    string memory _evidenceId,
    bytes32 _hashToVerify
) public returns (bool result, VerificationStatus status)

// Get evidence record
function getEvidence(string memory _evidenceId)
    public view returns (EvidenceRecord memory record)

// Get verification history
function getVerificationHistory(string memory _evidenceId)
    public view returns (VerificationEvent[] memory events)
```

**Events Emitted:**
- `EvidenceRegistered` - When new evidence is registered
- `EvidenceVerified` - When verification succeeds
- `VerificationFailed` - When hash mismatch detected (tamper alert)
- `EvidenceStatusUpdated` - When status changes

### 2. ForensicsAudit.sol

**Purpose:** Immutable audit trail for forensic operations

**Features:**
- Record all forensic operations
- Category-based event tracking
- Investigation and evidence linking
- Event integrity verification
- Audit statistics

**Contract Functions:**

```solidity
// Create audit entry
function createAuditEntry(
    AuditCategory _category,
    AuditSeverity _severity,
    string memory _description,
    string memory _investigationId,
    string memory _evidenceId,
    bytes memory _metadata
) public returns (uint256 entryIndex)

// Record verification result
function recordVerificationResult(
    string memory _evidenceId,
    string memory _investigationId,
    bool _success,
    bytes32 _expectedHash,
    bytes32 _actualHash
) public returns (uint256 entryIndex)

// Record tamper detection
function recordTamperDetection(
    string memory _evidenceId,
    string memory _investigationId,
    bytes32 _expectedHash,
    bytes32 _actualHash
) public returns (uint256 entryIndex)

// Get evidence audit
function getEvidenceAudit(string memory _evidenceId)
    public view returns (AuditEntry[] memory entries)
```

## Backend Services

### Smart Contract Service (`smart-contract.service.ts`)

Provides Web3 integration with smart contracts:

```typescript
// Register evidence on blockchain
await smartContractService.registerEvidence(
  evidenceId: string,
  evidenceHash: string,
  investigationId: string,
  metadata?: string
)

// Verify evidence on blockchain
await smartContractService.verifyEvidence(
  evidenceId: string,
  hashToVerify: string
)

// Get evidence from blockchain
await smartContractService.getEvidence(evidenceId: string)

// Record audit entry
await smartContractService.recordAuditEntry(params)
```

### Transaction Service (`transaction.service.ts`)

Manages blockchain transaction workflows:

```typescript
// Register with transaction tracking
const result = await transactionService.registerEvidenceTransaction(
  evidenceId,
  evidenceHash,
  investigationId
)

// Verify with transaction tracking
const result = await transactionService.verifyEvidenceTransaction(
  evidenceId,
  hashToVerify
)

// Get transaction statistics
const stats = transactionService.getTransactionStats()
```

## API Endpoints

### Smart Contract Operations
- `POST /api/v1/blockchain/contract/register` - Register on blockchain
- `POST /api/v1/blockchain/contract/verify` - Verify on blockchain
- `GET /api/v1/blockchain/contract/evidence/:evidenceId` - Get from chain
- `GET /api/v1/blockchain/contract/exists/:evidenceId` - Check existence

### Transaction Management
- `GET /api/v1/blockchain/transactions` - Transaction history
- `GET /api/v1/blockchain/transactions/stats` - Transaction statistics
- `POST /api/v1/blockchain/transactions/:txId/retry` - Retry failed transaction

### Audit Operations
- `POST /api/v1/blockchain/audit/record` - Record audit entry
- `GET /api/v1/blockchain/audit/evidence/:evidenceId` - Get audit trail

### Tamper Detection
- `POST /api/v1/blockchain/tamper/record` - Record tamper detection

## Verification Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Local Verification                                          │
│    - Compute SHA-256 hash of file                              │
│    - Compare with stored hash                                  │
│    - Determine local integrity state                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Blockchain Registration (Optional)                          │
│    - Send registerEvidence transaction                         │
│    - Wait for confirmations                                    │
│    - Store transaction hash                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Verification Request                                        │
│    - Send verifyEvidence transaction                           │
│    - Compare hashes on-chain                                    │
│    - Emit verification event                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Audit Recording                                             │
│    - Record verification result                                │
│    - Create tamper detection event if mismatch                │
│    - Update evidence status                                    │
└─────────────────────────────────────────────────────────────────┘
```

## Transaction States

| State | Description |
|-------|-------------|
| `PENDING` | Transaction submitted, waiting for inclusion |
| `CONFIRMING` | Transaction included, awaiting confirmations |
| `CONFIRMED` | Transaction confirmed on blockchain |
| `FAILED` | Transaction failed |
| `RETRYING` | Retrying failed transaction |

## Security Considerations

1. **Offline Mode** - System works without blockchain when unavailable
2. **Duplicate Prevention** - Evidence ID uniqueness enforced
3. **Audit Immutability** - All events recorded immutably
4. **No Autonomous Enforcement** - Manual acknowledgment required
5. **Educational Testnet** - Sepolia testnet only, no production use

## Deployment

### Prerequisites
- Node.js 18+
- ethers.js v6
- Infura/Alchemy API key for Sepolia

### Environment Variables
```
BLOCKCHAIN_ENABLED=true
BLOCKCHAIN_NETWORK=sepolia
BLOCKCHAIN_RPC_URL=https://sepolia.infura.io/v3/YOUR-PROJECT-ID
BLOCKCHAIN_CONTRACT_ADDRESS=0x...
BLOCKCHAIN_CHAIN_ID=11155111
BLOCKCHAIN_EXPLORER_URL=https://sepolia.etherscan.io
```

### Contract Deployment
1. Compile contracts with Hardhat/Truffle
2. Deploy to Sepolia testnet
3. Update contract address in environment
4. Configure API to use contract addresses