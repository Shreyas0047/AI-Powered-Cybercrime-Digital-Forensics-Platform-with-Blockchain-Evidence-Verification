"use strict";
/**
 * Evidence Artifacts Routes
 * /api/v1/evidence/artifacts
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controllers_1 = require("../controllers");
const middleware_1 = require("../middleware");
const router = (0, express_1.Router)();
router.use(middleware_1.authenticate);
router.get('/', (0, middleware_1.asyncHandler)(controllers_1.evidenceArtifactsController.findAll));
router.get('/:id', (0, middleware_1.asyncHandler)(controllers_1.evidenceArtifactsController.findById));
exports.default = router;
//# sourceMappingURL=evidence-artifacts.routes.js.map