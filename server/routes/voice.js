import express from 'express';
import { parseThaiVoiceCommand, SAMPLE_VOICE_COMMANDS } from '../services/voiceService.js';
import db from '../db/database.js';

const router = express.Router();

// Get sample voice commands
router.get('/sample-commands', (req, res) => {
  res.json({ success: true, data: SAMPLE_VOICE_COMMANDS });
});

// Parse speech transcript
router.post('/parse', (req, res) => {
  try {
    const { transcript } = req.body;
    if (!transcript) {
      return res.status(400).json({ success: false, error: 'transcript is required' });
    }

    const parsed = parseThaiVoiceCommand(transcript);

    // Log voice event to system logs
    db.prepare(`
      INSERT INTO system_logs (id, level, module, message, metadata)
      VALUES (?, 'INFO', 'VOICE', ?, ?)
    `).run(
      'log_' + Date.now(),
      `Voice Recognition: "${transcript}" -> ${parsed.type} ${parsed.amount} บาท (${parsed.category})`,
      JSON.stringify(parsed)
    );

    res.json({ success: true, data: parsed });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
