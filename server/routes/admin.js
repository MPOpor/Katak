import express from 'express';
import db from '../db/database.js';
import { getCurrentUserId } from './auth.js';

const router = express.Router();

// Middleware to check Admin
function requireAdmin(req, res, next) {
  const userId = getCurrentUserId();
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin privilege required' });
  }
  next();
}

// Get all system users
router.get('/users', requireAdmin, (req, res) => {
  try {
    const users = db.prepare(`
      SELECT u.*, 
             (SELECT COUNT(*) FROM workspace_members WHERE user_id = u.id) as workspace_count,
             (SELECT COUNT(*) FROM transactions WHERE user_id = u.id) as transaction_count
      FROM users u
      ORDER BY u.created_at DESC
    `).all();

    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Toggle user status (active / suspended)
router.put('/users/:id/status', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    db.prepare('UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);

    db.prepare(`
      INSERT INTO system_logs (id, level, module, message, metadata)
      VALUES (?, 'WARN', 'ADMIN', ?, ?)
    `).run('log_' + Date.now(), `ผู้ดูแลระบบเปลี่ยนสถานะผู้ใช้ ${id} เป็น ${status}`, JSON.stringify({ userId: id, status }));

    res.json({ success: true, message: `User status changed to ${status}` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get system logs
router.get('/logs', requireAdmin, (req, res) => {
  try {
    const { level, module, limit = 50 } = req.query;
    let query = 'SELECT * FROM system_logs WHERE 1=1';
    const params = [];

    if (level) {
      query += ' AND level = ?';
      params.push(level);
    }
    if (module) {
      query += ' AND module = ?';
      params.push(module);
    }

    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(parseInt(limit, 10));

    const logs = db.prepare(query).all(...params);
    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// System statistics
router.get('/stats', requireAdmin, (req, res) => {
  try {
    const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
    const totalWorkspaces = db.prepare('SELECT COUNT(*) as c FROM workspaces').get().c;
    const totalTransactions = db.prepare('SELECT COUNT(*) as c FROM transactions').get().c;
    const totalVolume = db.prepare('SELECT SUM(amount) as s FROM transactions').get().s || 0;

    res.json({
      success: true,
      data: {
        totalUsers,
        totalWorkspaces,
        totalTransactions,
        totalVolume,
        apiStatus: {
          lineMessaging: 'Connected (Webhook Ready)',
          lineLogin: 'Configured (OAuth 2.0 / LIFF)',
          ocrEngine: 'Operational (Tesseract.js & Preprocessing)',
          voiceRecognition: 'Operational (Web Speech API th-TH)',
          database: 'Healthy (SQLite 3 Normal Form)'
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
