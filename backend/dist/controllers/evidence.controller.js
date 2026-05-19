"use strict";
/**
 * Evidence Controller
 * Handles evidence management endpoints
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.evidenceController = exports.EvidenceController = void 0;
const multer_1 = __importDefault(require("multer"));
const services_1 = require("../services");
const config_1 = require("../config");
// Configure multer for file uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const tempDir = './uploads/temp';
        const fs = require('fs');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        cb(null, tempDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    },
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: config_1.config.upload.maxSize },
    fileFilter: (req, file, cb) => {
        const ext = '.' + file.originalname.split('.').pop()?.toLowerCase();
        if (config_1.config.upload.allowedTypes.includes(ext)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type'));
        }
    },
});
class EvidenceController {
    /**
     * POST /api/v1/evidence/upload
     * Upload evidence file
     */
    uploadFile = upload.single('file');
    async upload(req, res) {
        const file = req.file;
        if (!file) {
            res.status(400).json({
                success: false,
                message: 'No file uploaded',
            });
            return;
        }
        const evidence = await services_1.evidenceService.uploadEvidence({
            investigationId: req.body.investigationId,
            file,
            description: req.body.description,
            type: req.body.type,
            collectedBy: req.user?.id,
            tags: req.body.tags ? JSON.parse(req.body.tags) : [],
        });
        const response = {
            success: true,
            message: 'Evidence uploaded successfully',
            data: { evidence },
        };
        res.status(201).json(response);
    }
    /**
     * GET /api/v1/evidence/investigation/:investigationId
     * Get evidence by investigation
     */
    async findByInvestigation(req, res) {
        const { investigationId } = req.params;
        const { page = 1, limit = 20, type } = req.query;
        const result = await services_1.evidenceService.findByInvestigation(investigationId, {
            page: Number(page),
            limit: Math.min(Number(limit), 100),
            type: type,
        });
        const response = {
            success: true,
            message: 'Evidence retrieved',
            data: result.evidence,
            meta: {
                page: Number(page),
                limit: Number(limit),
                total: result.total,
                totalPages: result.totalPages,
            },
        };
        res.json(response);
    }
    /**
     * GET /api/v1/evidence/:id
     * Get evidence by ID
     */
    async findById(req, res) {
        const evidence = await services_1.evidenceService.findById(req.params.id);
        const response = {
            success: true,
            message: 'Evidence retrieved',
            data: { evidence },
        };
        res.json(response);
    }
    /**
     * POST /api/v1/evidence/:id/verify
     * Verify evidence integrity
     */
    async verifyIntegrity(req, res) {
        const result = await services_1.evidenceService.verifyIntegrity(req.params.id);
        const response = {
            success: true,
            message: result.verified ? 'Evidence verified' : 'Evidence verification failed',
            data: result,
        };
        res.json(response);
    }
    /**
     * DELETE /api/v1/evidence/:id
     * Delete evidence
     */
    async delete(req, res) {
        await services_1.evidenceService.delete(req.params.id);
        const response = {
            success: true,
            message: 'Evidence deleted',
        };
        res.json(response);
    }
}
exports.EvidenceController = EvidenceController;
exports.evidenceController = new EvidenceController();
exports.default = exports.evidenceController;
//# sourceMappingURL=evidence.controller.js.map