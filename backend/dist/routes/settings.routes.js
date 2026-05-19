"use strict";
/**
 * Settings Routes
 * /api/v1/settings
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controllers_1 = require("../controllers");
const middleware_1 = require("../middleware");
const router = (0, express_1.Router)();
router.use(middleware_1.authenticate);
router.get('/', (0, middleware_1.asyncHandler)(controllers_1.settingsController.getSettings));
router.put('/', (0, middleware_1.asyncHandler)(controllers_1.settingsController.updateSettings));
router.post('/reset', (0, middleware_1.asyncHandler)(controllers_1.settingsController.resetSettings));
exports.default = router;
//# sourceMappingURL=settings.routes.js.map