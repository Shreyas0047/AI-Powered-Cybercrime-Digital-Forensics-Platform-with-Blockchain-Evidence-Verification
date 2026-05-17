/**
 * Evidence Hashing Service
 * SHA-256 evidence fingerprinting and integrity verification
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createHash } from 'crypto';
import {
  EvidenceFingerprint,
  EvidenceIntegrityRecord,
  EvidenceIntegrityState,
  VerificationStatus,
  VerificationRecord,
  VerificationBatchResult,
  VerificationResultItem,
  EvidencePackageHash,
} from './types';
import { v4 as uuidv4 } from 'uuid';

export class EvidenceHashingService {
  private hashCache: Map<string, string> = new Map();

  /**
   * Generate SHA-256 fingerprint for a file
   */
  async generateFileFingerprint(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);

      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * Generate SHA-256 fingerprint for raw data
   */
  generateDataFingerprint(data: Buffer | string): string {
    const content = typeof data === 'string' ? data : data.toString('base64');
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Verify raw data against an expected SHA-256 hash.
   */
  verifyHash(data: Buffer | string, expectedHash: string): { hash: string; matches: boolean } {
    const hash = this.generateDataFingerprint(data);
    return {
      hash,
      matches: hash.toLowerCase() === expectedHash.toLowerCase(),
    };
  }

  /**
   * Generate fingerprint for evidence record
   */
  generateEvidenceFingerprint(evidence: {
    evidenceId: string;
    name: string;
    fileSize: number;
    mimeType: string;
    filePath: string;
    collectedAt: Date;
  }): Promise<EvidenceFingerprint> {
    return this.generateFileFingerprint(evidence.filePath).then((fingerprint) => ({
      evidenceId: evidence.evidenceId,
      fingerprint,
      algorithm: 'sha256',
      generatedAt: new Date(),
      generatedBy: 'system',
      chainPosition: 0,
    }));
  }

  /**
   * Verify file integrity against stored hash
   */
  async verifyFileIntegrity(
    filePath: string,
    expectedHash: string
  ): Promise<{ valid: boolean; currentHash: string; matches: boolean }> {
    const currentHash = await this.generateFileFingerprint(filePath);
    return {
      valid: true,
      currentHash,
      matches: currentHash.toLowerCase() === expectedHash.toLowerCase(),
    };
  }

  /**
   * Generate evidence fingerprint with chain linking
   */
  async generateChainedFingerprint(
    evidenceId: string,
    filePath: string,
    previousFingerprint?: string
  ): Promise<EvidenceFingerprint> {
    const currentHash = await this.generateFileFingerprint(filePath);

    let chainData = currentHash;
    if (previousFingerprint) {
      chainData = `${previousFingerprint}:${currentHash}`;
    }

    const chainHash = this.generateDataFingerprint(chainData);

    return {
      evidenceId,
      fingerprint: chainHash,
      algorithm: 'sha256',
      generatedAt: new Date(),
      generatedBy: 'system',
      previousFingerprint,
      chainPosition: previousFingerprint ? 1 : 0,
    };
  }

  /**
   * Generate package hash for multiple evidence files
   */
  async generatePackageHash(
    packageId: string,
    filePaths: string[],
    createdBy: string
  ): Promise<EvidencePackageHash> {
    const evidenceHashes = await Promise.all(
      filePaths.map((fp) => this.generateFileFingerprint(fp))
    );

    // Sort hashes for deterministic ordering
    evidenceHashes.sort();

    // Generate merkle root-style hash
    const merkleRoot = this.generateMerkleRoot(evidenceHashes);

    // Generate manifest hash
    const manifest = JSON.stringify({
      packageId,
      files: filePaths.map((fp, i) => ({
        path: fp,
        hash: evidenceHashes[i],
      })),
      timestamp: new Date().toISOString(),
    });
    const manifestHash = this.generateDataFingerprint(manifest);

    return {
      packageId,
      rootHash: merkleRoot,
      evidenceHashes,
      manifestHash,
      createdAt: new Date(),
      createdBy,
      verificationCount: 0,
    };
  }

  /**
   * Generate merkle root from hash array
   */
  generateMerkleRoot(hashes: string[]): string {
    if (hashes.length === 0) {
      return this.generateDataFingerprint('');
    }

    if (hashes.length === 1) {
      return hashes[0];
    }

    const pairs: string[] = [];
    for (let i = 0; i < hashes.length; i += 2) {
      const left = hashes[i];
      const right = hashes[i + 1] || left;
      pairs.push(this.generateDataFingerprint(`${left}:${right}`));
    }

    return this.generateMerkleRoot(pairs);
  }

  /**
   * Create integrity record for evidence
   */
  createIntegrityRecord(
    evidenceId: string,
    currentHash: string,
    previousHash?: string
  ): EvidenceIntegrityRecord {
    return {
      evidenceId,
      currentHash,
      previousHash,
      integrityState: EvidenceIntegrityState.INTACT,
      lastVerifiedAt: new Date(),
      lastVerificationStatus: VerificationStatus.PENDING,
      verificationHistory: [],
      tamperAlerts: [],
    };
  }

  /**
   * Create verification record
   */
  createVerificationRecord(
    evidenceId: string,
    hash: string,
    status: VerificationStatus,
    method: 'local' | 'blockchain' | 'both',
    verifiedBy: string,
    details?: string
  ): VerificationRecord {
    return {
      id: uuidv4(),
      evidenceId,
      timestamp: new Date(),
      hash,
      status,
      method,
      verifiedBy,
      details,
    };
  }

  /**
   * Batch verify multiple evidence files
   */
  async batchVerify(
    evidenceItems: Array<{ evidenceId: string; filePath: string; expectedHash: string }>
  ): Promise<VerificationBatchResult> {
    const results: VerificationResultItem[] = [];
    const startTime = Date.now();

    for (const item of evidenceItems) {
      const itemStart = Date.now();

      try {
        const result = await this.verifyFileIntegrity(item.filePath, item.expectedHash);
        const integrityState = result.matches
          ? EvidenceIntegrityState.INTACT
          : EvidenceIntegrityState.MODIFIED;

        results.push({
          evidenceId: item.evidenceId,
          status: result.matches ? VerificationStatus.VERIFIED : VerificationStatus.MODIFIED,
          hash: result.currentHash,
          integrityState,
          verificationTime: Date.now() - itemStart,
        });
      } catch (error) {
        results.push({
          evidenceId: item.evidenceId,
          status: VerificationStatus.FAILED,
          hash: '',
          integrityState: EvidenceIntegrityState.UNKNOWN,
          verificationTime: Date.now() - itemStart,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const verifiedCount = results.filter((r) => r.status === VerificationStatus.VERIFIED).length;
    const failedCount = results.filter((r) => r.status === VerificationStatus.FAILED).length;
    const modifiedCount = results.filter((r) => r.status === VerificationStatus.MODIFIED).length;

    return {
      batchId: uuidv4(),
      totalEvidence: evidenceItems.length,
      verifiedCount,
      failedCount,
      modifiedCount,
      results,
      completedAt: new Date(),
    };
  }

  /**
   * Detect tampering by comparing hashes
   */
  detectTampering(
    expectedHash: string,
    currentHash: string
  ): { tampered: boolean; severity: 'low' | 'medium' | 'high' | 'critical' } {
    const tampered = expectedHash.toLowerCase() !== currentHash.toLowerCase();

    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (tampered) {
      // In a real system, you might have additional heuristics
      severity = 'critical';
    }

    return { tampered, severity };
  }

  /**
   * Validate hash format
   */
  isValidHash(hash: string): boolean {
    return /^[a-fA-F0-9]{64}$/.test(hash);
  }

  /**
   * Get cached hash or compute
   */
  async getCachedHash(filePath: string): Promise<string> {
    if (this.hashCache.has(filePath)) {
      return this.hashCache.get(filePath)!;
    }

    const hash = await this.generateFileFingerprint(filePath);
    this.hashCache.set(filePath, hash);
    return hash;
  }

  /**
   * Clear hash cache
   */
  clearCache(): void {
    this.hashCache.clear();
  }

  /**
   * Invalidate specific cache entry
   */
  invalidateCache(filePath: string): void {
    this.hashCache.delete(filePath);
  }
}

export const evidenceHashingService = new EvidenceHashingService();
export default evidenceHashingService;
