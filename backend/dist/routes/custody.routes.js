"use strict";
/**
 * Chain of Custody Routes
 * API endpoints for chain-of-custody management
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const middleware_1 = require("../middleware");
const custody_controller_1 = require("../controllers/custody.controller");
const router = (0, express_1.Router)();
/**
 * @route   GET /api/v1/custody/chain/:evidenceId
 * @desc    Get chain of custody visualization
 * @access  Private (Authenticated)
 */
router.get('/chain/:evidenceId', middleware_1.authenticate, custody_controller_1.custodyController.getChainOfCustody);
/**
 * @route   GET /api/v1/custody/timeline/:evidenceId
 * @desc    Get full custody timeline
 * @access  Private (Authenticated)
 */
router.get('/timeline/:evidenceId', middleware_1.authenticate, custody_controller_1.custodyController.getCustodyTimeline);
/**
 * @route   POST /api/v1/custody/event
 * @desc    Add custody event
 * @access  Private (Authenticated, Admin/Analyst)
 */
router.post('/event', middleware_1.authenticate, (0, middleware_1.authorize)(['admin', 'analyst']), custody_controller_1.custodyController.addCustodyEvent);
/**
 * @route   GET /api/v1/custody/verification-history/:evidenceId
 * @desc    Get verification history
 * @access  Private (Authenticated)
 */
router.get('/verification-history/:evidenceId', middleware_1.authenticate, custody_controller_1.custodyController.getVerificationHistory);
/**
 * @route   POST /api/v1/custody/transfer
 * @desc    Transfer custody
 * @access  Private (Authenticated, Admin)
 */
router.post('/transfer', middleware_1.authenticate, (0, middleware_1.authorize)(['admin']), custody_controller_1.custodyController.transferCustody);
/**
 * @route   GET /api/v1/custody/lineage-graph/:investigationId
 * @desc    Get evidence lineage graph
 * @access  Private (Authenticated)
 */
router.get('/lineage-graph/:investigationId', middleware_1.authenticate, custody_controller_1.custodyController.getLineageGraph);
/**
 * @route   GET /api/v1/custody/integrity-stats
 * @desc    Get integrity statistics
 * @access  Private (Authenticated)
 */
router.get('/integrity-stats', middleware_1.authenticate, custody_controller_1.custodyController.getIntegrityStats);
/**
 * @route   GET /api/v1/custody/tamper-investigations
 * @desc    Get open tamper investigations
 * @access  Private (Authenticated, Admin/Analyst)
 */
router.get('/tamper-investigations', middleware_1.authenticate, (0, middleware_1.authorize)(['admin', 'analyst']), custody_controller_1.custodyController.getTamperInvestigations);
/**
 * @route   POST /api/v1/custody/tamper-investigation
 * @desc    Create tamper investigation
 * @access  Private (Authenticated, Admin)
 */
router.post('/tamper-investigation', middleware_1.authenticate, (0, middleware_1.authorize)(['admin']), custody_controller_1.custodyController.createTamperInvestigation);
/**
 * @route   POST /api/v1/custody/tamper-investigation/:investigationId/update
 * @desc    Update tamper investigation
 * @access  Private (Authenticated, Admin)
 */
router.post('/tamper-investigation/:investigationId/update', middleware_1.authenticate, (0, middleware_1.authorize)(['admin']), custody_controller_1.custodyController.updateTamperInvestigation);
/**
 * @route   POST /api/v1/custody/report
 * @desc    Generate verification report
 * @access  Private (Authenticated, Admin/Analyst)
 */
router.post('/report', middleware_1.authenticate, (0, middleware_1.authorize)(['admin', 'analyst']), custody_controller_1.custodyController.generateReport);
/**
 * @route   POST /api/v1/custody/report/:reportId/export
 * @desc    Export verification report
 * @access  Private (Authenticated, Admin/Analyst)
 */
router.post('/report/:reportId/export', middleware_1.authenticate, (0, middleware_1.authorize)(['admin', 'analyst']), custody_controller_1.custodyController.exportReport);
exports.default = router;
//# sourceMappingURL=custody.routes.js.map