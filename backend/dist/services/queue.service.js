"use strict";
/**
 * Queue Infrastructure
 * Enterprise background job processing
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.threatQueue = exports.analyticsQueue = exports.telemetryQueue = exports.verificationQueue = exports.ForensicsJobType = exports.QueueWorker = exports.JobStatus = exports.JobPriority = void 0;
exports.startWorkers = startWorkers;
exports.stopWorkers = stopWorkers;
exports.getWorkerStats = getWorkerStats;
const logger_1 = __importDefault(require("../config/logger"));
const uuid_1 = require("uuid");
/**
 * Job Priority Levels
 */
var JobPriority;
(function (JobPriority) {
    JobPriority[JobPriority["CRITICAL"] = 0] = "CRITICAL";
    JobPriority[JobPriority["HIGH"] = 1] = "HIGH";
    JobPriority[JobPriority["NORMAL"] = 2] = "NORMAL";
    JobPriority[JobPriority["LOW"] = 3] = "LOW";
    JobPriority[JobPriority["BACKGROUND"] = 4] = "BACKGROUND";
})(JobPriority || (exports.JobPriority = JobPriority = {}));
/**
 * Job Status
 */
var JobStatus;
(function (JobStatus) {
    JobStatus["PENDING"] = "pending";
    JobStatus["QUEUED"] = "queued";
    JobStatus["PROCESSING"] = "processing";
    JobStatus["COMPLETED"] = "completed";
    JobStatus["FAILED"] = "failed";
    JobStatus["CANCELLED"] = "cancelled";
})(JobStatus || (exports.JobStatus = JobStatus = {}));
/**
 * Queue Worker
 * Handles background job processing
 */
class QueueWorker {
    queue = [];
    handlers = new Map();
    processing = new Map();
    config;
    isProcessing = false;
    processingInterval;
    constructor(config = {}) {
        this.config = {
            name: config.name || 'default',
            maxConcurrent: config.maxConcurrent || 5,
            maxRetries: config.maxRetries || 3,
            retryDelay: config.retryDelay || 5000,
            processTimeout: config.processTimeout || 300000, // 5 minutes
        };
    }
    /**
     * Register a job handler
     */
    registerHandler(type, handler) {
        this.handlers.set(type, handler);
        logger_1.default.info(`Registered job handler: ${type}`, { queue: this.config.name });
    }
    /**
     * Enqueue a job
     */
    async enqueue(type, data, options = {}) {
        const job = {
            id: (0, uuid_1.v4)(),
            type,
            priority: options.priority || JobPriority.NORMAL,
            status: JobStatus.QUEUED,
            data,
            attempts: 0,
            maxAttempts: options.maxAttempts || this.config.maxRetries,
            createdAt: new Date().toISOString(),
            metadata: options.metadata,
        };
        // Insert in priority order
        const insertIndex = this.queue.findIndex(j => j.priority > job.priority);
        if (insertIndex === -1) {
            this.queue.push(job);
        }
        else {
            this.queue.splice(insertIndex, 0, job);
        }
        logger_1.default.info(`Job enqueued: ${type}`, {
            jobId: job.id,
            priority: JobPriority[job.priority],
            queue: this.config.name,
        });
        return job;
    }
    /**
     * Process queued jobs
     */
    async processQueue() {
        if (this.isProcessing)
            return;
        this.isProcessing = true;
        try {
            while (this.queue.length > 0 && this.processing.size < this.config.maxConcurrent) {
                const job = this.queue.shift();
                if (job) {
                    this.processing.set(job.id, job);
                    this.processJob(job).catch(err => {
                        logger_1.default.error(`Job processing error: ${job.id}`, { error: err.message });
                    });
                }
            }
        }
        finally {
            this.isProcessing = false;
        }
    }
    /**
     * Process a single job
     */
    async processJob(job) {
        const handler = this.handlers.get(job.type);
        if (!handler) {
            job.error = `No handler registered for job type: ${job.type}`;
            job.status = JobStatus.FAILED;
            this.processing.delete(job.id);
            return;
        }
        job.status = JobStatus.PROCESSING;
        job.startedAt = new Date().toISOString();
        job.attempts++;
        logger_1.default.info(`Processing job: ${job.type}`, {
            jobId: job.id,
            attempt: job.attempts,
            queue: this.config.name,
        });
        try {
            // Set timeout for processing
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Job processing timeout')), this.config.processTimeout);
            });
            job.result = await Promise.race([handler(job), timeoutPromise]);
            job.status = JobStatus.COMPLETED;
            job.completedAt = new Date().toISOString();
            logger_1.default.info(`Job completed: ${job.type}`, {
                jobId: job.id,
                duration: this.getDuration(job),
                queue: this.config.name,
            });
        }
        catch (error) {
            logger_1.default.error(`Job failed: ${job.type}`, {
                jobId: job.id,
                attempt: job.attempts,
                error: error.message,
                queue: this.config.name,
            });
            if (job.attempts < job.maxAttempts) {
                // Schedule retry
                job.status = JobStatus.QUEUED;
                job.nextRetryAt = new Date(Date.now() + this.config.retryDelay).toISOString();
                job.error = error.message;
                // Re-queue for retry
                setTimeout(() => {
                    const insertIndex = this.queue.findIndex(j => j.priority > job.priority);
                    if (insertIndex === -1) {
                        this.queue.push(job);
                    }
                    else {
                        this.queue.splice(insertIndex, 0, job);
                    }
                    this.processQueue();
                }, this.config.retryDelay);
            }
            else {
                job.status = JobStatus.FAILED;
                job.error = error.message;
                job.completedAt = new Date().toISOString();
            }
        }
        this.processing.delete(job.id);
        this.processQueue(); // Process next job
    }
    /**
     * Get job duration in ms
     */
    getDuration(job) {
        const start = new Date(job.startedAt).getTime();
        const end = job.completedAt ? new Date(job.completedAt).getTime() : Date.now();
        return end - start;
    }
    /**
     * Cancel a job
     */
    cancelJob(jobId) {
        // Remove from queue
        const queueIndex = this.queue.findIndex(j => j.id === jobId);
        if (queueIndex !== -1) {
            this.queue.splice(queueIndex, 1);
            logger_1.default.info(`Job cancelled from queue: ${jobId}`);
            return true;
        }
        // Cancel if processing
        if (this.processing.has(jobId)) {
            const job = this.processing.get(jobId);
            job.status = JobStatus.CANCELLED;
            job.completedAt = new Date().toISOString();
            this.processing.delete(jobId);
            logger_1.default.info(`Job cancelled during processing: ${jobId}`);
            return true;
        }
        return false;
    }
    /**
     * Get job status
     */
    getJobStatus(jobId) {
        const queueJob = this.queue.find(j => j.id === jobId);
        if (queueJob)
            return queueJob;
        const processingJob = this.processing.get(jobId);
        if (processingJob)
            return processingJob;
        return null;
    }
    /**
     * Get queue statistics
     */
    getStats() {
        return {
            queueName: this.config.name,
            pending: this.queue.length,
            processing: this.processing.size,
            total: this.queue.length + this.processing.size,
            registeredHandlers: this.handlers.size,
        };
    }
    /**
     * Start automatic processing
     */
    start() {
        if (this.processingInterval)
            return;
        this.processingInterval = setInterval(() => {
            this.processQueue();
        }, 1000);
        logger_1.default.info(`Queue worker started: ${this.config.name}`);
    }
    /**
     * Stop automatic processing
     */
    stop() {
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = undefined;
        }
        logger_1.default.info(`Queue worker stopped: ${this.config.name}`);
    }
}
exports.QueueWorker = QueueWorker;
/**
 * Job Types for the forensics platform
 */
