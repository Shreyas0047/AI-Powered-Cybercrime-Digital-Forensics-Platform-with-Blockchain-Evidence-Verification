"use strict";
/**
 * Distributed Verification Service
 * Handles parallel verification workflows and scheduling
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.distributedVerificationService = exports.DistributedVerificationService = void 0;
const blockchain_model_1 = require("./models/blockchain.model");
const hashing_service_1 = require("./hashing.service");
const types_1 = require("./types");
const uuid_1 = require("uuid");
class DistributedVerificationService {
    jobQueue = [];
    schedules = [];
    isWorkerRunning = false;
    MAX_CONCURRENT = 5;
    MAX_QUEUE_SIZE = 1000;
    /**
     * Create verification job
     */
    async createJob(type, evidenceIds, userId, priority = 'normal', filePaths) {
        if (this.jobQueue.length >= this.MAX_QUEUE_SIZE) {
            throw new Error('Verification queue is full');
        }
        const job = {
            id: (0, uuid_1.v4)(),
            type,
            priority,
            status: 'queued',
            evidenceIds,
            filePaths,
            userId,
            createdAt: new Date(),
            progress: 0,
        };
        // Insert based on priority
        this.insertJobByPriority(job);
        return job.id;
    }
    /**
     * Insert job by priority
     */
    insertJobByPriority(job) {
        const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
        const priority = priorityOrder[job.priority];
        let insertIndex = this.jobQueue.findIndex(j => priorityOrder[j.priority] > priority);
        if (insertIndex === -1) {
            this.jobQueue.push(job);
        }
        else {
            this.jobQueue.splice(insertIndex, 0, job);
        }
    }
    /**
     * Start verification worker
     */
    async startWorker() {
        if (this.isWorkerRunning)
            return;
        this.isWorkerRunning = true;
        console.log('[VerificationWorker] Started');
        this.processQueue();
    }
    /**
     * Stop verification worker
     */
    async stopWorker() {
        this.isWorkerRunning = false;
        console.log('[VerificationWorker] Stopped');
    }
    /**
     * Process verification queue
     */
    async processQueue() {
        if (!this.isWorkerRunning)
            return;
        try {
            // Get jobs ready to process
            const readyJobs = this.jobQueue
                .filter(j => j.status === 'queued')
                .slice(0, this.MAX_CONCURRENT);
            const processingJobs = this.jobQueue.filter(j => j.status === 'processing');
            if (readyJobs.length === 0 && processingJobs.length === 0) {
                setTimeout(() => this.processQueue(), 1000);
                return;
            }
            // Process ready jobs
            for (const job of readyJobs) {
                job.status = 'processing';
                job.startedAt = new Date();
                this.processJob(job).catch(async (error) => {
                    job.status = 'failed';
                    job.error = error instanceof Error ? error.message : 'Unknown error';
                    job.completedAt = new Date();
                    await this.logAudit(null, types_1.BlockchainEventType.VERIFICATION_FAILED, `Verification job ${job.id} failed: ${job.error}`, 'system');
                });
            }
            // Update progress for processing jobs
            for (const job of processingJobs) {
                const completed = job.results?.filter(r => r).length || 0;
                job.progress = (completed / job.evidenceIds.length) * 100;
            }
        }
        catch (error) {
            console.error('[VerificationWorker] Queue processing error:', error);
        }
        // Schedule next iteration
        setTimeout(() => this.processQueue(), 500);
    }
    /**
     * Process individual verification job
     */
    async processJob(job) {
        const results = [];
        // Process in parallel with batching
        const batchSize = 10;
        for (let i = 0; i < job.evidenceIds.length; i += batchSize) {
            const batch = job.evidenceIds.slice(i, i + batchSize);
            const batchResults = await Promise.all(batch.map(async (evidenceId, index) => {
                const startTime = Date.now();
                try {
                    const result = await this.verifyEvidence(evidenceId, job.userId);
                    return {
                        evidenceId,
                        status: result.status,
                        verified: result.verified,
                        currentHash: result.currentHash,
                        integrityState: result.integrityState,
                        verificationTime: Date.now() - startTime,
                    };
                }
                catch (error) {
                    return {
                        evidenceId,
                        status: types_1.VerificationStatus.FAILED,
                        verified: false,
                        error: error instanceof Error ? error.message : 'Unknown error',
                        verificationTime: Date.now() - startTime,
                    };
                }
            }));
            results.push(...batchResults);
            job.results = results;
            job.progress = ((i + batch.length) / job.evidenceIds.length) * 100;
        }
        job.status = 'completed';
        job.completedAt = new Date();
        job.progress = 100;
        // Log completion
        const successCount = results.filter(r => r.verified).length;
        await this.logAudit(null, types_1.BlockchainEventType.EVIDENCE_VERIFIED, `Verification job ${job.id} completed: ${successCount}/${results.length} verified`, job.userId, { jobType: job.type, total: results.length, verified: successCount });
    }
    /**
     * Verify single evidence
     */
    async verifyEvidence(evidenceId, userId) {
        // Get verification record
        const verification = await blockchain_model_1.BlockchainVerification.findOne({ evidenceId });
        if (!verification) {
            throw new Error(`Verification record not found for ${evidenceId}`);
        }
        // Get current file hash
        const evidence = await (await Promise.resolve().then(() => __importStar(require('../models')))).Evidence.findById(evidenceId);
        if (!evidence) {
            throw new Error(`Evidence not found: ${evidenceId}`);
        }
        // Calculate current hash
        const currentHash = await hashing_service_1.evidenceHashingService.generateFileFingerprint(evidence.filePath);
        // Compare hashes
        const verified = currentHash === verification.fingerprint;
        const status = verified ? types_1.VerificationStatus.VERIFIED : types_1.VerificationStatus.MODIFIED;
        const integrityState = verified ? types_1.EvidenceIntegrityState.INTACT : types_1.EvidenceIntegrityState.MODIFIED;
        // Update verification record
        verification.verificationResult = verified;
        verification.verifiedAt = new Date();
        verification.status = status;
        await verification.save();
        // Update integrity record
        let integrity = await blockchain_model_1.EvidenceIntegrity.findOne({ evidenceId });
        if (integrity) {
            integrity.currentHash = currentHash;
            integrity.integrityState = integrityState;
            integrity.lastVerifiedAt = new Date();
            integrity.lastVerificationStatus = status;
            integrity.verificationHistory.push({
                id: (0, uuid_1.v4)(),
                timestamp: new Date(),
                hash: currentHash,
                status,
                method: 'both',
                verifiedBy: userId,
                details: verified ? 'Verified successfully' : 'Hash mismatch detected',
            });
            if (!verified) {
                integrity.tamperAlerts.push({
                    id: (0, uuid_1.v4)(),
                    timestamp: new Date(),
                    evidenceId,
                    detectedAt: new Date(),
                    expectedHash: verification.fingerprint,
                    actualHash: currentHash,
                    severity: 'high',
                    acknowledged: false,
                });
            }
            await integrity.save();
        }
        return { status, verified, currentHash, integrityState };
    }
    /**
     * Create verification schedule
     */
    async createSchedule(name, cronExpression, evidenceFilter, createdBy) {
        const schedule = {
            id: (0, uuid_1.v4)(),
            name,
            cronExpression,
            enabled: true,
            evidenceFilter,
            createdBy,
            createdAt: new Date(),
        };
        this.schedules.push(schedule);
        return schedule.id;
    }
    /**
     * Get job status
     */
    getJobStatus(jobId) {
        return this.jobQueue.find(j => j.id === jobId) || null;
    }
    /**
     * Get queue status
     */
    getQueueStatus() {
        return {
            totalJobs: this.jobQueue.length,
            queued: this.jobQueue.filter(j => j.status === 'queued').length,
            processing: this.jobQueue.filter(j => j.status === 'processing').length,
            completed: this.jobQueue.filter(j => j.status === 'completed').length,
            failed: this.jobQueue.filter(j => j.status === 'failed').length,
            byPriority: {
                critical: this.jobQueue.filter(j => j.priority === 'critical').length,
                high: this.jobQueue.filter(j => j.priority === 'high').length,
                normal: this.jobQueue.filter(j => j.priority === 'normal').length,
                low: this.jobQueue.filter(j => j.priority === 'low').length,
            },
        };
    }
    /**
     * Get schedules
     */
    getSchedules() {
        return [...this.schedules];
    }
    /**
     * Cancel job
     */
    cancelJob(jobId) {
        const job = this.jobQueue.find(j => j.id === jobId);
        if (job && job.status === 'queued') {
            job.status = 'failed';
            job.error = 'Cancelled by user';
            return true;
        }
        return false;
    }
    /**
     * Get verification statistics
     */
    getVerificationStats() {
        const completed = this.jobQueue.filter(j => j.status === 'completed');
        let verifiedCount = 0;
        let modifiedCount = 0;
        let failedCount = 0;
        let totalTime = 0;
        let count = 0;
        for (const job of completed) {
            if (job.results) {
                for (const result of job.results) {
                    if (result.verified)
                        verifiedCount++;
                    else if (result.status === types_1.VerificationStatus.MODIFIED)
                        modifiedCount++;
                    else if (result.status === types_1.VerificationStatus.FAILED)
                        failedCount++;
                    if (result.verificationTime) {
                        totalTime += result.verificationTime;
                        count++;
                    }
                }
            }
        }
        return {
            totalProcessed: completed.length,
            verifiedCount,
            modifiedCount,
            failedCount,
            averageVerificationTime: count > 0 ? Math.round(totalTime / count) : 0,
        };
    }
    /**
     * Log audit entry
     */
    async logAudit(evidenceId, eventType, details, performedBy, metadata) {
        try {
            await blockchain_model_1.BlockchainAudit.create({
                evidenceId,
                eventType,
                details,
                performedBy,
                metadata,
            });
        }
        catch (error) {
            console.error('[DistributedVerification] Failed to log audit:', error);
        }
    }
}
exports.DistributedVerificationService = DistributedVerificationService;
exports.distributedVerificationService = new DistributedVerificationService();
exports.default = exports.distributedVerificationService;
//# sourceMappingURL=verification-worker.service.js.map