/**
 * Operations Controller
 * Health monitoring, metrics, and operational endpoints
 */

import { Router, Request, Response } from 'express';
import { authMiddleware, roleMiddleware } from '../middleware';
import {
  healthCheckHandler,
  readinessCheckHandler,
  livenessCheckHandler,
  getPrometheusMetrics,
  healthMonitor,
} from '../services/health.service';
import { getWorkerStats, stopWorkers, startWorkers } from '../services/queue.service';
import { getPerformanceMetrics, getAverageOperationDuration } from '../middleware/tracing.middleware';
const router = Router();

// Health check endpoint
router.get('/health', async (req: Request, res: Response) => {
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

// Readiness check (Kubernetes)
router.get('/ready', async (req: Request, res: Response) => {
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

// Liveness check (Kubernetes)
router.get('/live', (req: Request, res: Response) => {
  const liveness = livenessCheckHandler();
  res.json({
    success: true,
    ...liveness,
  });
});

// Metrics endpoint
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const format = req.query.format === 'prometheus' ? 'prometheus' : 'json';
    if (format === 'prometheus') {
      res.set('Content-Type', 'text/plain');
      res.send(getPrometheusMetrics());
    } else {
      const health = await healthCheckHandler();
      res.json({
        success: true,
        data: health.metrics,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch metrics',
    });
  }
});

// Worker status
router.get('/workers', authMiddleware, roleMiddleware(['super_admin', 'admin']), (req: Request, res: Response) => {
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

// Worker control
router.post('/workers/:action', authMiddleware, roleMiddleware(['super_admin', 'admin']), (req: Request, res: Response) => {
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

// Performance metrics
router.get('/performance', authMiddleware, roleMiddleware(['super_admin', 'admin']), (req: Request, res: Response) => {
  try {
    const metrics = getPerformanceMetrics();
    const avgDurations: Record<string, number> = {};

    // Get average duration for each operation
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

// Service health details
router.get('/services/:service', authMiddleware, roleMiddleware(['super_admin', 'admin']), async (req: Request, res: Response) => {
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

// Reset metrics
router.post('/metrics/reset', authMiddleware, roleMiddleware(['super_admin', 'admin']), (req: Request, res: Response) => {
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
