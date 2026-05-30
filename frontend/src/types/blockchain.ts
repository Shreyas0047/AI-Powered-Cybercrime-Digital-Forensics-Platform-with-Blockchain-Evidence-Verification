/**
 * Blockchain Types - Frontend TypeScript definitions
 */

export enum VerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  FAILED = 'failed',
  MODIFIED = 'modified',
  ON_CHAIN = 'on_chain',
  SYNCING = 'syncing',
}

export enum EvidenceIntegrityState {
  INTACT = 'intact',
  MODIFIED = 'modified',
  UNKNOWN = 'unknown',
  VERIFICATION_FAILED = 'verification_failed',
}

export enum BlockchainEventType {
  EVIDENCE_REGISTERED = 'evidence_registered',
  EVIDENCE_VERIFIED = 'evidence_verified',
  VERIFICATION_FAILED = 'verification_failed',
  HASH_MISMATCH = 'hash_mismatch',
  TAMPER_DETECTED = 'tamper_detected',
  CHAIN_SYNC_COMPLETE = 'chain_sync_complete',
}

export interface BlockchainStatus {
  available: boolean;
  networkName: string;
  chainId: number;
  blockNumber: number;
}

export interface VerificationStats {
  totalEvidence: number;
  verified: number;
  modified: number;
  pending: number;
  blockchainOnChain: number;
  tamperAlerts: number;
}

export interface BlockchainVerification {
  id: string;
  evidenceId: string;
  fingerprint: string;
  algorithm: 'sha256' | 'sha3-256';
  transactionHash?: string;
  blockNumber?: number;
  status: VerificationStatus;
  verificationResult: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
}

export interface EvidenceIntegrityRecord {
  id: string;
  evidenceId: string;
  currentHash: string;
  previousHash?: string;
  integrityState: EvidenceIntegrityState;
  lastVerifiedAt?: string;
  lastVerificationStatus?: VerificationStatus;
  verificationHistory: VerificationRecord[];
  tamperAlerts: TamperAlert[];
  blockchainVerified: boolean;
  blockchainTxHash?: string;
}

export interface VerificationRecord {
  id: string;
  timestamp: string;
  hash: string;
  status: VerificationStatus;
  method: 'local' | 'blockchain' | 'both';
  verifiedBy: string;
  details?: string;
}

export interface TamperAlert {
  id: string;
  timestamp: string;
  evidenceId: string;
  detectedAt: string;
  expectedHash: string;
  actualHash: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  notes?: string;
  /** Backend-emitted alert classification (e.g. HASH_MISMATCH, MISSING). */
  type?: string;
  /** Optional human-readable description. */
  description?: string;
}

export interface BlockchainAuditEntry {
  id: string;
  timestamp: string;
  eventType: BlockchainEventType;
  evidenceId?: string;
  transactionHash?: string;
  blockNumber?: number;
  details: string;
  performedBy: string;
  metadata?: Record<string, unknown>;
}

export interface EvidencePackageHash {
  id: string;
  packageId: string;
  investigationId: string;
  rootHash: string;
  evidenceHashes: EvidenceHashItem[];
  manifestHash: string;
  evidenceCount: number;
  createdAt: string;
  createdBy: string;
  verificationCount: number;
  lastVerifiedAt?: string;
  lastVerificationStatus?: VerificationStatus;
  blockchainRegistered: boolean;
  transactionHash?: string;
  blockNumber?: number;
}

export interface EvidenceHashItem {
  evidenceId: string;
  hash: string;
  fileName: string;
}

export interface VerificationResult {
  verified: boolean;
  currentHash: string;
  status: VerificationStatus;
  integrityState: EvidenceIntegrityState;
}

export interface BatchVerificationResult {
  total: number;
  verified: number;
  modified: number;
  failed: number;
  results: Array<{
    evidenceId: string;
    status: VerificationStatus;
    verified: boolean;
    error?: string;
  }>;
}

export interface PackageVerificationResult {
  valid: boolean;
  verifiedCount: number;
  failedCount: number;
  results: Array<{
    evidenceId: string;
    valid: boolean;
  }>;
}

export interface BlockchainState {
  status: BlockchainStatus | null;
  stats: VerificationStats | null;
  verificationHistory: Map<string, VerificationRecord[]>;
  tamperAlerts: TamperAlert[];
  isLoading: boolean;
  error: string | null;
}

export interface HashGenerationResult {
  hash: string;
  algorithm: 'sha256' | 'sha3-256';
}

export interface HashVerificationResult {
  matches: boolean;
  currentHash: string;
  expectedHash: string;
}