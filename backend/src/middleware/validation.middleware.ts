/**
 * Validation Middleware
 * Central input validation for all endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { ObjectSchema } from 'joi';
import { validate, userSchemas, investigationSchemas, evidenceSchemas, sandboxSchemas, alertSchemas, blockchainSchemas, custodySchemas, threatSchemas, analyticsSchemas, querySchemas } from '../validation/schemas';
import { securityLogger } from '../config/logger';

export interface RequestValidationError {
  field: string;
  message: string;
}

export function validateBody(schema: ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = validate(schema, req.body);

    if (!result.valid) {
      securityLogger.warn('Invalid request body', {
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

export function validateQuery(schema: ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = validate(schema, req.query);

    if (!result.valid) {
      res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors: result.errors,
      });
      return;
    }

    req.query = (result.value || {}) as any;
    next();
  };
}

export function validateParams(schema: ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = validate(schema, req.params);

    if (!result.valid) {
      res.status(400).json({
        success: false,
        message: 'Invalid path parameters',
        errors: result.errors,
      });
      return;
    }

    req.params = (result.value || {}) as any;
    next();
  };
}

// Pre-built validation schemas for common operations
export const validators = {
  // User validation
  register: validateBody(userSchemas.register),
  login: validateBody(userSchemas.login),
  updateProfile: validateBody(userSchemas.updateProfile),
  changePassword: validateBody(userSchemas.changePassword),

  // Investigation validation
  createInvestigation: validateBody(investigationSchemas.create),
  updateInvestigation: validateBody(investigationSchemas.update),
  addNote: validateBody(investigationSchemas.addNote),

  // Evidence validation
  uploadEvidence: validateBody(evidenceSchemas.upload),
  updateEvidence: validateBody(evidenceSchemas.updateMetadata),

  // Sandbox validation
  createSession: validateBody(sandboxSchemas.createSession),
  updateSession: validateBody(sandboxSchemas.updateSession),

  // Alert validation
  createAlert: validateBody(alertSchemas.create),
  acknowledgeAlert: validateBody(alertSchemas.acknowledge),
  resolveAlert: validateBody(alertSchemas.resolve),

  // Blockchain validation
  registerEvidence: validateBody(blockchainSchemas.registerEvidence),
  verifyEvidence: validateBody(blockchainSchemas.verifyEvidence),
  batchVerify: validateBody(blockchainSchemas.batchVerify),
  createPackage: validateBody(blockchainSchemas.createPackage),
  generateHash: validateBody(blockchainSchemas.generateHash),

  // Custody validation
  addCustodyEvent: validateBody(custodySchemas.addEvent),
  transferCustody: validateBody(custodySchemas.transferCustody),
  createTamperInvestigation: validateBody(custodySchemas.createTamperInvestigation),

  // Threat validation
  createIOC: validateBody(threatSchemas.createIOC),
  updateIOCStatus: validateBody(threatSchemas.updateIOCStatus),
  createCorrelation: validateBody(threatSchemas.createCorrelation),

  // Analytics validation
  analyzeBehavior: validateBody(analyticsSchemas.analyzeBehavior),
  detectAnomalies: validateBody(analyticsSchemas.detectAnomalies),
  analyzeBaseline: validateBody(analyticsSchemas.analyzeBaseline),
  scoreRelationship: validateBody(analyticsSchemas.scoreRelationship),

  // Query validation
  pagination: validateQuery(querySchemas.pagination),
  dateRange: validateQuery(querySchemas.dateRange),
  search: validateQuery(querySchemas.search),
};
