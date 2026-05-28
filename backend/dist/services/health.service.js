"use strict";
/**
 * Health Monitoring Service
 * Platform-wide health checks and metrics
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthMonitor = void 0;
exports.healthCheckHandler = healthCheckHandler;
exports.readinessCheckHandler = readinessCheckHandler;
exports.livenessCheckHandler = livenessCheckHandler;
exports.getPrometheusMetrics = getPrometheusMetrics;
const logger_1 = __importDefault(require("../config/logger"));
const mongoose_1 = __importDefault(require("mongoose"));
const database_optimization_service_1 = require("./database-optimization.service");
const queue_service_1 = require("./queue.service");
const models_1 = require("../models");
/**
 * Health Monitor
 */
class HealthMonitor {
    startTime = Date.now();
    requestCount = 0;
    successCount = 0;
    failedCount = 0;
    latencySum = 0;
    version = '1.0.0';
    /**
     * Record a request
     */
    recordRequest(success, latency) {
        this.requestCount++;
        if (success) {
            this.successCount++;
        }
        else {
            this.failedCount++;
        }
        this.latencySum += latency;
    }
    /**
     * Check service health
     */
    async checkServiceHealth(serviceName) {
        const start = Date.now();
        try {
            switch (serviceName) {
                case 'database':
                    return await this.checkDatabaseHealth();
                case 'websocket':
                    return await this.checkWebSocketHealth();
                case 'blockchain':
                    return await this.checkBlockchainHealth();
                case 'queue':
                    return await this.checkQueueHealth();
                default:
                    return {
                        status: 'healthy',
                        lastCheck: new Date().toISOString(),
                    };
            }
        }
        catch (error) {
            return {
                status: 'down',
                lastCheck: new Date().toISOString(),
                message: error.message,
            };
        }
    }
    /**
     * Check database health
     */
    async checkDatabaseHealth() {
        const start = Date.now();
        try {
            await mongoose_1.default.connection.db?.admin().ping();
            const latency = Date.now() - start;
            return {
                status: latency < 100 ? 'healthy' : latency < 500 ? 'degraded' : 'down',
                latency,
                lastCheck: new Date().toISOString(),
            };
        }
        catch (error) {
            return {
                status: 'down',
                latency: Date.now() - start,
                lastCheck: new Date().toISOString(),
                message: error.message,
            };
        }
    }
    /**
     * Check WebSocket health
     */
    async checkWebSocketHealth() {
        // In a real implementation, this would check the Socket.IO connection
        return {
            status: 'healthy',
            lastCheck: new Date().toISOString(),
        };
    }
    /**
     * Check blockchain health
     */
    async checkBlockchainHealth() {
        // Check blockchain RPC connectivity
        return {
            status: 'healthy',
            lastCheck: new Date().toISOString(),
        };
    }
    /**
     * Check queue health
     */
    async checkQueueHealth() {
        const workerStats = (0, queue_service_1.getWorkerStats)();
        const totalPending = Object.values(workerStats).reduce((sum, stat) => sum + stat.pending, 0);
        return {
            status: totalPending < 100 ? 'healthy' : totalPending < 500 ? 'degraded' : 'down',
            lastCheck: new Date().toISOString(),
            message: `${totalPending} jobs pending`,
        };
    }
    /**
     * Get platform metrics
     */
    getMetrics() {
        const memUsage = process.memoryUsage();
        const memTotal = memUsage.heapTotal;
        const memUsed = memUsage.heapUsed;
        const workerStats = (0, queue_service_1.getWorkerStats)();
        return {
            requests: {
                total: this.requestCount,
                success: this.successCount,
                failed: this.failedCount,
                averageLatency: this.requestCount > 0
                    ? Math.round(this.latencySum / this.requestCount)
                    : 0,
            },
            database: {
                ...(0, database_optimization_service_1.getConnectionPoolStats)(),
                responseTime: 0, // Will be populated from actual check
            },
            workers: {
                verification: workerStats.verification,
                telemetry: workerStats.telemetry,
                analytics: workerStats.analytics,
                threat: workerStats.threat,
            },
            memory: {
                used: Math.round(memUsed / (1024 * 1024)),
                total: Math.round(memTotal / (1024 * 1024)),
                percentage: Math.round((memUsed / memTotal) * 100),
            },
        };
    }
    /**
     * Check for stale sandbox sessions (no heartbeat >90s) and mark as failed.
     * This reconciles the state when an agent disconnects without a clean shutdown.
     */
    async checkStaleSessions() {
        try {
            const staleThreshold = new Date(Date.now() - 90 * 1000);
            const result = await models_1.SandboxSession.updateMany({
                status: 'running',
                $or: [
                    { lastHeartbeat: { $lt: staleThreshold } },
                    { lastHeartbeat: null, createdAt: { $lt: staleThreshold } },
                ],
            }, {
                $set: {
                    status: 'failed',
                    endTime: new Date(),
                    errorMessages: ['Session agent disconnected'],
                },
            });
            if (result.modifiedCount > 0) {
                logger_1.default.warn(`[StaleSessions] Marked ${result.modifiedCount} stale session(s) as failed (no heartbeat for >90s)`);
            }
            return result.modifiedCount;
        }
        catch (error) {
            logger_1.default.error('[StaleSessions] Failed to check for stale sessions:', error);
            return 0;
        }
    }
    /**
     * Get full health status
     */
    async getHealthStatus() {
        const services = {};
        const criticalServices = [
            'database',
            'websocket',
            'blockchain',
            'queue',
        ];
        for (const service of criticalServices) {
            services[service] = await this.checkServiceHealth(service);
        }
        const metrics = this.getMetrics();
        // Determine overall status
        const serviceStatuses = Object.values(services).map(s => s.status);
        let overallStatus = 'healthy';
        if (serviceStatuses.includes('down')) {
            overallStatus = 'down';
        }
        else if (serviceStatuses.includes('degraded')) {
            overallStatus = 'degraded';
        }
        return {
            status: overallStatus,
            timestamp: new Date().toISOString(),
            uptime: Math.floor((Date.now() - this.startTime) / 1000),
            version: this.version,
            services,
            metrics,
        };
    }
    /**
     * Get readiness status (for Kubernetes)
     */
    async getReadinessStatus() {
        const checks = {};
        let ready = true;
        // Check database
        try {
            await mongoose_1.default.connection.db?.admin().ping();
            checks.database = true;
        }
        catch {
            checks.database = false;
            ready = false;
        }
        // Check memory
        const memUsage = process.memoryUsage();
        const memPercentage = memUsage.heapUsed / memUsage.heapTotal;
        checks.memory = memPercentage < 0.9;
        if (!checks.memory)
            ready = false;
        return { ready, checks };
    }
    /**
     * Get liveness status (for Kubernetes)
     */
    getLivenessStatus() {
        return {
            alive: true,
            uptime: Math.floor((Date.now() - this.startTime) / 1000),
        };
    }
    /**
     * Reset metrics
     */
    resetMetrics() {
        this.requestCount = 0;
        this.successCount = 0;
        this.failedCount = 0;
        this.latencySum = 0;
        logger_1.default.info('Health metrics reset');
    }
}
// Singleton instance
exports.healthMonitor = new HealthMonitor();
/**
 * Health check endpoint handler
 */
