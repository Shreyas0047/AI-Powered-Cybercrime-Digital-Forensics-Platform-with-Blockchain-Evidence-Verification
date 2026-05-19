"use strict";
/**
 * Evidence Hashing Service
 * SHA-256 evidence fingerprinting and integrity verification
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.evidenceHashingService = exports.EvidenceHashingService = void 0;
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
const crypto_2 = require("crypto");
const types_1 = require("./types");
const uuid_1 = require("uuid");
class EvidenceHashingService {
    hashCache = new Map();
    /**
     * Generate SHA-256 fingerprint for a file
     */
    async generateFileFingerprint(filePath) {
        return new Promise((resolve, reject) => {
            const hash = crypto_1.default.createHash('sha256');
            const stream = fs_1.default.createReadStream(filePath);
            stream.on('data', (data) => hash.update(data));
            stream.on('end', () => resolve(hash.digest('hex')));
            stream.on('error', reject);
        });
    }
    /**
     * Generate SHA-256 fingerprint for raw data
     */
    generateDataFingerprint(data) {
        const content = typeof data === 'string' ? data : data.toString('base64');
        return (0, crypto_2.createHash)('sha256').update(content).digest('hex');
    }
    /**
     * Verify raw data against an expected SHA-256 hash.
     */
    verifyHash(data, expectedHash) {
        const hash = this.generateDataFingerprint(data);
        return {
            hash,
            matches: hash.toLowerCase() === expectedHash.toLowerCase(),
        };
    }
    /**
     * Generate fingerprint for evidence record
     */
    generateEvidenceFingerprint(evidence) {
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
    async verifyFileIntegrity(filePath, expectedHash) {
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
    async generateChainedFingerprint(evidenceId, filePath, previousFingerprint) {
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
    async generatePackageHash(packageId, filePaths, createdBy) {
        const evidenceHashes = await Promise.all(filePaths.map((fp) => this.generateFileFingerprint(fp)));
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
    generateMerkleRoot(hashes) {
        if (hashes.length === 0) {
            return this.generateDataFingerprint('');
        }
        if (hashes.length === 1) {
            return hashes[0];
        }
        const pairs = [];
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
    createIntegrityRecord(evidenceId, currentHash, previousHash) {
        return {
            evidenceId,
            currentHash,
            previousHash,
            integrityState: types_1.EvidenceIntegrityState.INTACT,
            lastVerifiedAt: new Date(),
            lastVerificationStatus: types_1.VerificationStatus.PENDING,
            verificationHistory: [],
            tamperAlerts: [],
        };
    }
    /**
     * Create verification record
     */
    createVerificationRecord(evidenceId, hash, status, method, verifiedBy, details) {
        return {
            id: (0, uuid_1.v4)(),
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
    async batchVerify(evidenceItems) {
        const results = [];
        const startTime = Date.now();
        for (const item of evidenceItems) {
            const itemStart = Date.now();
            try {
                const result = await this.verifyFileIntegrity(item.filePath, item.expectedHash);
                const integrityState = result.matches
                    ? types_1.EvidenceIntegrityState.INTACT
                    : types_1.EvidenceIntegrityState.MODIFIED;
                results.push({
                    evidenceId: item.evidenceId,
                    status: result.matches ? types_1.VerificationStatus.VERIFIED : types_1.VerificationStatus.MODIFIED,
                    hash: result.currentHash,
                    integrityState,
                    verificationTime: Date.now() - itemStart,
                });
            }
            catch (error) {
                results.push({
                    evidenceId: item.evidenceId,
                    status: types_1.VerificationStatus.FAILED,
                    hash: '',
                    integrityState: types_1.EvidenceIntegrityState.UNKNOWN,
                    verificationTime: Date.now() - itemStart,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }
        const verifiedCount = results.filter((r) => r.status === types_1.VerificationStatus.VERIFIED).length;
        const failedCount = results.filter((r) => r.status === types_1.VerificationStatus.FAILED).length;
        const modifiedCount = results.filter((r) => r.status === types_1.VerificationStatus.MODIFIED).length;
        return {
            batchId: (0, uuid_1.v4)(),
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
    detectTampering(expectedHash, currentHash) {
        const tampered = expectedHash.toLowerCase() !== currentHash.toLowerCase();
        let severity = 'low';
        if (tampered) {
            // In a real system, you might have additional heuristics
            severity = 'critical';
        }
        return { tampered, severity };
    }
    /**
     * Validate hash format
     */
    isValidHash(hash) {
        return /^[a-fA-F0-9]{64}$/.test(hash);
    }
    /**
     * Get cached hash or compute
     */
    async getCachedHash(filePath) {
        if (this.hashCache.has(filePath)) {
            return this.hashCache.get(filePath);
        }
        const hash = await this.generateFileFingerprint(filePath);
        this.hashCache.set(filePath, hash);
        return hash;
    }
    /**
     * Clear hash cache
     */
    clearCache() {
        this.hashCache.clear();
    }
    /**
     * Invalidate specific cache entry
     */
    invalidateCache(filePath) {
        this.hashCache.delete(filePath);
    }
}
exports.EvidenceHashingService = EvidenceHashingService;
exports.evidenceHashingService = new EvidenceHashingService();
exports.default = exports.evidenceHashingService;
//# sourceMappingURL=hashing.service.js.map