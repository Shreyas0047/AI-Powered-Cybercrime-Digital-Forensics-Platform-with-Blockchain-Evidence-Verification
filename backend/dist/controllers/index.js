"use strict";
/**
 * Controllers Index
 * Central export for all controllers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.evidenceArtifactsController = exports.settingsController = exports.logsController = exports.reportsController = exports.threatAnalysisController = exports.aiController = exports.syncController = exports.sandboxController = exports.evidenceController = exports.investigationController = exports.userController = exports.authController = void 0;
var auth_controller_1 = require("./auth.controller");
Object.defineProperty(exports, "authController", { enumerable: true, get: function () { return auth_controller_1.authController; } });
var user_controller_1 = require("./user.controller");
Object.defineProperty(exports, "userController", { enumerable: true, get: function () { return user_controller_1.userController; } });
var investigation_controller_1 = require("./investigation.controller");
Object.defineProperty(exports, "investigationController", { enumerable: true, get: function () { return investigation_controller_1.investigationController; } });
var evidence_controller_1 = require("./evidence.controller");
Object.defineProperty(exports, "evidenceController", { enumerable: true, get: function () { return evidence_controller_1.evidenceController; } });
var sandbox_controller_1 = require("./sandbox.controller");
Object.defineProperty(exports, "sandboxController", { enumerable: true, get: function () { return sandbox_controller_1.sandboxController; } });
var sync_controller_1 = require("./sync.controller");
Object.defineProperty(exports, "syncController", { enumerable: true, get: function () { return sync_controller_1.syncController; } });
var ai_analysis_controller_1 = require("./ai-analysis.controller");
Object.defineProperty(exports, "aiController", { enumerable: true, get: function () { return ai_analysis_controller_1.aiController; } });
var threat_analysis_controller_1 = require("./threat-analysis.controller");
Object.defineProperty(exports, "threatAnalysisController", { enumerable: true, get: function () { return threat_analysis_controller_1.threatAnalysisController; } });
var reports_controller_1 = require("./reports.controller");
Object.defineProperty(exports, "reportsController", { enumerable: true, get: function () { return reports_controller_1.reportsController; } });
var logs_controller_1 = require("./logs.controller");
Object.defineProperty(exports, "logsController", { enumerable: true, get: function () { return logs_controller_1.logsController; } });
var settings_controller_1 = require("./settings.controller");
Object.defineProperty(exports, "settingsController", { enumerable: true, get: function () { return settings_controller_1.settingsController; } });
var evidence_artifacts_controller_1 = require("./evidence-artifacts.controller");
Object.defineProperty(exports, "evidenceArtifactsController", { enumerable: true, get: function () { return evidence_artifacts_controller_1.evidenceArtifactsController; } });
//# sourceMappingURL=index.js.map