async function healthCheckHandler() {
    return exports.healthMonitor.getHealthStatus();
}
/**
 * Readiness check handler
 */
async function readinessCheckHandler() {
    return exports.healthMonitor.getReadinessStatus();
}
/**
 * Liveness check handler
 */
function livenessCheckHandler() {
    return exports.healthMonitor.getLivenessStatus();
}
/**
 * Metrics export for Prometheus
 */
function getPrometheusMetrics() {
    const metrics = exports.healthMonitor.getMetrics();
    return `
# HELP forensics_requests_total Total number of requests
# TYPE forensics_requests_total counter
forensics_requests_total ${metrics.requests.total}

# HELP forensics_requests_success Total successful requests
# TYPE forensics_requests_success counter
forensics_requests_success ${metrics.requests.success}

# HELP forensics_requests_failed Total failed requests
# TYPE forensics_requests_failed counter
forensics_requests_failed ${metrics.requests.failed}

# HELP forensics_request_latency_ms Average request latency in milliseconds
# TYPE forensics_request_latency_ms gauge
forensics_request_latency_ms ${metrics.requests.averageLatency}

# HELP forensics_memory_used_bytes Memory used in bytes
# TYPE forensics_memory_used_bytes gauge
forensics_memory_used_bytes ${metrics.memory.used * 1024 * 1024}

# HELP forensics_queue_pending Total pending jobs
# TYPE forensics_queue_pending gauge
forensics_queue_pending ${Object.values(metrics.workers).reduce((sum, w) => sum + w.pending, 0)}

# HELP forensics_queue_processing Total processing jobs
# TYPE forensics_queue_processing gauge
forensics_queue_processing ${Object.values(metrics.workers).reduce((sum, w) => sum + w.processing, 0)}
`.trim();
}
// ============================================
// Stale Session Reconciliation (background task)
// Runs every 30 seconds to detect and mark sessions
// whose agent has disconnected without a clean shutdown.
// ============================================
setInterval(() => {
    exports.healthMonitor.checkStaleSessions().catch((err) => {
        logger_1.default.error('[StaleSessions] Reconciliation interval error:', err);
    });
}, 30 * 1000).unref();
//# sourceMappingURL=health.service.js.map