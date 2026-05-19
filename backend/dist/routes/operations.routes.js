"use strict";
/**
 * Operations Routes
 * Health monitoring, metrics, and operational endpoints
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const health_service_1 = require("../services/health.service");
const queue_service_1 = require("../services/queue.service");
const tracing_middleware_1 = require("../middleware/tracing.middleware");
const middleware_1 = require("../middleware");
const router = (0, express_1.Router)();
/**
 * Public health endpoints (for load balancers and orchestration)
 */
// Basic health check
router.get('/health', async (req, res) => {
    try {
        const health = await (0, health_service_1.healthCheckHandler)();
        const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
        res.status(statusCode).json({
            success: true,
            data: health,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Health check failed',
            error: error.message,
        });
    }
});
// Kubernetes readiness probe
router.get('/ready', async (req, res) => {
    try {
        const readiness = await (0, health_service_1.readinessCheckHandler)();
        const statusCode = readiness.ready ? 200 : 503;
        res.status(statusCode).json({
            success: true,
            ...readiness,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Readiness check failed',
            ready: false,
            checks: {},
        });
    }
});
// Kubernetes liveness probe
router.get('/live', (req, res) => {
    const liveness = (0, health_service_1.livenessCheckHandler)();
    res.json({
        success: true,
        ...liveness,
    });
});
// Prometheus metrics endpoint
router.get('/metrics', (req, res) => {
    const format = req.query.format;
    if (format === 'prometheus') {
        res.set('Content-Type', 'text/plain');
        res.send((0, health_service_1.getPrometheusMetrics)());
    }
    else {
        res.json({
            success: true,
            data: health_service_1.healthMonitor.getMetrics(),
        });
    }
});
/**
 * Protected operational endpoints
 */
// Worker status (admin only)
router.get('/workers', middleware_1.authenticate, (0, middleware_1.authorize)('super_admin', 'admin'), (req, res) => {
    try {
        const stats = (0, queue_service_1.getWorkerStats)();
        res.json({
            success: true,
            data: stats,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch worker stats',
        });
    }
});
// Worker control (admin only)
router.post('/workers/:action', middleware_1.authenticate, (0, middleware_1.authorize)('super_admin', 'admin'), (req, res) => {
    const { action } = req.params;
    try {
        switch (action) {
            case 'start':
                (0, queue_service_1.startWorkers)();
                res.json({
                    success: true,
                    message: 'Workers started',
                });
                break;
            case 'stop':
                (0, queue_service_1.stopWorkers)();
                res.json({
                    success: true,
                    message: 'Workers stopped',
                });
                break;
            case 'restart':
                (0, queue_service_1.stopWorkers)();
                (0, queue_service_1.startWorkers)();
                res.json({
                    success: true,
                    message: 'Workers restarted',
                });
                break;
            default:
                res.status(400).json({
                    success: false,
                    message: 'Invalid action. Use: start, stop, or restart',
                });
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Worker control failed',
        });
    }
});
// Performance metrics (admin only)
router.get('/performance', middleware_1.authenticate, (0, middleware_1.authorize)('super_admin', 'admin'), (req, res) => {
    try {
        const metrics = (0, tracing_middleware_1.getPerformanceMetrics)();
        const avgDurations = {};
        const operations = [...new Set(metrics.map(m => m.operation))];
        for (const op of operations) {
            avgDurations[op] = (0, tracing_middleware_1.getAverageOperationDuration)(op);
        }
        res.json({
            success: true,
            data: {
                metrics,
                averages: avgDurations,
                summary: {
                    totalOperations: metrics.length,
                    operations,
                },
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch performance metrics',
        });
    }
});
// Service health details (admin only)
router.get('/services/:service', middleware_1.authenticate, (0, middleware_1.authorize)('super_admin', 'admin'), async (req, res) => {
    const { service } = req.params;
    try {
        const health = await health_service_1.healthMonitor.checkServiceHealth(service);
        res.json({
            success: true,
            data: health,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Service health check failed',
        });
    }
});
// Reset metrics (admin only)
router.post('/metrics/reset', middleware_1.authenticate, (0, middleware_1.authorize)('super_admin', 'admin'), (req, res) => {
    try {
        health_service_1.healthMonitor.resetMetrics();
        res.json({
            success: true,
            message: 'Metrics reset successfully',
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to reset metrics',
        });
    }
});
exports.default = router;
//# sourceMappingURL=operations.routes.js.map