"use strict";
/**
 * Operations Controller
 * Health monitoring, metrics, and operational endpoints
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const middleware_1 = require("../middleware");
const health_service_1 = require("../services/health.service");
const queue_service_1 = require("../services/queue.service");
const tracing_middleware_1 = require("../middleware/tracing.middleware");
const router = (0, express_1.Router)();
// Health check endpoint
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
// Readiness check (Kubernetes)
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
// Liveness check (Kubernetes)
router.get('/live', (req, res) => {
    const liveness = (0, health_service_1.livenessCheckHandler)();
    res.json({
        success: true,
        ...liveness,
    });
});
// Metrics endpoint
router.get('/metrics', async (req, res) => {
    try {
        const format = req.query.format === 'prometheus' ? 'prometheus' : 'json';
        if (format === 'prometheus') {
            res.set('Content-Type', 'text/plain');
            res.send((0, health_service_1.getPrometheusMetrics)());
        }
        else {
            const health = await (0, health_service_1.healthCheckHandler)();
            res.json({
                success: true,
                data: health.metrics,
            });
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch metrics',
        });
    }
});
// Worker status
router.get('/workers', middleware_1.authMiddleware, (0, middleware_1.roleMiddleware)(['super_admin', 'admin']), (req, res) => {
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
// Worker control
router.post('/workers/:action', middleware_1.authMiddleware, (0, middleware_1.roleMiddleware)(['super_admin', 'admin']), (req, res) => {
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
// Performance metrics
router.get('/performance', middleware_1.authMiddleware, (0, middleware_1.roleMiddleware)(['super_admin', 'admin']), (req, res) => {
    try {
        const metrics = (0, tracing_middleware_1.getPerformanceMetrics)();
        const avgDurations = {};
        // Get average duration for each operation
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
// Service health details
router.get('/services/:service', middleware_1.authMiddleware, (0, middleware_1.roleMiddleware)(['super_admin', 'admin']), async (req, res) => {
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
// Reset metrics
router.post('/metrics/reset', middleware_1.authMiddleware, (0, middleware_1.roleMiddleware)(['super_admin', 'admin']), (req, res) => {
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
//# sourceMappingURL=operations.controller.js.map