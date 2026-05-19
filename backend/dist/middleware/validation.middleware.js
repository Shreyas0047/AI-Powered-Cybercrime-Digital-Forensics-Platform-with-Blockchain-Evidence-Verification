"use strict";
/**
 * Validation Middleware
 * Central input validation for all endpoints
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validators = void 0;
exports.validateBody = validateBody;
exports.validateQuery = validateQuery;
exports.validateParams = validateParams;
const schemas_1 = require("../validation/schemas");
const logger_1 = require("../config/logger");
function validateBody(schema) {
    return (req, res, next) => {
        const result = (0, schemas_1.validate)(schema, req.body);
        if (!result.valid) {
            logger_1.securityLogger.warn('Invalid request body', {
                path: req.path,
                errors: result.errors,
                correlationId: req.headers['x-correlation-id'],
            });
            res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: result.errors,
            });
            return;
        }
        req.body = result.value;
        next();
    };
}
function validateQuery(schema) {
    return (req, res, next) => {
        const result = (0, schemas_1.validate)(schema, req.query);
        if (!result.valid) {
            res.status(400).json({
                success: false,
                message: 'Invalid query parameters',
                errors: result.errors,
            });
            return;
        }
        req.query = (result.value || {});
        next();
    };
}
function validateParams(schema) {
    return (req, res, next) => {
        const result = (0, schemas_1.validate)(schema, req.params);
        if (!result.valid) {
            res.status(400).json({
                success: false,
                message: 'Invalid path parameters',
                errors: result.errors,
            });
            return;
        }
        req.params = (result.value || {});
        next();
    };
}
// Pre-built validation schemas for common operations
exports.validators = {
    // User validation
    register: validateBody(schemas_1.userSchemas.register),
    login: validateBody(schemas_1.userSchemas.login),
    updateProfile: validateBody(schemas_1.userSchemas.updateProfile),
    changePassword: validateBody(schemas_1.userSchemas.changePassword),
    // Investigation validation
    createInvestigation: validateBody(schemas_1.investigationSchemas.create),
    updateInvestigation: validateBody(schemas_1.investigationSchemas.update),
    addNote: validateBody(schemas_1.investigationSchemas.addNote),
    // Evidence validation
    uploadEvidence: validateBody(schemas_1.evidenceSchemas.upload),
    updateEvidence: validateBody(schemas_1.evidenceSchemas.updateMetadata),
    // Sandbox validation
    createSession: validateBody(schemas_1.sandboxSchemas.createSession),
    updateSession: validateBody(schemas_1.sandboxSchemas.updateSession),
    // Alert validation
    createAlert: validateBody(schemas_1.alertSchemas.create),
    acknowledgeAlert: validateBody(schemas_1.alertSchemas.acknowledge),
    resolveAlert: validateBody(schemas_1.alertSchemas.resolve),
    // Blockchain validation
    registerEvidence: validateBody(schemas_1.blockchainSchemas.registerEvidence),
    verifyEvidence: validateBody(schemas_1.blockchainSchemas.verifyEvidence),
    batchVerify: validateBody(schemas_1.blockchainSchemas.batchVerify),
    createPackage: validateBody(schemas_1.blockchainSchemas.createPackage),
    generateHash: validateBody(schemas_1.blockchainSchemas.generateHash),
    // Custody validation
    addCustodyEvent: validateBody(schemas_1.custodySchemas.addEvent),
    transferCustody: validateBody(schemas_1.custodySchemas.transferCustody),
    createTamperInvestigation: validateBody(schemas_1.custodySchemas.createTamperInvestigation),
    // Threat validation
    createIOC: validateBody(schemas_1.threatSchemas.createIOC),
    updateIOCStatus: validateBody(schemas_1.threatSchemas.updateIOCStatus),
    createCorrelation: validateBody(schemas_1.threatSchemas.createCorrelation),
    // Analytics validation
    analyzeBehavior: validateBody(schemas_1.analyticsSchemas.analyzeBehavior),
    detectAnomalies: validateBody(schemas_1.analyticsSchemas.detectAnomalies),
    analyzeBaseline: validateBody(schemas_1.analyticsSchemas.analyzeBaseline),
    scoreRelationship: validateBody(schemas_1.analyticsSchemas.scoreRelationship),
    // Query validation
    pagination: validateQuery(schemas_1.querySchemas.pagination),
    dateRange: validateQuery(schemas_1.querySchemas.dateRange),
    search: validateQuery(schemas_1.querySchemas.search),
};
//# sourceMappingURL=validation.middleware.js.map