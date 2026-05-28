import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import { analysisController } from '../controllers/analysis.controller';
import { authenticate } from '../middleware';

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads/analysis';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = '.' + file.originalname.split('.').pop()?.toLowerCase();
    if (ext === '.pdf' || ext === '.docx') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and DOCX files are supported'));
    }
  },
});

router.use(authenticate);

router.get('/history', (req, res, next) => {
  analysisController.getAnalysisHistory(req, res).catch(next);
});

router.get('/', (req, res, next) => {
  analysisController.getAnalysisHistory(req, res).catch(next);
});

router.get('/:id', (req, res, next) => {
  analysisController.getAnalysisById(req, res).catch(next);
});

router.post('/document', upload.single('file'), (req, res, next) => {
  analysisController.analyzeDocument(req, res).catch(next);
});

router.post('/url', (req, res, next) => {
  analysisController.analyzeUrl(req, res).catch(next);
});

export default router;
