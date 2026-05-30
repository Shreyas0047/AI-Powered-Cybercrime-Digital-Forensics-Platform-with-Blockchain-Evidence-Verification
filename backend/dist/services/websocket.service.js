"use strict";
/**
 * Real-Time WebSocket Service
 * Enterprise-grade WebSocket infrastructure for forensic telemetry streaming
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.websocketService = exports.SocketNamespace = exports.SocketEvent = void 0;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const logger_1 = __importDefault(require("../config/logger"));
// Event Types
var SocketEvent;
(function (SocketEvent) {
    // Connection Events
    SocketEvent["CONNECT"] = "connection";
    SocketEvent["DISCONNECT"] = "disconnect";
    SocketEvent["AUTHENTICATE"] = "authenticate";
    SocketEvent["AUTH_SUCCESS"] = "auth_success";
    SocketEvent["AUTH_FAILURE"] = "auth_failure";
    // Telemetry Events
    SocketEvent["TELEMETRY_EVENT"] = "telemetry:event";
    SocketEvent["TELEMETRY_BATCH"] = "telemetry:batch";
    SocketEvent["TELEMETRY_STREAM_START"] = "telemetry:stream_start";
    SocketEvent["TELEMETRY_STREAM_STOP"] = "telemetry:stream_stop";
    // Investigation Events
    SocketEvent["INVESTIGATION_UPDATE"] = "investigation:update";
    SocketEvent["INVESTIGATION_CREATE"] = "investigation:create";
    SocketEvent["INVESTIGATION_STATUS_CHANGE"] = "investigation:status_change";
    SocketEvent["EVIDENCE_UPDATE"] = "evidence:update";
    SocketEvent["EVIDENCE_UPLOAD"] = "evidence:upload";
    SocketEvent["ALERT_NEW"] = "alert:new";
    SocketEvent["ALERT_UPDATE"] = "alert:update";
    SocketEvent["ALERT_ESCALATE"] = "alert:escalate";
    // Sandbox Events
    SocketEvent["SANDBOX_SESSION_START"] = "sandbox:session_start";
    SocketEvent["SANDBOX_SESSION_END"] = "sandbox:session_end";
    SocketEvent["SANDBOX_SESSION_UPDATE"] = "sandbox:session_update";
    SocketEvent["SANDBOX_TELEMETRY"] = "sandbox:telemetry";
    SocketEvent["SANDBOX_ERROR"] = "sandbox:error";
    SocketEvent["SANDBOX_ROLLBACK"] = "sandbox:rollback";
    // AI Analysis Events
    SocketEvent["AI_ANALYSIS_START"] = "ai:analysis_start";
    SocketEvent["AI_ANALYSIS_COMPLETE"] = "ai:analysis_complete";
    SocketEvent["AI_ANALYSIS_UPDATE"] = "ai:analysis_update";
    SocketEvent["AI_ANOMALY_DETECTED"] = "ai:anomaly_detected";
    SocketEvent["AI_THREAT_CLASSIFICATION"] = "ai:threat_classification";
    // Dashboard Events
    SocketEvent["DASHBOARD_STATS_UPDATE"] = "dashboard:stats_update";
    SocketEvent["DASHBOARD_ALERT_COUNT"] = "dashboard:alert_count";
    // System Events
    SocketEvent["SYSTEM_NOTIFICATION"] = "system:notification";
    SocketEvent["PING"] = "ping";
    SocketEvent["PONG"] = "pong";
})(SocketEvent || (exports.SocketEvent = SocketEvent = {}));
// Channel Namespaces
exports.SocketNamespace = {
    TELEMETRY: '/telemetry',
    INVESTIGATIONS: '/investigations',
    SANDBOX: '/sandbox',
    ALERTS: '/alerts',
    DASHBOARD: '/dashboard',
    AI: '/ai',
};
class WebSocketService {
    io = null;
    connections = new Map();
    heartbeatInterval = null;
    eventLog = [];
    // Initialize Socket.IO server
    initialize(httpServer) {
        this.io = new socket_io_1.Server(httpServer, {
            cors: {
                origin: config_1.config.security.corsOrigin,
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
        logger_1.default.info('WebSocket service initialized');
    }
    // Setup event handlers
    setupEventHandlers() {
        if (!this.io)
            return;
        // Authentication middleware
        this.io.use((socket, next) => {
            this.handleAuthentication(socket, next);
        });
        // Connection handler
        this.io.on(SocketEvent.CONNECT, (socket) => {
            this.handleConnection(socket);
        });
    }
    // Handle socket authentication
    handleAuthentication(socket, next) {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            // Allow unauthenticated connections for public channels
            // They will be limited to read-only public events
            return next();
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwt.secret);
            const connectionInfo = {
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
            logger_1.default.info(`Socket authenticated: ${socket.id} - User: ${decoded.email} - Role: ${decoded.role}`);
            next();
        }
        catch (error) {
            logger_1.default.warn(`Socket authentication failed: ${socket.id}`);
            socket.emit(SocketEvent.AUTH_FAILURE, { message: 'Invalid token' });
            next(new Error('Authentication failed'));
        }
    }
    // Handle new connection
    handleConnection(socket) {
        const existingConnection = this.connections.get(socket.id);
        if (!existingConnection) {
            // Unauthenticated connection
            const connectionInfo = {
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
        logger_1.default.info(`Socket connected: ${socket.id} - Total connections: ${this.connections.size}`);
        // Setup event listeners
        this.setupSocketEventListeners(socket);
        // Log connection event
        this.logEvent(SocketEvent.CONNECT, socket.id, { totalConnections: this.connections.size });
    }
    // Setup socket event listeners
    setupSocketEventListeners(socket) {
        // Ping/Pong for connection health
        socket.on(SocketEvent.PING, () => {
            socket.emit(SocketEvent.PONG, { timestamp: Date.now() });
            this.updateLastActivity(socket.id);
        });
        // Subscribe to investigation updates
        socket.on('subscribe:investigation', (investigationId) => {
            const connection = this.connections.get(socket.id);
            if (connection && this.canAccessInvestigation(connection.role, investigationId)) {
                socket.join(`investigation:${investigationId}`);
                connection.rooms.add(`investigation:${investigationId}`);
                logger_1.default.debug(`Socket ${socket.id} subscribed to investigation ${investigationId}`);
            }
        });
        // Unsubscribe from investigation updates
        socket.on('unsubscribe:investigation', (investigationId) => {
            const connection = this.connections.get(socket.id);
            if (connection) {
                socket.leave(`investigation:${investigationId}`);
                connection.rooms.delete(`investigation:${investigationId}`);
            }
        });
        // Subscribe to sandbox updates
        socket.on('subscribe:sandbox', (sessionId) => {
            const connection = this.connections.get(socket.id);
            if (connection && this.canAccessSandbox(connection.role)) {
                socket.join(`sandbox:${sessionId}`);
                connection.rooms.add(`sandbox:${sessionId}`);
            }
        });
        // Unsubscribe from sandbox updates
        socket.on('unsubscribe:sandbox', (sessionId) => {
            const connection = this.connections.get(socket.id);
            if (connection) {
                socket.leave(`sandbox:${sessionId}`);
                connection.rooms.delete(`sandbox:${sessionId}`);
            }
        });
        // Handle disconnect
        socket.on(SocketEvent.DISCONNECT, (reason) => {
            this.handleDisconnect(socket, reason);
        });
        // Handle errors
        socket.on('error', (error) => {
            logger_1.default.error(`Socket error: ${socket.id}`, error);
        });
    }
    // Handle disconnection
    handleDisconnect(socket, reason) {
        const connection = this.connections.get(socket.id);
        if (connection) {
            // Leave all rooms except the default room
            for (const room of socket.rooms) {
                if (room !== socket.id) {
                    socket.leave(room);
                }
            }
            this.connections.delete(socket.id);
            logger_1.default.info(`Socket disconnected: ${socket.id} - Reason: ${reason} - User: ${connection.userId}`);
            this.logEvent(SocketEvent.DISCONNECT, socket.id, { reason, userId: connection.userId });
        }
    }
    // Check if user can access investigation based on role
    canAccessInvestigation(role, investigationId) {
        // All authenticated users can access investigations
        return !!role;
    }
    // Check if user can access sandbox based on role
    canAccessSandbox(role) {
        const allowedRoles = ['super_admin', 'admin', 'forensic_analyst', 'sandbox_operator'];
        return role ? allowedRoles.includes(role) : false;
    }
    // Update last activity timestamp
    updateLastActivity(socketId) {
        const connection = this.connections.get(socketId);
        if (connection) {
            connection.lastActivity = new Date();
        }
    }
    // Start heartbeat to monitor connections
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            this.cleanupStaleConnections();
        }, 60000); // Every minute
    }
    // Clean up stale connections
    cleanupStaleConnections() {
        const staleThreshold = 5 * 60 * 1000; // 5 minutes
        const now = Date.now();
        for (const [socketId, connection] of this.connections.entries()) {
            const inactiveTime = now - connection.lastActivity.getTime();
            if (inactiveTime > staleThreshold) {
                logger_1.default.info(`Removing stale connection: ${socketId}`);
                this.connections.delete(socketId);
            }
        }
    }
    // Log events for traceability
    logEvent(event, socketId, data) {
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
    getEventLogs(limit = 100) {
        return this.eventLog.slice(-limit);
    }
    // Get connection stats
    getConnectionStats() {
        const stats = {
            total: this.connections.size,
            authenticated: 0,
            byRole: {},
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
    broadcast(event, data) {
        if (!this.io)
            return;
        this.io.emit(event, data);
        this.logEvent(event, 'broadcast', data);
    }
    // Broadcast to authenticated users only
    broadcastToAuthenticated(event, data) {
        if (!this.io)
            return;
        this.io.to('authenticated').emit(event, data);
    }
    // Broadcast to specific role
    broadcastToRole(event, role, data) {
        if (!this.io)
            return;
        this.io.to(`role:${role}`).emit(event, data);
    }
    // Send to specific investigation room
    sendToInvestigation(investigationId, event, data) {
        if (!this.io)
            return;
        this.io.to(`investigation:${investigationId}`).emit(event, data);
        this.logEvent(event, `investigation:${investigationId}`, data);
    }
    // Send to specific sandbox session
    sendToSandboxSession(sessionId, event, data) {
        if (!this.io)
            return;
        this.io.to(`sandbox:${sessionId}`).emit(event, data);
        this.logEvent(event, `sandbox:${sessionId}`, data);
    }
    // Send to specific socket
    sendToSocket(socketId, event, data) {
        if (!this.io)
            return;
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
            socket.emit(event, data);
        }
    }
    // Emit telemetry event
    emitTelemetryEvent(event, data) {
        this.broadcast(SocketEvent.TELEMETRY_EVENT, {
            timestamp: new Date().toISOString(),
            event,
            data,
        });
    }
    // Emit investigation update
    emitInvestigationUpdate(investigationId, update) {
        this.sendToInvestigation(investigationId, SocketEvent.INVESTIGATION_UPDATE, update);
    }
    // Emit new alert
    emitNewAlert(alert) {
        this.broadcast(SocketEvent.ALERT_NEW, {
            timestamp: new Date().toISOString(),
            alert,
        });
    }
    // Emit sandbox session update
    emitSandboxSessionUpdate(sessionId, update) {
        this.sendToSandboxSession(sessionId, SocketEvent.SANDBOX_SESSION_UPDATE, update);
        // Also broadcast to all connected clients so dashboard gets updates without subscribing
        if (this.io) {
            this.io.emit(SocketEvent.SANDBOX_SESSION_UPDATE, update);
        }
    }
    // Emit sandbox telemetry
    emitSandboxTelemetry(sessionId, telemetry) {
        this.sendToSandboxSession(sessionId, SocketEvent.SANDBOX_TELEMETRY, telemetry);
    }
    // Emit sandbox error with structured detail
    emitSandboxError(sessionId, error) {
        const payload = { session_id: sessionId, ...error, timestamp: new Date().toISOString() };
        this.sendToSandboxSession(sessionId, SocketEvent.SANDBOX_ERROR, payload);
        if (this.io) {
            this.io.emit(SocketEvent.SANDBOX_ERROR, payload);
        }
    }
    // Emit AI analysis complete
    emitAIAnalysisComplete(investigationId, analysis) {
        this.sendToInvestigation(investigationId, SocketEvent.AI_ANALYSIS_COMPLETE, analysis);
    }
    // Emit AI anomaly detected
    emitAIAnomalyDetected(investigationId, anomaly) {
        this.sendToInvestigation(investigationId, SocketEvent.AI_ANOMALY_DETECTED, anomaly);
    }
    // Emit dashboard stats update
    emitDashboardStatsUpdate(stats) {
        this.broadcast(SocketEvent.DASHBOARD_STATS_UPDATE, stats);
    }
    // Emit system notification
    emitSystemNotification(notification) {
        this.broadcast(SocketEvent.SYSTEM_NOTIFICATION, notification);
    }
    // Shutdown service
    shutdown() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        if (this.io) {
            this.io.close();
        }
        logger_1.default.info('WebSocket service shutdown');
    }
}
// Export singleton instance
exports.websocketService = new WebSocketService();
exports.default = exports.websocketService;
//# sourceMappingURL=websocket.service.js.map