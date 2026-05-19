"use strict";
/**
 * Evidence Service
 * Business logic for evidence management and file handling
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.evidenceService = exports.EvidenceService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const models_1 = require("../models");
const types_1 = require("../types");
const middleware_1 = require("../middleware");
const config_1 = require("../config");
const uuid_1 = require("uuid");
class EvidenceService {
    /**
     * Initialize storage directories
     */
    initializeStorage() {
        const dirs = [config_1.config.evidence.path, config_1.config.evidence.reportsPath, config_1.config.evidence.sandboxLogsPath];
        dirs.forEach(dir => {
            if (!fs_1.default.existsSync(dir)) {
                fs_1.default.mkdirSync(dir, { recursive: true });
            }
        });
    }
    /**
     * Upload evidence file
     */
    async uploadEvidence(data) {
        // Verify investigation exists
        const { Investigation } = await Promise.resolve().then(() => __importStar(require('../models')));
        const investigation = await Investigation.findById(data.investigationId);
        if (!investigation) {
            throw new middleware_1.NotFoundError('Investigation');
        }
        // Generate unique filename
        const fileExt = path_1.default.extname(data.file.originalname);
        const fileId = (0, uuid_1.v4)();
        const safeFilename = `${fileId}${fileExt}`;
        const filePath = path_1.default.join(config_1.config.evidence.path, safeFilename);
        // Move file to storage
        fs_1.default.renameSync(data.file.path, filePath);
        // Calculate file hash
        const hash = await this.calculateFileHash(filePath);
        // Create evidence record
        const evidence = await models_1.Evidence.create({
            investigationId: data.investigationId,
            name: data.file.originalname,
            description: data.description,
            type: data.type || this.detectEvidenceType(data.file.mimetype),
            filePath,
            fileSize: data.file.size,
            mimeType: data.file.mimetype,
            hash: { sha256: hash },
            chainOfCustody: [
                {
                    timestamp: data.collectedAt || new Date(),
                    action: 'uploaded',
                    userId: data.collectedBy,
                    details: `File uploaded: ${data.file.originalname}`,
                },
            ],
            collectedAt: data.collectedAt || new Date(),
            collectedBy: data.collectedBy,
            tags: data.tags || [],
        });
        // Update investigation evidence count
        await Investigation.updateOne({ _id: data.investigationId }, { $inc: { evidenceCount: 1 } });
        return evidence;
    }
    /**
     * Get all evidence for an investigation
     */
    async findByInvestigation(investigationId, options) {
        const { page, limit, type } = options;
        const query = { investigationId };
        if (type)
            query.type = type;
        const total = await models_1.Evidence.countDocuments(query);
        const totalPages = Math.ceil(total / limit);
        const evidence = await models_1.Evidence.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();
        return { evidence: evidence, total, totalPages };
    }
    /**
     * Get evidence by ID
     */
    async findById(id) {
        const evidence = await models_1.Evidence.findById(id).lean();
        if (!evidence) {
            throw new middleware_1.NotFoundError('Evidence');
        }
        return evidence;
    }
    /**
     * Add chain of custody entry
     */
    async addChainOfCustody(id, action, userId, details) {
        const evidence = await models_1.Evidence.findById(id);
        if (!evidence) {
            throw new middleware_1.NotFoundError('Evidence');
        }
        evidence.chainOfCustody.push({
            timestamp: new Date(),
            action,
            userId,
            details,
        });
        await evidence.save();
        return evidence;
    }
    /**
     * Verify evidence integrity
     */
    async verifyIntegrity(id) {
        const evidence = await models_1.Evidence.findById(id);
        if (!evidence) {
            throw new middleware_1.NotFoundError('Evidence');
        }
        const currentHash = await this.calculateFileHash(evidence.filePath);
        const verified = currentHash === evidence.hash?.sha256;
        if (verified) {
            evidence.verified = true;
            await evidence.save();
        }
        return { verified, currentHash };
    }
    /**
     * Delete evidence
     */
    async delete(id) {
        const evidence = await models_1.Evidence.findById(id);
        if (!evidence) {
            throw new middleware_1.NotFoundError('Evidence');
        }
        // Delete file
        if (fs_1.default.existsSync(evidence.filePath)) {
            fs_1.default.unlinkSync(evidence.filePath);
        }
        // Update investigation count
        const { Investigation } = await Promise.resolve().then(() => __importStar(require('../models')));
        await Investigation.updateOne({ _id: evidence.investigationId }, { $inc: { evidenceCount: -1 } });
        await models_1.Evidence.findByIdAndDelete(id);
    }
    /**
     * Calculate SHA-256 hash of file
     */
    async calculateFileHash(filePath) {
        return new Promise((resolve, reject) => {
            const hash = crypto_1.default.createHash('sha256');
            const stream = fs_1.default.createReadStream(filePath);
            stream.on('data', (data) => hash.update(data));
            stream.on('end', () => resolve(hash.digest('hex')));
            stream.on('error', reject);
        });
    }
    /**
     * Detect evidence type from MIME type
     */
    detectEvidenceType(mimeType) {
        if (mimeType.includes('image'))
            return types_1.EvidenceType.SCREENSHOT;
        if (mimeType.includes('json'))
            return types_1.EvidenceType.REPORT;
        if (mimeType.includes('pcap') || mimeType.includes('tcpdump'))
            return types_1.EvidenceType.NETWORK_CAPTURE;
        if (mimeType.includes('log'))
            return types_1.EvidenceType.LOG;
        return types_1.EvidenceType.OTHER;
    }
}
exports.EvidenceService = EvidenceService;
exports.evidenceService = new EvidenceService();
exports.default = exports.evidenceService;
//# sourceMappingURL=evidence.service.js.map