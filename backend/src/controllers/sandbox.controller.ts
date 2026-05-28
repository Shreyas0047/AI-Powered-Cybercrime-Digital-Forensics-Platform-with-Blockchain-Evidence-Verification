/**
 * Sandbox Controller
 * Handles sandbox synchronization and runtime control endpoints
 */

import { Response } from 'express';
import logger from '../config/logger';
import { sandboxSyncService, sandboxRuntimeService } from '../services';
import { AuthenticatedRequest } from '../middleware';
import { ApiResponse, SandboxSessionStatus } from '../types';
import { websocketService } from '../services/websocket.service';

/**
 * Simulator display-name mapping.
 *
 * SOURCE OF TRUTH: `sandbox-agent/.../domain/simulator_mapping.py`
 * (SIMULATOR_REGISTRY).  Keep the two files in sync when adding/renaming
 * simulators.  In the future this should be served from a GET /simulators
 * endpoint exposed by the sandbox agent runtime.
 */
const SIMULATOR_DISPLAY_NAMES: Record<string, string> = {
  'system_service_1': 'Sample Alpha',
  'system_service_2': 'Sample Beta',
  'system_service_3': 'Sample Gamma',
  'system_service_4': 'Sample Delta',
  'system_service_5': 'Sample Epsilon',
  'ransomware-simulator': 'Sample Alpha',
  'spyware-simulator': 'Sample Beta',
  'trojan-simulator': 'Sample Gamma',
  'botnet-simulator': 'Sample Delta',
  'credential-stealer': 'Sample Epsilon',
};

function formatSimulatorName(simulatorId: string): string {
  return SIMULATOR_DISPLAY_NAMES[simulatorId] || simulatorId;
}

