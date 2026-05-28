/**
 * Queue Infrastructure
 * Enterprise background job processing
 */

import logger from '../config/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Job Priority Levels
 */
export enum JobPriority {
  CRITICAL = 0,
  HIGH = 1,
  NORMAL = 2,
  LOW = 3,
  BACKGROUND = 4,
}

/**
 * Job Status
 */
export enum JobStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * Job Interface
 */
export interface Job<T = any> {
  id: string;
  type: string;
  priority: JobPriority;
  status: JobStatus;
  data: T;
  result?: any;
  error?: string;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  nextRetryAt?: string;
  metadata?: Record<string, any>;
}

/**
 * Queue Configuration
 */
export interface QueueConfig {
  name: string;
  maxConcurrent: number;
  maxRetries: number;
  retryDelay: number;
  processTimeout: number;
}

/**
 * Job Handler
 */
export type JobHandler<T = any, R = any> = (job: Job<T>) => Promise<R>;

/**
 * Queue Worker
 * Handles background job processing
 */
export class QueueWorker {
  private queue: Job[] = [];
  private handlers: Map<string, JobHandler> = new Map();
  private processing = new Map<string, Job>();
  private config: QueueConfig;
  private inFlightJobs = 0;
  private isStopped = false;
  private processingInterval?: NodeJS.Timeout;
  private timers: ReturnType<typeof setTimeout>[] = [];

