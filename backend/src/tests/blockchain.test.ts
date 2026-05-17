/**
 * Blockchain Tests
 * Unit tests for blockchain verification services
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { evidenceHashingService } from '../blockchain/hashing.service';
import { verificationService } from '../blockchain/verification.service';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('EvidenceHashingService', () => {
  let testFilePath: string;

  beforeEach(() => {
    // Create a test file for hashing
    const tempDir = path.join(os.tmpdir(), 'blockchain-test-' + Date.now());
    fs.mkdirSync(tempDir, { recursive: true });
    testFilePath = path.join(tempDir, 'test-file.txt');
    fs.writeFileSync(testFilePath, 'test content for hashing');
  });

  afterEach(() => {
    // Clean up test file
    if (testFilePath && fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
      fs.rmdirSync(path.dirname(testFilePath));
    }
    evidenceHashingService.clearCache();
  });

  describe('generateFileFingerprint', () => {
    it('should generate consistent SHA-256 hash for same content', async () => {
      const hash1 = await evidenceHashingService.generateFileFingerprint(testFilePath);
      const hash2 = await evidenceHashingService.generateFileFingerprint(testFilePath);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate different hashes for different content', async () => {
      const hash1 = await evidenceHashingService.generateFileFingerprint(testFilePath);

      const tempDir = path.dirname(testFilePath);
      const differentFilePath = path.join(tempDir, 'different.txt');
      fs.writeFileSync(differentFilePath, 'different content');

      const hash2 = await evidenceHashingService.generateFileFingerprint(differentFilePath);

      expect(hash1).not.toBe(hash2);

      fs.unlinkSync(differentFilePath);
    });
  });

  describe('generateDataFingerprint', () => {
    it('should generate hash for raw string data', () => {
      const hash = evidenceHashingService.generateDataFingerprint('test data');
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate hash for buffer data', () => {
      const hash = evidenceHashingService.generateDataFingerprint(Buffer.from('test data'));
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('verifyFileIntegrity', () => {
    it('should return valid for matching hashes', async () => {
      const expectedHash = await evidenceHashingService.generateFileFingerprint(testFilePath);
      const result = await evidenceHashingService.verifyFileIntegrity(testFilePath, expectedHash);

      expect(result.valid).toBe(true);
      expect(result.matches).toBe(true);
      expect(result.currentHash).toBe(expectedHash);
    });

    it('should return invalid for non-matching hashes', async () => {
      const result = await evidenceHashingService.verifyFileIntegrity(testFilePath, 'invalid-hash');

      expect(result.valid).toBe(true);
      expect(result.matches).toBe(false);
    });
  });

  describe('isValidHash', () => {
    it('should return true for valid SHA-256 hash', () => {
      expect(evidenceHashingService.isValidHash('a'.repeat(64))).toBe(true);
      expect(evidenceHashingService.isValidHash('abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890')).toBe(true);
    });

    it('should return false for invalid hash formats', () => {
      expect(evidenceHashingService.isValidHash('short')).toBe(false);
      expect(evidenceHashingService.isValidHash('g'.repeat(64))).toBe(false); // invalid hex
      expect(evidenceHashingService.isValidHash('')).toBe(false);
    });
  });

  describe('createIntegrityRecord', () => {
    it('should create integrity record with correct structure', () => {
      const record = evidenceHashingService.createIntegrityRecord('evidence-1', 'abc123');

      expect(record.evidenceId).toBe('evidence-1');
      expect(record.currentHash).toBe('abc123');
      expect(record.integrityState).toBeDefined();
      expect(record.lastVerifiedAt).toBeDefined();
      expect(record.verificationHistory).toEqual([]);
      expect(record.tamperAlerts).toEqual([]);
    });
  });

  describe('createVerificationRecord', () => {
    it('should create verification record with correct structure', () => {
      const record = evidenceHashingService.createVerificationRecord(
        'evidence-1',
        'hash123',
        'verified' as any,
        'local',
        'user-1',
        'Verification successful'
      );

      expect(record.id).toBeDefined();
      expect(record.evidenceId).toBe('evidence-1');
      expect(record.hash).toBe('hash123');
      expect(record.status).toBe('verified');
      expect(record.method).toBe('local');
      expect(record.verifiedBy).toBe('user-1');
      expect(record.details).toBe('Verification successful');
      expect(record.timestamp).toBeDefined();
    });
  });
});

describe('VerificationService', () => {
  beforeEach(() => {
    verificationService.clearVerificationData();
  });

  afterEach(() => {
    verificationService.clearVerificationData();
  });

  describe('verifyEvidence', () => {
    let testFilePath: string;

    beforeEach(() => {
      const tempDir = path.join(os.tmpdir(), 'verification-test-' + Date.now());
      fs.mkdirSync(tempDir, { recursive: true });
      testFilePath = path.join(tempDir, 'verify-test.txt');
      fs.writeFileSync(testFilePath, 'verification test content');
    });

    afterEach(() => {
      if (testFilePath && fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
        fs.rmdirSync(path.dirname(testFilePath));
      }
    });

    it('should verify evidence with matching hash', async () => {
      const expectedHash = await evidenceHashingService.generateFileFingerprint(testFilePath);

      const result = await verificationService.verifyEvidence(
        'evidence-123',
        testFilePath,
        expectedHash,
        'test-user'
      );

      expect(result.status).toBeDefined();
      expect(result.currentHash).toBe(expectedHash);
      expect(result.integrityState).toBeDefined();
      expect(result.verification).toBeDefined();
    });

    it('should detect tampering with non-matching hash', async () => {
      const result = await verificationService.verifyEvidence(
        'evidence-123',
        testFilePath,
        'invalid-expected-hash',
        'test-user'
      );

      expect(result.status).toBe('modified');
      expect(result.integrityState).toBe('modified');
    });
  });

  describe('getVerificationHistory', () => {
    it('should return empty array when no history exists', () => {
      const history = verificationService.getVerificationHistory('non-existent');
      expect(history).toEqual([]);
    });
  });

  describe('getVerificationStats', () => {
    it('should return initial stats with zeros', () => {
      const stats = verificationService.getVerificationStats();

      expect(stats.totalVerified).toBe(0);
      expect(stats.totalModified).toBe(0);
      expect(stats.totalFailed).toBe(0);
      expect(stats.unacknowledgedAlerts).toBe(0);
    });
  });

  describe('createIntegrityRecord', () => {
    it('should create integrity record', () => {
      const record = verificationService.createIntegrityRecord('evidence-1', 'hash123');

      expect(record.evidenceId).toBe('evidence-1');
      expect(record.currentHash).toBe('hash123');
    });
  });
});

describe('Blockchain Integration', () => {
  describe('Hash Chaining', () => {
    it('should generate chained fingerprints', async () => {
      const tempDir = path.join(os.tmpdir(), 'chain-test-' + Date.now());
      fs.mkdirSync(tempDir, { recursive: true });

      const file1 = path.join(tempDir, 'file1.txt');
      const file2 = path.join(tempDir, 'file2.txt');

      fs.writeFileSync(file1, 'first file');
      fs.writeFileSync(file2, 'second file');

      const fp1 = await evidenceHashingService.generateFileFingerprint(file1);
      const fp2 = await evidenceHashingService.generateFileFingerprint(file2);

      // Chain them
      const chainData = `${fp1}:${fp2}`;
      const chainHash = evidenceHashingService.generateDataFingerprint(chainData);

      expect(chainHash).toMatch(/^[a-f0-9]{64}$/);

      // Clean up
      fs.unlinkSync(file1);
      fs.unlinkSync(file2);
      fs.rmdirSync(tempDir);
    });
  });

  describe('Package Hash Generation', () => {
    it('should generate package hash for multiple files', async () => {
      const tempDir = path.join(os.tmpdir(), 'package-test-' + Date.now());
      fs.mkdirSync(tempDir, { recursive: true });

      const files = [
        path.join(tempDir, 'file1.txt'),
        path.join(tempDir, 'file2.txt'),
        path.join(tempDir, 'file3.txt'),
      ];

      files.forEach((f, i) => fs.writeFileSync(f, `content ${i}`));

      const packageHash = await evidenceHashingService.generatePackageHash(
        'package-123',
        files,
        'test-user'
      );

      expect(packageHash.packageId).toBe('package-123');
      expect(packageHash.rootHash).toMatch(/^[a-f0-9]{64}$/);
      expect(packageHash.evidenceHashes).toHaveLength(3);
      expect(packageHash.manifestHash).toMatch(/^[a-f0-9]{64}$/);
      expect(packageHash.createdAt).toBeDefined();

      // Clean up
      files.forEach((f) => fs.unlinkSync(f));
      fs.rmdirSync(tempDir);
    });

    it('should generate deterministic package hash', async () => {
      const tempDir = path.join(os.tmpdir(), 'package-det-' + Date.now());
      fs.mkdirSync(tempDir, { recursive: true });

      const files = [
        path.join(tempDir, 'a.txt'),
        path.join(tempDir, 'b.txt'),
      ];

      files.forEach((f, i) => fs.writeFileSync(f, `content ${i}`));

      const hash1 = await evidenceHashingService.generatePackageHash('pkg-1', files, 'user1');
      const hash2 = await evidenceHashingService.generatePackageHash('pkg-1', files, 'user1');

      expect(hash1.rootHash).toBe(hash2.rootHash);

      // Clean up
      files.forEach((f) => fs.unlinkSync(f));
      fs.rmdirSync(tempDir);
    });
  });
});