let runtimeStarting = false;

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
        simulatorName: formatSimulatorName(runtimeSession.simulator_id),
        startTime: runtimeSession.created_at,
      });

      sandboxRuntimeService.monitorSessionCompletion(
        runtimeSession.session_id,
        async (completedSession) => {
          try {
            const stateMap: Record<string, SandboxSessionStatus> = {
              'COMPLETED': SandboxSessionStatus.COMPLETED,
              'FAILED': SandboxSessionStatus.FAILED,
            };
            const status = stateMap[completedSession.state.toUpperCase()] || SandboxSessionStatus.FAILED;

            await sandboxSyncService.receiveSessionComplete({
              sessionId: completedSession.session_id,
              status,
              endTime: completedSession.updated_at,
            });

            try {
              const eventsData = await sandboxRuntimeService.getSessionEvents(completedSession.session_id);
              if (eventsData.events && eventsData.events.length > 0) {
                await sandboxSyncService.receiveForensicEvents({
                  sessionId: completedSession.session_id,
                  events: eventsData.events,
                });
                logger.info(`Forwarded ${eventsData.events.length} forensic events for session ${completedSession.session_id}`);
              }
            } catch (eventsErr) {
              logger.warn(`Failed to forward events for session ${completedSession.session_id}:`, eventsErr);
            }
          } catch (err) {
            logger.error(`Failed to record session completion for ${runtimeSession.session_id}:`, err);
          }
        },
      );

      websocketService.emitSandboxSessionUpdate(runtimeSession.session_id, runtimeSession);

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

      websocketService.emitSandboxSessionUpdate(runtimeSession.session_id, runtimeSession);

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

      websocketService.emitSandboxSessionUpdate(runtimeSession.session_id, runtimeSession);

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
   * GET /api/v1/sandbox/logs-url
   * Get WebSocket URL for system log streaming
   */
  async getLogsUrl(req: AuthenticatedRequest, res: Response): Promise<void> {
    const url = sandboxRuntimeService.getLogsUrl();

    const response: ApiResponse = {
      success: true,
      message: 'System logs URL retrieved',
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
    if (runtimeStarting) {
      res.status(409).json({
        success: false,
        message: 'Runtime is already starting. Please wait.',
      });
      return;
    }

    try {
      const isRunning = await sandboxRuntimeService.isAvailable();
      if (isRunning) {
        res.json({
          success: true,
          message: 'Sandbox runtime is already running',
        });
        return;
      }
    } catch {
      // Runtime not available, proceed to start
    }

    const { spawn, exec } = await import('child_process');
    const { join, dirname } = await import('path');
    const fs = await import('fs');
    const util = await import('util');
    const execPromise = util.promisify(exec);

    // Resolve project root: if SANDBOX_PROJECT_ROOT is set use it,
    // else walk up from cwd to find the directory containing 'sandbox-agent'
    let projectRoot = process.env.SANDBOX_PROJECT_ROOT || process.cwd();
    if (!fs.existsSync(join(projectRoot, 'sandbox-agent'))) {
      // Walk up directories looking for the sandbox-agent folder
      let candidate = process.cwd();
      for (let i = 0; i < 5; i++) {
        if (fs.existsSync(join(candidate, 'sandbox-agent'))) {
          projectRoot = candidate;
          break;
        }
        const parent = dirname(candidate);
        if (parent === candidate) break;
        candidate = parent;
      }
    }
    const runtimeFilePath = join(projectRoot, 'sandbox-agent', 'src', 'forensics_sandbox_agent', 'infrastructure', 'runtime_api.py');

    if (!fs.existsSync(runtimeFilePath)) {
      res.status(404).json({
        success: false,
        message: `Runtime script not found at: ${runtimeFilePath}`,
      });
      return;
    }

    let pythonPath: string | null = null;

    const pythonCandidates = [
      process.env.PYTHON_PATH,
      'python',
      'python3',
      'py',
    ].filter(Boolean) as string[];

    for (const candidate of pythonCandidates) {
      if (!candidate) continue;
      if (candidate.includes('\\') || candidate.includes('/')) {
        if (fs.existsSync(candidate)) {
          pythonPath = candidate;
          break;
        }
      } else {
        try {
          const { stdout } = await execPromise(`where ${candidate}`, { windowsHide: true });
          const paths = stdout.trim().split('\r\n').filter(p => p.toLowerCase().endsWith('.exe'));
          if (paths.length > 0) {
            pythonPath = paths[0];
            break;
          }
        } catch {
          continue;
        }
      }
    }

    if (!pythonPath) {
      res.status(500).json({
        success: false,
        message: 'Python not found. Install Python 3.11+ and add to PATH, or set PYTHON_PATH environment variable.',
        searched: pythonCandidates.filter(Boolean),
      });
      return;
    }

    try {
      runtimeStarting = true;
      const logDir = join(projectRoot, 'sandbox-agent');
      const logFile = join(logDir, 'runtime.log');

      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      try {
        const { stdout: netstatOut } = await execPromise('netstat -ano | findstr :8765', { windowsHide: true });
        const lines = netstatOut.trim().split('\n').filter(l => l.includes('LISTENING'));
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && pid !== '0') {
            try {
              await execPromise(`taskkill /F /PID ${pid}`, { windowsHide: true });
            } catch { /* process may already be dead */ }
          }
        }
      } catch { /* tasklist failed — port may not be in use */ }

      // Open log file as file descriptor so child can write to it independently of parent
      const logFd = fs.openSync(logFile, 'a');

      const child = spawn(pythonPath, [
        '-u', runtimeFilePath,
        '--port', '8765',
      ], {
        detached: true,
        stdio: ['ignore', logFd, logFd],
        cwd: join(projectRoot, 'sandbox-agent', 'src'),
        env: { ...process.env, PYTHONPATH: join(projectRoot, 'sandbox-agent', 'src') },
        windowsHide: true,
      });

      // Close parent's fd; child has its own copy now
      fs.closeSync(logFd);

      child.unref();

      child.on('error', (err) => {
        runtimeStarting = false;
        logger.error(`[Sandbox] Runtime spawn error: ${err.message}`);
      });

      child.on('exit', (code) => {
        runtimeStarting = false;
        logger.info(`[Sandbox] Runtime exited with code ${code}`);
      });

      setTimeout(() => {
        runtimeStarting = false;
      }, 10000);

      res.json({
        success: true,
        message: 'Sandbox runtime starting on port 8765...',
        logFile,
        pythonPath,
      });
    } catch (error) {
      runtimeStarting = false;
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

    const { join, dirname } = await import('path');
    // Resolve project root same as runtime/start
    let projectRoot = process.env.SANDBOX_PROJECT_ROOT || process.cwd();
    if (!fs.existsSync(join(projectRoot, 'sandbox-agent'))) {
      let candidate = process.cwd();
      for (let i = 0; i < 5; i++) {
        if (fs.existsSync(join(candidate, 'sandbox-agent'))) {
          projectRoot = candidate;
          break;
        }
        const parent = dirname(candidate);
        if (parent === candidate) break;
        candidate = parent;
      }
    }
    const possiblePaths = [
      process.env.SANDBOX_AGENT_PATH,
      join(projectRoot, 'dist', 'sandbox-agent', 'ForensicsSandboxAgent.exe'),
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
      logger.error('Sandbox agent not found. Searched paths:', possiblePaths);
      res.status(404).json({
        success: false,
        message: 'Sandbox agent not found. Please build the agent first using: python build.py agent',
        searchedPaths: possiblePaths,
      });
      return;
    }

    logger.info('Launching sandbox agent from:', agentPath);

    try {
      const isWindows = process.platform === 'win32';

      if (isWindows) {
        // Spawn the EXE directly — no PowerShell wrapper (avoids console flash)
        spawn(agentPath, [], {
          detached: true,
          stdio: 'ignore',
          shell: false,
          windowsHide: false,
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
      logger.error('Failed to launch sandbox agent:', error);
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
