"use strict";
/**
 * NyxTrace Backend - Main Entry Point
 * Express.js server with enterprise-grade architecture
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
exports.healthCheck = healthCheck;
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const config_1 = require("./config");
const logger_1 = __importDefault(require("./config/logger"));
const database_1 = require("./config/database");
const routes_1 = __importDefault(require("./routes"));
const middleware_1 = require("./middleware");
const fs_1 = __importDefault(require("fs"));
const services_1 = require("./services");
const websocket_service_1 = require("./services/websocket.service");
// Initialize Express app
const app = (0, express_1.default)();
exports.app = app;
// Security middleware
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "blob:"],
        },
    },
    crossOriginEmbedderPolicy: false,
}));
// CORS configuration
app.use((0, cors_1.default)({
    origin: config_1.config.security.corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
// Body parsing
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Rate limiting — consistent across all environments
const limiter = (0, express_rate_limit_1.default)({
    windowMs: config_1.config.security.rateLimitWindowMs,
    max: config_1.config.security.rateLimitMaxRequests,
    message: {
        success: false,
        message: 'Too many requests, please try again later',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api', limiter);
// Request logging
app.use((0, morgan_1.default)('combined', {
    stream: {
        write: (message) => {
            logger_1.default.info(message.trim());
        },
    },
}));
// Initialize storage
services_1.evidenceService.initializeStorage();
if (!fs_1.default.existsSync('./uploads/analysis')) {
    fs_1.default.mkdirSync('./uploads/analysis', { recursive: true });
}
// Request sanitization and integrity check
app.use(middleware_1.sanitizeRequest);
app.use((req, res, next) => {
    const { valid, threats } = (0, middleware_1.validateRequestIntegrity)(req);
    if (!valid) {
        (0, middleware_1.logSecurityEvent)(req, 'REQUEST_INTEGRITY_VIOLATION', {
            threat: threats.join(', '),
            severity: 'high',
            ip: req.ip,
        });
        res.status(400).json({ success: false, message: 'Request rejected' });
        return;
    }
    next();
});
// API routes
app.use(routes_1.default);
// Root endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'NyxTrace API',
        version: '1.0.0',
        description: 'AI-Powered Cybercrime Digital NyxTrace',
        documentation: '/api/v1',
    });
});
// Error handling
app.use(middleware_1.notFoundHandler);
app.use(middleware_1.errorHandler);
// Start server
async function startServer() {
    try {
        // Validate configuration
        (0, config_1.validateConfig)();
        // Connect to database
        await (0, database_1.connectToDatabase)();
        // Start listening
        const { port, nodeEnv } = config_1.config.server;
        // Initialize WebSocket service
        const server = app.listen(port, () => {
            websocket_service_1.websocketService.initialize(server);
            logger_1.default.info([
                '============================================================',
                'NyxTrace Backend',
                '------------------------------------------------------------',
                `Environment: ${nodeEnv}`,
                `Port: ${port}`,
                `API Version: ${config_1.config.server.apiVersion}`,
                'WebSocket: Enabled',
                '============================================================',
            ].join('\n'));
            /*
      ╔═══════════════════════════════════════════════════════════════╗
      ║                                                               ║
      ║   🎯 NyxTrace Backend                               ║
      ║   ─────────────────────────────────────────────               ║
      ║                                                               ║
      ║   Environment: ${nodeEnv.padEnd(45)}║
      ║   Port: ${port.toString().padEnd(50)}║
      ║   API Version: ${config.server.apiVersion.padEnd(41)}║
      ║   WebSocket: Enabled                                         ║
      ║                                                               ║
      ╚═══════════════════════════════════════════════════════════════╝
            */
            logger_1.default.info('Backend services initialized successfully');
        });
        // Graceful shutdown handling
        const shutdown = async (signal) => {
            logger_1.default.info(`Received ${signal}, starting graceful shutdown...`);
            websocket_service_1.websocketService.shutdown();
            server.close(async () => {
                logger_1.default.info('HTTP server closed');
                await (0, database_1.closeDatabase)();
                logger_1.default.info('Database connection closed');
                process.exit(0);
            });
            // Force exit after 10 seconds
            setTimeout(() => {
                logger_1.default.error('Forced shutdown after timeout');
                process.exit(1);
            }, 10000);
        };
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    }
    catch (error) {
        logger_1.default.error('Failed to start server:', error);
        process.exit(1);
    }
}
// Health check for orchestration
async function healthCheck() {
    const dbHealth = await (0, database_1.checkDatabaseHealth)();
    return {
        status: dbHealth.status === 'connected' ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        services: {
            api: 'ok',
            database: dbHealth.status,
        },
    };
}
// Start if run directly
if (require.main === module) {
    startServer();
}
exports.default = app;
//# sourceMappingURL=index.js.map