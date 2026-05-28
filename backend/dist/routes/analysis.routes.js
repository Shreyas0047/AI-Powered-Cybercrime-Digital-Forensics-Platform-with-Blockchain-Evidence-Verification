"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const fs_1 = __importDefault(require("fs"));
const analysis_controller_1 = require("../controllers/analysis.controller");
const middleware_1 = require("../middleware");
const router = (0, express_1.Router)();
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const dir = './uploads/analysis';
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    },
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const ext = '.' + file.originalname.split('.').pop()?.toLowerCase();
        if (ext === '.pdf' || ext === '.docx') {
            cb(null, true);
        }
        else {
            cb(new Error('Only PDF and DOCX files are supported'));
        }
    },
});
router.use(middleware_1.authenticate);
router.get('/history', (req, res, next) => {
    analysis_controller_1.analysisController.getAnalysisHistory(req, res).catch(next);
});
router.get('/', (req, res, next) => {
    analysis_controller_1.analysisController.getAnalysisHistory(req, res).catch(next);
});
router.get('/:id', (req, res, next) => {
    analysis_controller_1.analysisController.getAnalysisById(req, res).catch(next);
});
router.post('/document', upload.single('file'), (req, res, next) => {
    analysis_controller_1.analysisController.analyzeDocument(req, res).catch(next);
});
router.post('/url', (req, res, next) => {
    analysis_controller_1.analysisController.analyzeUrl(req, res).catch(next);
});
exports.default = router;
//# sourceMappingURL=analysis.routes.js.map