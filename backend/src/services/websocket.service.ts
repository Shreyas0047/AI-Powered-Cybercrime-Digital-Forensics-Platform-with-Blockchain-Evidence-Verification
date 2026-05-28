/**
 * Real-Time WebSocket Service
 * Enterprise-grade WebSocket infrastructure for forensic telemetry streaming
 */

import { Server as SocketIOServer, Socket, Namespace } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import logger from '../config/logger';

type UserRole = 'super_admin' | 'admin' | 'forensic_analyst' | 'security_reviewer' | 'sandbox_operator' | 'auditor';

// Event Types
export enum SocketEvent {
  // Connection Events
  CONNECT = 'connection',
  DISCONNECT = 'disconnect',
  AUTHENTICATE = 'authenticate',
  AUTH_SUCCESS = 'auth_success',
  AUTH_FAILURE = 'auth_failure',

  // Telemetry Events
  TELEMETRY_EVENT = 'telemetry:event',
  TELEMETRY_BATCH = 'telemetry:batch',
  TELEMETRY_STREAM_START = 'telemetry:stream_start',
  TELEMETRY_STREAM_STOP = 'telemetry:stream_stop',

  // Investigation Events
  INVESTIGATION_UPDATE = 'investigation:update',
  INVESTIGATION_CREATE = 'investigation:create',
  INVESTIGATION_STATUS_CHANGE = 'investigation:status_change',
  EVIDENCE_UPDATE = 'evidence:update',
  EVIDENCE_UPLOAD = 'evidence:upload',
  ALERT_NEW = 'alert:new',
  ALERT_UPDATE = 'alert:update',
  ALERT_ESCALATE = 'alert:escalate',

  // Sandbox Events
  SANDBOX_SESSION_START = 'sandbox:session_start',
  SANDBOX_SESSION_END = 'sandbox:session_end',
  SANDBOX_SESSION_UPDATE = 'sandbox:session_update',
  SANDBOX_TELEMETRY = 'sandbox:telemetry',
  SANDBOX_ERROR = 'sandbox:error',
  SANDBOX_ROLLBACK = 'sandbox:rollback',

  // AI Analysis Events
  AI_ANALYSIS_START = 'ai:analysis_start',
  AI_ANALYSIS_COMPLETE = 'ai:analysis_complete',
  AI_ANALYSIS_UPDATE = 'ai:analysis_update',
  AI_ANOMALY_DETECTED = 'ai:anomaly_detected',
  AI_THREAT_CLASSIFICATION = 'ai:threat_classification',

  // Dashboard Events
  DASHBOARD_STATS_UPDATE = 'dashboard:stats_update',
  DASHBOARD_ALERT_COUNT = 'dashboard:alert_count',

  // System Events
  SYSTEM_NOTIFICATION = 'system:notification',
  PING = 'ping',
  PONG = 'pong',
}

// Channel Namespaces
export const SocketNamespace = {
  TELEMETRY: '/telemetry',
  INVESTIGATIONS: '/investigations',
  SANDBOX: '/sandbox',
  ALERTS: '/alerts',
  DASHBOARD: '/dashboard',
  AI: '/ai',
};

// Connection manager
interface ConnectionInfo {
  socketId: string;
  userId: string | null;
  role: UserRole | null;
  rooms: Set<string>;
  connectedAt: Date;
  lastActivity: Date;
  authenticated: boolean;
}

class WebSocketService {
  private io: SocketIOServer | null = null;
  private connections: Map<string, ConnectionInfo> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private eventLog: Array<{
    timestamp: string;
    event: string;
    socketId: string;
    data?: unknown;
  }> = [];