  constructor(config: Partial<QueueConfig> = {}) {
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
  registerHandler(type: string, handler: JobHandler): void {
    this.handlers.set(type, handler);
    logger.info(`Registered job handler: ${type}`, { queue: this.config.name });
  }

  /**
   * Enqueue a job
   */
  async enqueue<T>(
    type: string,
    data: T,
    options: {
      priority?: JobPriority;
      maxAttempts?: number;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<Job<T>> {
    const job: Job<T> = {
      id: uuidv4(),
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
    } else {
      this.queue.splice(insertIndex, 0, job);
    }

    logger.info(`Job enqueued: ${type}`, {
      jobId: job.id,
      priority: JobPriority[job.priority],
      queue: this.config.name,
    });

    return job;
  }

  /**
   * Process queued jobs
   */
  async processQueue(): Promise<void> {
    if (this.inFlightJobs >= this.config.maxConcurrent) return;

    const available = this.config.maxConcurrent - this.inFlightJobs;
    const jobs = this.queue.splice(0, available);

    if (jobs.length === 0) return;

    this.inFlightJobs += jobs.length;

    await Promise.allSettled(jobs.map(job => this.processJob(job)));

    this.inFlightJobs -= jobs.length;

    if (this.queue.length > 0 && !this.isStopped) {
      this.processQueue();
    }
  }

  /**
   * Process a single job
   */
  private async processJob(job: Job): Promise<void> {
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

    logger.info(`Processing job: ${job.type}`, {
      jobId: job.id,
      attempt: job.attempts,
      queue: this.config.name,
    });

    try {
      // Set timeout for processing
      const timeoutPromise = new Promise((_, reject) => {
        const processTimer = setTimeout(() => reject(new Error('Job processing timeout')), this.config.processTimeout);
        this.timers.push(processTimer);
      });

      job.result = await Promise.race([handler(job), timeoutPromise]);
      job.status = JobStatus.COMPLETED;
      job.completedAt = new Date().toISOString();

      logger.info(`Job completed: ${job.type}`, {
        jobId: job.id,
        duration: this.getDuration(job),
        queue: this.config.name,
      });
    } catch (error) {
      logger.error(`Job failed: ${job.type}`, {
        jobId: job.id,
        attempt: job.attempts,
        error: (error as Error).message,
        queue: this.config.name,
      });

      if (job.attempts < job.maxAttempts) {
        // Schedule retry
        job.status = JobStatus.QUEUED;
        job.nextRetryAt = new Date(Date.now() + this.config.retryDelay).toISOString();
        job.error = (error as Error).message;

        // Re-queue for retry
        const retryTimer = setTimeout(() => {
          const insertIndex = this.queue.findIndex(j => j.priority > job.priority);
          if (insertIndex === -1) {
            this.queue.push(job);
          } else {
            this.queue.splice(insertIndex, 0, job);
          }
          this.processQueue();
        }, this.config.retryDelay);
        this.timers.push(retryTimer);
      } else {
        job.status = JobStatus.FAILED;
        job.error = (error as Error).message;
        job.completedAt = new Date().toISOString();
      }
    }

    this.processing.delete(job.id);
    if (this.processing.size > 1000) {
      this.cleanupOldJobs();
    }
    this.processQueue(); // Process next job
  }

  /**
   * Clean up completed/failed jobs older than 30 minutes
   */
  private cleanupOldJobs(): void {
    const cutoff = Date.now() - 30 * 60 * 1000;
    this.queue = this.queue.filter(j => {
      const createdAt = new Date(j.createdAt).getTime();
      const isOld = cutoff - createdAt > 0;
      return !(isOld && (j.status === JobStatus.COMPLETED || j.status === JobStatus.FAILED));
    });
  }

  /**
   * Get job duration in ms
   */
  private getDuration(job: Job): number {
    const start = new Date(job.startedAt!).getTime();
    const end = job.completedAt ? new Date(job.completedAt).getTime() : Date.now();
    return end - start;
  }

  /**
   * Cancel a job
   */
  cancelJob(jobId: string): boolean {
    // Remove from queue
    const queueIndex = this.queue.findIndex(j => j.id === jobId);
    if (queueIndex !== -1) {
      this.queue.splice(queueIndex, 1);
      logger.info(`Job cancelled from queue: ${jobId}`);
      return true;
    }

    // Cancel if processing
    if (this.processing.has(jobId)) {
      const job = this.processing.get(jobId)!;
      job.status = JobStatus.CANCELLED;
      job.completedAt = new Date().toISOString();
      this.processing.delete(jobId);
      logger.info(`Job cancelled during processing: ${jobId}`);
      return true;
    }

    return false;
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): Job | null {
    const queueJob = this.queue.find(j => j.id === jobId);
    if (queueJob) return queueJob;

    const processingJob = this.processing.get(jobId);
    if (processingJob) return processingJob;

    return null;
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    queueName: string;
    pending: number;
    processing: number;
    total: number;
    registeredHandlers: number;
  } {
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
  start(): void {
    if (this.processingInterval) return;

    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 1000);

    logger.info(`Queue worker started: ${this.config.name}`);
  }

  /**
   * Stop automatic processing
   */
  stop(): void {
    this.isStopped = true;
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }
    this.timers.forEach(t => clearTimeout(t));
    this.timers = [];
    logger.info(`Queue worker stopped: ${this.config.name}`);
  }
}

/**
 * Job Types for the forensics platform
 */
export enum ForensicsJobType {
  VERIFY_EVIDENCE = 'verify_evidence',
  SYNC_BLOCKCHAIN = 'sync_blockchain',
  PROCESS_TELEMETRY = 'process_telemetry',
  ANALYZE_BEHAVIOR = 'analyze_behavior',
  ENRICH_THREAT = 'enrich_threat',
  CORRELATE_INVESTIGATIONS = 'correlate_investigations',
  GENERATE_REPORT = 'generate_report',
  CLEANUP_OLD_DATA = 'cleanup_old_data',
}

/**
 * Pre-configured workers
 */

// Evidence verification queue
export const verificationQueue = new QueueWorker({
  name: 'verification',
  maxConcurrent: 10,
  maxRetries: 3,
  retryDelay: 5000,
  processTimeout: 60000,
});

// Telemetry processing queue
export const telemetryQueue = new QueueWorker({
  name: 'telemetry',
  maxConcurrent: 20,
  maxRetries: 5,
  retryDelay: 2000,
  processTimeout: 300000,
});

// Analytics processing queue
export const analyticsQueue = new QueueWorker({
  name: 'analytics',
  maxConcurrent: 5,
  maxRetries: 2,
  retryDelay: 10000,
  processTimeout: 120000,
});

// Threat intelligence queue
export const threatQueue = new QueueWorker({
  name: 'threat',
  maxConcurrent: 5,
  maxRetries: 3,
  retryDelay: 5000,
  processTimeout: 60000,
});

/**
 * Start all workers
 */
export function startWorkers(): void {
  verificationQueue.start();
  telemetryQueue.start();
  analyticsQueue.start();
  threatQueue.start();
  logger.info('All queue workers started');
}

/**
 * Stop all workers
 */
export function stopWorkers(): void {
  verificationQueue.stop();
  telemetryQueue.stop();
  analyticsQueue.stop();
  threatQueue.stop();
  logger.info('All queue workers stopped');
}

/**
 * Get all worker stats
 */
export function getWorkerStats(): Record<string, ReturnType<typeof QueueWorker.prototype.getStats>> {
  return {
    verification: verificationQueue.getStats(),
    telemetry: telemetryQueue.getStats(),
    analytics: analyticsQueue.getStats(),
    threat: threatQueue.getStats(),
  };
}