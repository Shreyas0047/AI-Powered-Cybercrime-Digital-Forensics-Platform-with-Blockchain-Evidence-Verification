"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analysisHistoryQuery = exports.analyzeUrlSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.analyzeUrlSchema = joi_1.default.object({
    url: joi_1.default.string().uri({ scheme: ['http', 'https'] }).required().max(2048).messages({
        'string.uri': 'URL must be a valid HTTP or HTTPS URL',
        'any.required': 'URL is required',
    }),
});
exports.analysisHistoryQuery = joi_1.default.object({
    page: joi_1.default.number().integer().min(1).default(1),
    limit: joi_1.default.number().integer().min(1).max(100).default(20),
    type: joi_1.default.string().valid('document_analysis', 'url_analysis', 'sandbox_behavioral').optional(),
});
//# sourceMappingURL=analysis.schemas.js.map