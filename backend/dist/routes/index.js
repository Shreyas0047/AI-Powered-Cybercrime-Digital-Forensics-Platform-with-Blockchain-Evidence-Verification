"use strict";
/**
 * Routes Index
 * Central export for all route modules
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const config_1 = require("../config");
const auth_routes_1 = __importDefault(require("./auth.routes"));
const user_routes_1 = __importDefault(require("./user.routes"));
const investigation_routes_1 = __importDefault(require("./investigation.routes"));
const evidence_routes_1 = __importDefault(require("./evidence.routes"));
const sandbox_routes_1 = __importDefault(require("./sandbox.routes"));
const sync_routes_1 = __importDefault(require("./sync.routes"));
const ai_routes_1 = __importDefault(require("./ai.routes"));
const blockchain_routes_1 = __importDefault(require("../blockchain/routes/blockchain.routes"));
const custody_routes_1 = __importDefault(require("./custody.routes"));
const threat_routes_1 = __importDefault(require("./threat.routes"));
const analytics_routes_1 = __importDefault(require("./analytics.routes"));
const operations_routes_1 = __importDefault(require("./operations.routes"));
const reports_routes_1 = __importDefault(require("./reports.routes"));
const logs_routes_1 = __importDefault(require("./logs.routes"));
const settings_routes_1 = __importDefault(require("./settings.routes"));
const evidence_artifacts_routes_1 = __importDefault(require("./evidence-artifacts.routes"));
const threat_analysis_routes_1 = __importDefault(require("./threat-analysis.routes"));
const alerts_routes_1 = __importDefault(require("./alerts.routes"));
const analysis_routes_1 = __importDefault(require("./analysis.routes"));
const router = (0, express_1.Router)();
// API version prefix
const API_PREFIX = `/api/${config_1.config.server.apiVersion}`;
// Mount routes
router.use(`${API_PREFIX}/auth`, auth_routes_1.default);
router.use(`${API_PREFIX}/users`, user_routes_1.default);
router.use(`${API_PREFIX}/investigations`, investigation_routes_1.default);
router.use(`${API_PREFIX}/evidence`, evidence_routes_1.default);
router.use(`${API_PREFIX}/sandbox`, sandbox_routes_1.default);
router.use(`${API_PREFIX}/sync`, sync_routes_1.default);
router.use(`${API_PREFIX}/ai`, ai_routes_1.default);
router.use(`${API_PREFIX}/blockchain`, blockchain_routes_1.default);
router.use(`${API_PREFIX}/custody`, custody_routes_1.default);
router.use(`${API_PREFIX}/threat`, threat_routes_1.default);
router.use(`${API_PREFIX}/analytics`, analytics_routes_1.default);
router.use(`${API_PREFIX}/operations`, operations_routes_1.default);
router.use(`${API_PREFIX}/reports`, reports_routes_1.default);
router.use(`${API_PREFIX}/logs`, logs_routes_1.default);
router.use(`${API_PREFIX}/settings`, settings_routes_1.default);
router.use(`${API_PREFIX}/evidence/artifacts`, evidence_artifacts_routes_1.default);
router.use(`${API_PREFIX}/threat-analysis`, threat_analysis_routes_1.default);
router.use(`${API_PREFIX}/alerts`, alerts_routes_1.default);
router.use(`${API_PREFIX}/analysis`, analysis_routes_1.default);
// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'API is running',
        data: {
            version: config_1.config.server.apiVersion,
            environment: config_1.config.server.nodeEnv,
            timestamp: new Date().toISOString(),
        },
    });
});
// Root endpoint
router.get('/', (req, res) => {
    res.json({
        name: 'NyxTrace API',
        version: '1.0.0',
        description: 'AI-Powered Cybercrime Digital NyxTrace',
        documentation: '/api/v1',
    });
});
exports.default = router;
//# sourceMappingURL=index.js.map