var ForensicsJobType;
(function (ForensicsJobType) {
    ForensicsJobType["VERIFY_EVIDENCE"] = "verify_evidence";
    ForensicsJobType["SYNC_BLOCKCHAIN"] = "sync_blockchain";
    ForensicsJobType["PROCESS_TELEMETRY"] = "process_telemetry";
    ForensicsJobType["ANALYZE_BEHAVIOR"] = "analyze_behavior";
    ForensicsJobType["ENRICH_THREAT"] = "enrich_threat";
    ForensicsJobType["CORRELATE_INVESTIGATIONS"] = "correlate_investigations";
    ForensicsJobType["GENERATE_REPORT"] = "generate_report";
    ForensicsJobType["CLEANUP_OLD_DATA"] = "cleanup_old_data";
})(ForensicsJobType || (exports.ForensicsJobType = ForensicsJobType = {}));
/**
 * Pre-configured workers
 */
// Evidence verification queue
exports.verificationQueue = new QueueWorker({
    name: 'verification',
    maxConcurrent: 10,
    maxRetries: 3,
    retryDelay: 5000,
    processTimeout: 60000,
});
// Telemetry processing queue
exports.telemetryQueue = new QueueWorker({
    name: 'telemetry',
    maxConcurrent: 20,
    maxRetries: 5,
    retryDelay: 2000,
    processTimeout: 300000,
});
// Analytics processing queue
exports.analyticsQueue = new QueueWorker({
    name: 'analytics',
    maxConcurrent: 5,
    maxRetries: 2,
    retryDelay: 10000,
    processTimeout: 120000,
});
// Threat intelligence queue
exports.threatQueue = new QueueWorker({
    name: 'threat',
    maxConcurrent: 5,
    maxRetries: 3,
    retryDelay: 5000,
    processTimeout: 60000,
});
/**
 * Start all workers
 */
function startWorkers() {
    exports.verificationQueue.start();
    exports.telemetryQueue.start();
    exports.analyticsQueue.start();
    exports.threatQueue.start();
    logger_1.default.info('All queue workers started');
}
/**
 * Stop all workers
 */
function stopWorkers() {
    exports.verificationQueue.stop();
    exports.telemetryQueue.stop();
    exports.analyticsQueue.stop();
    exports.threatQueue.stop();
    logger_1.default.info('All queue workers stopped');
}
/**
 * Get all worker stats
 */
function getWorkerStats() {
    return {
        verification: exports.verificationQueue.getStats(),
        telemetry: exports.telemetryQueue.getStats(),
        analytics: exports.analyticsQueue.getStats(),
        threat: exports.threatQueue.getStats(),
    };
}
//# sourceMappingURL=queue.service.js.map