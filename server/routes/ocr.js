import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { parseThaiSlipText, SAMPLE_SLIPS } from '../services/ocrService.js';
import { performGoogleVisionOCR } from '../services/googleVisionService.js';
import db from '../db/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, 'slip_' + Date.now() + ext);
  }
});
const upload = multer({ storage });

const router = express.Router();

// Get list of sample slips for instant testing
router.get('/sample-slips', (req, res) => {
  res.json({ success: true, data: SAMPLE_SLIPS });
});

// Google Cloud Vision OCR endpoint
router.post('/google-vision', async (req, res) => {
  try {
    const { imageBase64, imagePath, sampleId } = req.body;

    if (sampleId) {
      const sample = SAMPLE_SLIPS.find(s => s.id === sampleId);
      if (sample) {
        return res.json({
          success: true,
          engine: 'Sample Preset (Simulated Google Vision)',
          data: {
            amount: sample.amount,
            date: sample.date,
            time: sample.time,
            sender: sample.sender,
            receiver: sample.receiver,
            bank: sample.bank,
            referenceNo: sample.referenceNo,
            confidence: 99.8,
            suggestedCategory: sample.category,
            suggestedType: sample.type,
            note: sample.note,
            slipUrl: sample.imageUrl,
            rawText: sample.rawOcr
          }
        });
      }
    }

    const input = imageBase64 || imagePath;
    if (!input) {
      return res.status(400).json({ success: false, error: 'imageBase64 or imagePath is required' });
    }

    const googleResult = await performGoogleVisionOCR(input);

    if (googleResult.data) {
      return res.json({
        success: true,
        engine: googleResult.engine,
        data: googleResult.data
      });
    }

    // Fallback parse
    const fallback = parseThaiSlipText(input);
    res.json({
      success: true,
      engine: googleResult.engine,
      message: googleResult.message,
      data: fallback
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Parse OCR payload (general)
router.post('/parse', async (req, res) => {
  try {
    const { rawText, sampleId, imageBase64 } = req.body;

    if (sampleId) {
      const sample = SAMPLE_SLIPS.find(s => s.id === sampleId);
      if (sample) {
        return res.json({
          success: true,
          data: {
            amount: sample.amount,
            date: sample.date,
            time: sample.time,
            sender: sample.sender,
            receiver: sample.receiver,
            bank: sample.bank,
            referenceNo: sample.referenceNo,
            confidence: 99.5,
            suggestedCategory: sample.category,
            suggestedType: sample.type,
            note: sample.note,
            slipUrl: sample.imageUrl,
            rawText: sample.rawOcr
          }
        });
      }
    }

    // If imageBase64 provided, attempt Google Vision first
    if (imageBase64) {
      const googleRes = await performGoogleVisionOCR(imageBase64);
      if (googleRes.data) {
        return res.json({ success: true, data: googleRes.data, engine: googleRes.engine });
      }
    }

    const parsed = parseThaiSlipText(rawText);

    db.prepare(`
      INSERT INTO system_logs (id, level, module, message, metadata)
      VALUES (?, 'INFO', 'OCR', ?, ?)
    `).run(
      'log_' + Date.now(),
      `OCR ประมวลผลสำเร็จ: ${parsed.bank} ยอดเงิน ฿${parsed.amount} บาท`,
      JSON.stringify(parsed)
    );

    res.json({ success: true, data: parsed });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Upload image file and trigger OCR
router.post('/upload', upload.single('slip'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image uploaded' });
    }
    const slipUrl = `/uploads/${req.file.filename}`;
    const filePath = req.file.path;

    // Run Google Vision OCR on uploaded image
    const googleRes = await performGoogleVisionOCR(filePath);

    res.json({
      success: true,
      slipUrl,
      filename: req.file.filename,
      ocrResult: googleRes.data || null,
      engine: googleRes.engine
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