  // Initialize Socket.IO server
  initialize(httpServer: HTTPServer): void {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: config.security.corsOrigin,
        credentials: true,
        methods: ['GET', 'POST'],
      },
      pingInterval: 25000,
      pingTimeout: 20000,
      maxHttpBufferSize: 1e6, // 1MB
      transports: ['websocket', 'polling'],
    });

    this.setupEventHandlers();
    this.startHeartbeat();
    logger.info('WebSocket service initialized');
  }

  // Setup event handlers
  private setupEventHandlers(): void {
    if (!this.io) return;

    // Authentication middleware
    this.io.use((socket, next) => {
      this.handleAuthentication(socket, next);
    });

    // Connection handler
    this.io.on(SocketEvent.CONNECT, (socket: Socket) => {
      this.handleConnection(socket);
    });
  }

  // Handle socket authentication
  private handleAuthentication(socket: Socket, next: (err?: Error) => void): void {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      // Allow unauthenticated connections for public channels
      // They will be limited to read-only public events
      return next();
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret) as {
        userId: string;
        role: UserRole;
        email: string;
      };

      const connectionInfo: ConnectionInfo = {
        socketId: socket.id,
        userId: decoded.userId,
        role: decoded.role,
        rooms: new Set(),
        connectedAt: new Date(),
        lastActivity: new Date(),
        authenticated: true,
      };

      this.connections.set(socket.id, connectionInfo);

      // Join role-based room
      socket.join(`role:${decoded.role}`);

      // Emit auth success
      socket.emit(SocketEvent.AUTH_SUCCESS, {
        userId: decoded.userId,
        role: decoded.role,
      });

      logger.info(`Socket authenticated: ${socket.id} - User: ${decoded.email} - Role: ${decoded.role}`);
      next();
    } catch (error) {
      logger.warn(`Socket authentication failed: ${socket.id}`);
      socket.emit(SocketEvent.AUTH_FAILURE, { message: 'Invalid token' });
      next(new Error('Authentication failed'));
    }
  }

  // Handle new connection
  private handleConnection(socket: Socket): void {
    const existingConnection = this.connections.get(socket.id);

    if (!existingConnection) {
      // Unauthenticated connection
      const connectionInfo: ConnectionInfo = {
        socketId: socket.id,
        userId: null,
        role: null,
        rooms: new Set(),
        connectedAt: new Date(),
        lastActivity: new Date(),
        authenticated: false,
      };
      this.connections.set(socket.id, connectionInfo);
    }

    logger.info(`Socket connected: ${socket.id} - Total connections: ${this.connections.size}`);

    // Setup event listeners
    this.setupSocketEventListeners(socket);

    // Log connection event
    this.logEvent(SocketEvent.CONNECT, socket.id, { totalConnections: this.connections.size });
  }

  // Setup socket event listeners
  private setupSocketEventListeners(socket: Socket): void {
    // Ping/Pong for connection health
    socket.on(SocketEvent.PING, () => {
      socket.emit(SocketEvent.PONG, { timestamp: Date.now() });
      this.updateLastActivity(socket.id);
    });

    // Subscribe to investigation updates
    socket.on('subscribe:investigation', (investigationId: string) => {
      const connection = this.connections.get(socket.id);
      if (connection && this.canAccessInvestigation(connection.role, investigationId)) {
        socket.join(`investigation:${investigationId}`);
        connection.rooms.add(`investigation:${investigationId}`);
        logger.debug(`Socket ${socket.id} subscribed to investigation ${investigationId}`);
      }
    });

    // Unsubscribe from investigation updates
    socket.on('unsubscribe:investigation', (investigationId: string) => {
      const connection = this.connections.get(socket.id);
      if (connection) {
        socket.leave(`investigation:${investigationId}`);
        connection.rooms.delete(`investigation:${investigationId}`);
      }
    });

    // Subscribe to sandbox updates
    socket.on('subscribe:sandbox', (sessionId: string) => {
      const connection = this.connections.get(socket.id);
      if (connection && this.canAccessSandbox(connection.role)) {
        socket.join(`sandbox:${sessionId}`);
        connection.rooms.add(`sandbox:${sessionId}`);
      }
    });

    // Unsubscribe from sandbox updates
    socket.on('unsubscribe:sandbox', (sessionId: string) => {
      const connection = this.connections.get(socket.id);
      if (connection) {
        socket.leave(`sandbox:${sessionId}`);
        connection.rooms.delete(`sandbox:${sessionId}`);
      }
    });

    // Handle disconnect
    socket.on(SocketEvent.DISCONNECT, (reason: string) => {
      this.handleDisconnect(socket, reason);
    });

    // Handle errors
    socket.on('error', (error: Error) => {
      logger.error(`Socket error: ${socket.id}`, error);
    });
  }

  // Handle disconnection
  private handleDisconnect(socket: Socket, reason: string): void {
    const connection = this.connections.get(socket.id);
    if (connection) {
      // Leave all rooms except the default room
      for (const room of socket.rooms) {
        if (room !== socket.id) {
          socket.leave(room);
        }
      }
      this.connections.delete(socket.id);
      logger.info(`Socket disconnected: ${socket.id} - Reason: ${reason} - User: ${connection.userId}`);
      this.logEvent(SocketEvent.DISCONNECT, socket.id, { reason, userId: connection.userId });
    }
  }

  // Check if user can access investigation based on role
  private canAccessInvestigation(role: UserRole | null, investigationId: string): boolean {
    // All authenticated users can access investigations
    return !!role;
  }

  // Check if user can access sandbox based on role
  private canAccessSandbox(role: UserRole | null): boolean {
    const allowedRoles: UserRole[] = ['super_admin', 'admin', 'forensic_analyst', 'sandbox_operator'];
    return role ? allowedRoles.includes(role) : false;
  }

  // Update last activity timestamp
  private updateLastActivity(socketId: string): void {
    const connection = this.connections.get(socketId);
    if (connection) {
      connection.lastActivity = new Date();
    }
  }

  // Start heartbeat to monitor connections
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.cleanupStaleConnections();
    }, 60000); // Every minute
  }

  // Clean up stale connections
  private cleanupStaleConnections(): void {
    const staleThreshold = 5 * 60 * 1000; // 5 minutes
    const now = Date.now();

    for (const [socketId, connection] of this.connections.entries()) {
      const inactiveTime = now - connection.lastActivity.getTime();
      if (inactiveTime > staleThreshold) {
        logger.info(`Removing stale connection: ${socketId}`);
        this.connections.delete(socketId);
      }
    }
  }

  // Log events for traceability
  private logEvent(event: string, socketId: string, data?: unknown): void {
    this.eventLog.push({
      timestamp: new Date().toISOString(),
      event,
      socketId,
      data,
    });

    // Keep only last 1000 events
    if (this.eventLog.length > 1000) {
      this.eventLog = this.eventLog.slice(-1000);
    }
  }

  // Get event logs
  getEventLogs(limit: number = 100): typeof this.eventLog {
    return this.eventLog.slice(-limit);
  }

  // Get connection stats
  getConnectionStats(): {
    total: number;
    authenticated: number;
    byRole: Record<string, number>;
  } {
    const stats = {
      total: this.connections.size,
      authenticated: 0,
      byRole: {} as Record<string, number>,
    };

    for (const connection of this.connections.values()) {
      if (connection.authenticated) {
        stats.authenticated++;
        if (connection.role) {
          stats.byRole[connection.role] = (stats.byRole[connection.role] || 0) + 1;
        }
      }
    }

    return stats;
  }

  // Broadcast to all connected clients
  broadcast(event: string, data: unknown): void {
    if (!this.io) return;
    this.io.emit(event, data);
    this.logEvent(event, 'broadcast', data);
  }

  // Broadcast to authenticated users only
  broadcastToAuthenticated(event: string, data: unknown): void {
    if (!this.io) return;
    this.io.to('authenticated').emit(event, data);
  }

  // Broadcast to specific role
  broadcastToRole(event: string, role: UserRole, data: unknown): void {
    if (!this.io) return;
    this.io.to(`role:${role}`).emit(event, data);
  }

  // Send to specific investigation room
  sendToInvestigation(investigationId: string, event: string, data: unknown): void {
    if (!this.io) return;
    this.io.to(`investigation:${investigationId}`).emit(event, data);
    this.logEvent(event, `investigation:${investigationId}`, data);
  }

  // Send to specific sandbox session
  sendToSandboxSession(sessionId: string, event: string, data: unknown): void {
    if (!this.io) return;
    this.io.to(`sandbox:${sessionId}`).emit(event, data);
    this.logEvent(event, `sandbox:${sessionId}`, data);
  }

  // Send to specific socket
  sendToSocket(socketId: string, event: string, data: unknown): void {
    if (!this.io) return;
    const socket = this.io.sockets.sockets.get(socketId);
    if (socket) {
      socket.emit(event, data);
    }
  }

  // Emit telemetry event
  emitTelemetryEvent(event: string, data: unknown): void {
    this.broadcast(SocketEvent.TELEMETRY_EVENT, {
      timestamp: new Date().toISOString(),
      event,
      data,
    });
  }

  // Emit investigation update
  emitInvestigationUpdate(investigationId: string, update: unknown): void {
    this.sendToInvestigation(investigationId, SocketEvent.INVESTIGATION_UPDATE, update);
  }

  // Emit new alert
  emitNewAlert(alert: unknown): void {
    this.broadcast(SocketEvent.ALERT_NEW, {
      timestamp: new Date().toISOString(),
      alert,
    });
  }

  // Emit sandbox session update
  emitSandboxSessionUpdate(sessionId: string, update: unknown): void {
    this.sendToSandboxSession(sessionId, SocketEvent.SANDBOX_SESSION_UPDATE, update);
  }

  // Emit sandbox telemetry
  emitSandboxTelemetry(sessionId: string, telemetry: unknown): void {
    this.sendToSandboxSession(sessionId, SocketEvent.SANDBOX_TELEMETRY, telemetry);
  }

  // Emit AI analysis complete
  emitAIAnalysisComplete(investigationId: string, analysis: unknown): void {
    this.sendToInvestigation(investigationId, SocketEvent.AI_ANALYSIS_COMPLETE, analysis);
  }

  // Emit AI anomaly detected
  emitAIAnomalyDetected(investigationId: string, anomaly: unknown): void {
    this.sendToInvestigation(investigationId, SocketEvent.AI_ANOMALY_DETECTED, anomaly);
  }

  // Emit dashboard stats update
  emitDashboardStatsUpdate(stats: unknown): void {
    this.broadcast(SocketEvent.DASHBOARD_STATS_UPDATE, stats);
  }

  // Emit system notification
  emitSystemNotification(notification: unknown): void {
    this.broadcast(SocketEvent.SYSTEM_NOTIFICATION, notification);
  }

  // Shutdown service
  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    if (this.io) {
      this.io.close();
    }

    logger.info('WebSocket service shutdown');
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();
export default websocketService;