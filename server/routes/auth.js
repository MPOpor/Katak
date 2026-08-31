import express from 'express';
import db from '../db/database.js';

const router = express.Router();

// Current active session user (in-memory mock session for easy testing, defaults to Nicha)
let currentUserId = 'usr_nicha';

export function getCurrentUserId() {
  return currentUserId;
}

// Get all available users
router.get('/users', (req, res) => {
  try {
    const users = db.prepare('SELECT * FROM users ORDER BY created_at ASC').all();
    res.json({ success: true, data: users, currentUserId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get current user profile
router.get('/current', (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(currentUserId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Switch current user (useful to test Owner vs Member vs Admin permissions)
router.post('/switch-user', (req, res) => {
  try {
    const { userId } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    currentUserId = userId;
    res.json({ success: true, message: `Switched user to ${user.display_name}`, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mock / Real LINE Login OAuth 2.0 callback
router.post('/line-login', (req, res) => {
  try {
    const { lineUserId, displayName, pictureUrl } = req.body;
    if (!lineUserId) {
      return res.status(400).json({ success: false, error: 'lineUserId is required' });
    }

    let user = db.prepare('SELECT * FROM users WHERE line_user_id = ?').get(lineUserId);
    if (!user) {
      const newId = 'usr_' + Date.now().toString(36);
      db.prepare(`
        INSERT INTO users (id, line_user_id, display_name, picture_url, role, status)
        VALUES (?, ?, ?, ?, 'user', 'active')
      `).run(newId, lineUserId, displayName || 'ผู้ใช้ LINE', pictureUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150', 'user', 'active');
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(newId);
    }

    currentUserId = user.id;
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
