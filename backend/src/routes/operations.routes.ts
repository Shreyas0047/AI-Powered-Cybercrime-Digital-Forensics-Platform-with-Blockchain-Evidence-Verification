/**
 * Operations Routes
 * Health monitoring, metrics, and operational endpoints
 */

import { Router } from 'express';
import { healthCheckHandler, readinessCheckHandler, livenessCheckHandler, getPrometheusMetrics, healthMonitor } from '../services/health.service';
import { getWorkerStats, stopWorkers, startWorkers } from '../services/queue.service';
import { getPerformanceMetrics, getAverageOperationDuration } from '../middleware/tracing.middleware';
import { authenticate, authorize } from '../middleware';

const router = Router();

/**
 * Public health endpoints (for load balancers and orchestration)
 */

// Basic health check
router.get('/health', async (req, res) => {
  try {
    const health = await healthCheckHandler();
    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
    res.status(statusCode).json({
      success: true,
      data: health,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: (error as Error).message,
    });
  }
});

// Kubernetes readiness probe
router.get('/ready', async (req, res) => {
  try {
    const readiness = await readinessCheckHandler();
    const statusCode = readiness.ready ? 200 : 503;
    res.status(statusCode).json({
      success: true,
      ...readiness,
    });
  } catch (error) {
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
  const liveness = livenessCheckHandler();
  res.json({
    success: true,
    ...liveness,
  });
});

// Prometheus metrics endpoint
router.get('/metrics', (req, res) => {
  const format = req.query.format as string;

  if (format === 'prometheus') {
    res.set('Content-Type', 'text/plain');
    res.send(getPrometheusMetrics());
  } else {
    res.json({
      success: true,
      data: healthMonitor.getMetrics(),
    });
  }
});

/**
 * Protected operational endpoints
 */

// Worker status (admin only)
router.get('/workers', authenticate, authorize('super_admin', 'admin'), (req, res) => {
  try {
    const stats = getWorkerStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch worker stats',
    });
  }
});

// Worker control (admin only)
router.post('/workers/:action', authenticate, authorize('super_admin', 'admin'), (req, res) => {
  const { action } = req.params;

  try {
    switch (action) {
      case 'start':
        startWorkers();
        res.json({
          success: true,
          message: 'Workers started',
        });
        break;
      case 'stop':
        stopWorkers();
        res.json({
          success: true,
          message: 'Workers stopped',
        });
        break;
      case 'restart':
        stopWorkers();
        startWorkers();
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
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Worker control failed',
    });
  }
});

// Performance metrics (admin only)
router.get('/performance', authenticate, authorize('super_admin', 'admin'), (req, res) => {
  try {
    const metrics = getPerformanceMetrics();
    const avgDurations: Record<string, number> = {};

    const operations = [...new Set(metrics.map(m => m.operation))];
    for (const op of operations) {
      avgDurations[op] = getAverageOperationDuration(op);
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
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch performance metrics',
    });
  }
});

// Service health details (admin only)
router.get('/services/:service', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  const { service } = req.params;

  try {
    const health = await healthMonitor.checkServiceHealth(service);
    res.json({
      success: true,
      data: health,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Service health check failed',
    });
  }
});

// Reset metrics (admin only)
router.post('/metrics/reset', authenticate, authorize('super_admin', 'admin'), (req, res) => {
  try {
    healthMonitor.resetMetrics();
    res.json({
      success: true,
      message: 'Metrics reset successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to reset metrics',
    });
  }
});

export default router;