/**
 * Sandbox Controller
 * Handles sandbox synchronization and runtime control endpoints
 */

import { Response } from 'express';
import { sandboxSyncService, sandboxRuntimeService } from '../services';
import { AuthenticatedRequest } from '../middleware';
import { ApiResponse } from '../types';

export class SandboxController {
  /**
   * GET /api/v1/sandbox/health
   * Get sandbox runtime health status
   */
  async getHealth(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const health = await sandboxRuntimeService.getHealth();

      const response: ApiResponse = {
        success: true,
        message: 'Sandbox runtime health retrieved',
        data: { health },
      };

      res.json(response);
    } catch (error: any) {
      const response: ApiResponse = {
        success: false,
        message: error.message || 'Failed to get sandbox health',
        data: { status: 'unavailable' },
      };
      res.status(503).json(response);
    }
  }

  /**
   * GET /api/v1/sandbox/simulators
   * List available simulators
   */
  async listSimulators(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const simulators = await sandboxRuntimeService.listSimulators();

      const response: ApiResponse = {
        success: true,
        message: 'Simulators retrieved',
        data: { simulators },
      };

      res.json(response);
    } catch (error: any) {
      const response: ApiResponse = {
        success: false,
        message: error.message || 'Failed to list simulators',
        data: { simulators: [] },
      };
      res.status(503).json(response);
    }
  }

  /**
   * POST /api/v1/sandbox/sessions
   * Start a new sandbox session (runtime-controlled)
   */
  async startSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { simulator_id, auto_rollback = true, timeout_seconds = 300 } = req.body;

      if (!simulator_id) {
        res.status(400).json({
          success: false,
          message: 'simulator_id is required',
        });
        return;
      }

      const runtimeSession = await sandboxRuntimeService.startSession({
        simulator_id,
        auto_rollback,
        timeout_seconds,
      });

      await sandboxSyncService.receiveSessionStart({
        sessionId: runtimeSession.session_id,
        vmName: 'sandbox-vm',
        simulatorId: runtimeSession.simulator_id,
        simulatorName: runtimeSession.simulator_id,
        startTime: runtimeSession.created_at,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Session started',
        data: { session: runtimeSession },
      };

      res.status(201).json(response);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to start session',
      });
    }
  }

  /**
   * GET /api/v1/sessions
   * List all sessions (from MongoDB)
   */
  async findAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { page = 1, limit = 20, status } = req.query as Record<string, any>;

    const result = await sandboxSyncService.findAll({
      page: Number(page),
      limit: Math.min(Number(limit), 100),
      status,
    });

    const response: ApiResponse = {
      success: true,
      message: 'Sessions retrieved',
      data: result.sessions,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total: result.total,
        totalPages: result.totalPages,
      },
    };

    res.json(response);
  }

  /**
   * GET /api/v1/sandbox/sessions/:sessionId
   * Get session by ID
   */
  async findById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const session = await sandboxSyncService.findById(req.params.sessionId);

    const response: ApiResponse = {
      success: true,
      message: 'Session retrieved',
      data: { session },
    };

    res.json(response);
  }

  /**
   * POST /api/v1/sandbox/sessions/:sessionId/stop
   * Stop an active session
   */
  async stopSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const runtimeSession = await sandboxRuntimeService.stopSession(req.params.sessionId);

      await sandboxSyncService.receiveSessionComplete({
        sessionId: runtimeSession.session_id,
        status: 'failed' as any,
        endTime: runtimeSession.updated_at,
        exitCode: -1,
        errors: [runtimeSession.error || 'Session stopped by user'],
      });

      const response: ApiResponse = {
        success: true,
        message: 'Session stopped',
        data: { session: runtimeSession },
      };

      res.json(response);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to stop session',
      });
    }
  }

  /**
   * POST /api/v1/sandbox/sessions/:sessionId/terminate
   * Force terminate an active session with rollback
   */
  async terminateSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const runtimeSession = await sandboxRuntimeService.terminateSession(req.params.sessionId);

      await sandboxSyncService.receiveSessionComplete({
        sessionId: runtimeSession.session_id,
        status: 'failed' as any,
        endTime: runtimeSession.updated_at,
        exitCode: -1,
        errors: [runtimeSession.error || 'Session terminated by user'],
      });

      const response: ApiResponse = {
        success: true,
        message: 'Session terminated',
        data: { session: runtimeSession },
      };

      res.json(response);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to terminate session',
      });
    }
  }

  /**
   * GET /api/v1/sandbox/stats
   * Get sandbox statistics
   */
  async getStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    const stats = await sandboxSyncService.getStats();

    const response: ApiResponse = {
      success: true,
      message: 'Statistics retrieved',
      data: { stats },
    };

    res.json(response);
  }

  /**
   * GET /api/v1/sandbox/telemetry-url
   * Get WebSocket URL for telemetry streaming
   */
  async getTelemetryUrl(req: AuthenticatedRequest, res: Response): Promise<void> {
    const url = sandboxRuntimeService.getTelemetryUrl();

    const response: ApiResponse = {
      success: true,
      message: 'Telemetry URL retrieved',
      data: { url },
    };

    res.json(response);
  }

  /**
   * POST /api/v1/sandbox/vm/reset
   * Reset VM to clean snapshot
   */
  async resetVm(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const result = await sandboxRuntimeService.resetVm();

      const response: ApiResponse = {
        success: true,
        message: 'VM reset',
        data: result,
      };

      res.json(response);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to reset VM',
      });
    }
  }

  /**
   * GET /api/v1/sandbox/vm/status
   * Get VM status
   */
  async getVmStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const status = await sandboxRuntimeService.getVmStatus();

      const response: ApiResponse = {
        success: true,
        message: 'VM status retrieved',
        data: { status },
      };

      res.json(response);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get VM status',
      });
    }
  }

  /**
   * GET /api/v1/sandbox/monitoring/status
   * Get monitoring status
   */
  async getMonitoringStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const status = await sandboxRuntimeService.getMonitoringStatus();

      const response: ApiResponse = {
        success: true,
        message: 'Monitoring status retrieved',
        data: { status },
      };

      res.json(response);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get monitoring status',
      });
    }
  }

  /**
   * GET /api/v1/sandbox/execution/status
   * Get execution status
   */
  async getExecutionStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const status = await sandboxRuntimeService.getExecutionStatus();

      const response: ApiResponse = {
        success: true,
        message: 'Execution status retrieved',
        data: { status },
      };

      res.json(response);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get execution status',
      });
    }
  }

  /**
   * GET /api/v1/sandbox/logs
   * Get runtime logs
   */
  async getLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { limit = 100, level } = req.query as Record<string, any>;
      const logs = await sandboxRuntimeService.getLogs(
        Number(limit) || 100,
        level as string
      );

      const response: ApiResponse = {
        success: true,
        message: 'Logs retrieved',
        data: logs,
      };

      res.json(response);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get logs',
      });
    }
  }

  /**
   * POST /api/v1/sandbox/runtime/start
   * Start the sandbox runtime service
   */
  async startRuntime(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { spawn } = await import('child_process');
    const { join } = await import('path');
    const fs = await import('fs');

    const possiblePaths = [
      process.env.SANDBOX_RUNTIME_PATH,
      join(process.cwd(), 'sandbox-agent', 'src', 'forensics_sandbox_agent', 'infrastructure', 'runtime_api.py'),
    ].filter(Boolean);

    let runtimePath: string | undefined;
    for (const path of possiblePaths) {
      if (path && fs.existsSync(path.replace(/\\/g, '\\\\').replace(/\//g, '\\'))) {
        runtimePath = path;
        break;
      }
    }

    if (!runtimePath) {
      const defaultPath = 'C:\\Users\\shreyas\\Desktop\\cybersec projects\\gowda virus project\\sandbox-agent\\src\\forensics_sandbox_agent\\infrastructure\\runtime_api.py';
      if (fs.existsSync(defaultPath)) {
        runtimePath = defaultPath;
      }
    }

    if (!runtimePath) {
      res.status(404).json({
        success: false,
        message: 'Sandbox runtime not found',
      });
      return;
    }

    try {
      const isWindows = process.platform === 'win32';
      if (isWindows) {
        const pythonCmd = 'python';
        spawn(pythonCmd, [runtimePath], {
          detached: true,
          stdio: 'ignore',
          shell: false,
        });
      } else {
        spawn('python3', [runtimePath], {
          detached: true,
          stdio: 'ignore',
        });
      }

      res.json({
        success: true,
        message: 'Sandbox runtime started',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to start sandbox runtime',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/v1/sandbox/sessions/start
   * Legacy: Receive session start event from desktop agent
   */
  async receiveSessionStart(req: AuthenticatedRequest, res: Response): Promise<void> {
    const session = await sandboxSyncService.receiveSessionStart(req.body);

    const response: ApiResponse = {
      success: true,
      message: 'Session started',
      data: { session },
    };

    res.status(201).json(response);
  }

  /**
   * POST /api/v1/sandbox/sessions/:sessionId/complete
   * Legacy: Receive session completion event
   */
  async receiveSessionComplete(req: AuthenticatedRequest, res: Response): Promise<void> {
    const session = await sandboxSyncService.receiveSessionComplete({
      ...req.body,
      sessionId: req.params.sessionId,
    });

    const response: ApiResponse = {
      success: true,
      message: 'Session completed',
      data: { session },
    };

    res.json(response);
  }

  /**
   * POST /api/v1/sandbox/sessions/:sessionId/events
   * Legacy: Receive forensic events from sandbox
   */
  async receiveEvents(req: AuthenticatedRequest, res: Response): Promise<void> {
    const result = await sandboxSyncService.receiveForensicEvents({
      ...req.body,
      sessionId: req.params.sessionId,
    });

    const response: ApiResponse = {
      success: true,
      message: 'Events received',
      data: result,
    };

    res.json(response);
  }

  /**
   * POST /api/v1/sandbox/launch-agent
   * Legacy: Launch the desktop sandbox agent application
   */
  async launchAgent(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { spawn } = await import('child_process');
    const fs = await import('fs');

    const possiblePaths = [
      process.env.SANDBOX_AGENT_PATH,
      'C:\\Users\\shreyas\\Desktop\\cybersec projects\\gowda virus project\\dist\\sandbox-agent\\ForensicsSandboxAgent.exe',
      'C:\\Users\\shreyas\\Desktop\\cybersec projects\\gowda virus project\\dist\\sandbox-agent\\ForensicsSandboxAgent.exe',
    ].filter(Boolean);

    let agentPath: string | undefined;
    let foundPath = false;

    for (const path of possiblePaths) {
      if (path && fs.existsSync(path)) {
        agentPath = path;
        foundPath = true;
        break;
      }
    }

    if (!foundPath || !agentPath) {
      console.error('Sandbox agent not found. Searched paths:', possiblePaths);
      res.status(404).json({
        success: false,
        message: 'Sandbox agent not found. Please build the agent first using: python build.py agent',
        searchedPaths: possiblePaths,
      });
      return;
    }

    console.log('Launching sandbox agent from:', agentPath);

    try {
      const isWindows = process.platform === 'win32';

      if (isWindows) {
        const psCommand = `Start-Process -FilePath "${agentPath.replace(/\\/g, '\\\\')}" -WindowStyle Normal`;
        spawn('powershell', ['-Command', psCommand], {
          detached: true,
          stdio: 'ignore',
          shell: false,
          windowsHide: false
        });
      } else {
        spawn(agentPath, [], {
          detached: true,
          stdio: 'ignore'
        });
      }

      res.json({
        success: true,
        message: 'Sandbox agent launched',
        data: { agentPath },
      });
    } catch (error) {
      console.error('Failed to launch sandbox agent:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to launch sandbox agent',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export const sandboxController = new SandboxController();
export default sandboxController;