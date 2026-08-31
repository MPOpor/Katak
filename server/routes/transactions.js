import express from 'express';
import db from '../db/database.js';
import { getCurrentUserId } from './auth.js';

const router = express.Router();

// Helper to calculate date range based on period
function getDateRangeFilter(period, customStart, customEnd) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  if (period === 'today') {
    return { start: todayStr, end: todayStr };
  } else if (period === 'week') {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(now.getDate() - 7);
    return {
      start: oneWeekAgo.toISOString().split('T')[0],
      end: todayStr
    };
  } else if (period === 'month') {
    const firstDay = `${year}-${month}-01`;
    const lastDay = new Date(year, now.getMonth() + 1, 0).toISOString().split('T')[0];
    return { start: firstDay, end: lastDay };
  } else if (period === 'year') {
    return { start: `${year}-01-01`, end: `${year}-12-31` };
  } else if (period === 'custom' && customStart && customEnd) {
    return { start: customStart, end: customEnd };
  }
  return null; // All time
}

// Get transactions with filters
router.get('/', (req, res) => {
  try {
    const { workspace_id, period = 'month', startDate, endDate, type, category_id, user_id, search } = req.query;

    if (!workspace_id) {
      return res.status(400).json({ success: false, error: 'workspace_id is required' });
    }

    let query = `
      SELECT t.*, 
             c.name as category_name, c.icon as category_icon, c.color as category_color,
             u.display_name as user_name, u.picture_url as user_picture
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN users u ON t.user_id = u.id
      WHERE t.workspace_id = ?
    `;
    const params = [workspace_id];

    // Date range filter
    const dateRange = getDateRangeFilter(period, startDate, endDate);
    if (dateRange) {
      query += ' AND t.transaction_date >= ? AND t.transaction_date <= ?';
      params.push(dateRange.start, dateRange.end);
    }

    if (type) {
      query += ' AND t.type = ?';
      params.push(type);
    }

    if (category_id) {
      query += ' AND t.category_id = ?';
      params.push(category_id);
    }

    if (user_id) {
      query += ' AND t.user_id = ?';
      params.push(user_id);
    }

    if (search) {
      query += ' AND (t.note LIKE ? OR c.name LIKE ? OR u.display_name LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    query += ' ORDER BY t.transaction_date DESC, t.created_at DESC';

    const transactions = db.prepare(query).all(...params);
    res.json({ success: true, data: transactions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create new transaction
router.post('/', (req, res) => {
  try {
    const userId = getCurrentUserId();
    const {
      workspace_id,
      category_id,
      type,
      amount,
      note,
      slip_url,
      input_method = 'manual',
      raw_ocr_text,
      ocr_verified = 0,
      ocr_metadata,
      transaction_date
    } = req.body;

    if (!workspace_id || !category_id || !type || !amount) {
      return res.status(400).json({ success: false, error: 'workspace_id, category_id, type, and amount are required' });
    }

    // Check RBAC permission for this workspace
    const member = db.prepare('SELECT * FROM workspace_members WHERE workspace_id = ? AND user_id = ?').get(workspace_id, userId);
    if (!member || (!member.can_add && member.role !== 'owner')) {
      return res.status(403).json({ success: false, error: 'คุณไม่มีสิทธิ์เพิ่มรายการในพื้นที่การเงินนี้' });
    }

    const txId = 'tx_' + Date.now().toString(36);
    const dateStr = transaction_date || new Date().toISOString().split('T')[0];

    const insertTx = db.prepare(`
      INSERT INTO transactions (
        id, workspace_id, user_id, category_id, type, amount, note,
        slip_url, input_method, raw_ocr_text, ocr_verified, ocr_metadata, transaction_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertTx.run(
      txId,
      workspace_id,
      userId,
      category_id,
      type,
      parseFloat(amount),
      note || '',
      slip_url || null,
      input_method,
      raw_ocr_text || null,
      ocr_verified ? 1 : 0,
      ocr_metadata ? (typeof ocr_metadata === 'object' ? JSON.stringify(ocr_metadata) : ocr_metadata) : null,
      dateStr
    );

    // Get category name for audit log
    const cat = db.prepare('SELECT name FROM categories WHERE id = ?').get(category_id);
    const catName = cat ? cat.name : 'หมวดหมู่';

    // Log to Audit Trail
    db.prepare(`
      INSERT INTO audit_logs (id, workspace_id, user_id, action, entity_id, details)
      VALUES (?, ?, ?, 'create_transaction', ?, ?)
    `).run(
      'aud_' + Date.now(),
      workspace_id,
      userId,
      txId,
      `บันทึก${type === 'income' ? 'รายรับ' : 'รายจ่าย'} ${parseFloat(amount).toLocaleString()} บาท (${catName}) ผ่าน ${input_method.toUpperCase()}`
    );

    const created = db.prepare(`
      SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
             u.display_name as user_name, u.picture_url as user_picture
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN users u ON t.user_id = u.id
      WHERE t.id = ?
    `).get(txId);

    res.json({ success: true, data: created });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update transaction (RBAC: check can_edit or owner)
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const userId = getCurrentUserId();
    const { category_id, type, amount, note, slip_url, transaction_date } = req.body;

    const tx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
    if (!tx) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    const member = db.prepare('SELECT * FROM workspace_members WHERE workspace_id = ? AND user_id = ?').get(tx.workspace_id, userId);
    if (!member || (!member.can_edit && member.role !== 'owner' && tx.user_id !== userId)) {
      return res.status(403).json({ success: false, error: 'คุณไม่มีสิทธิ์แก้ไขรายการนี้' });
    }

    db.prepare(`
      UPDATE transactions
      SET category_id = COALESCE(?, category_id),
          type = COALESCE(?, type),
          amount = COALESCE(?, amount),
          note = COALESCE(?, note),
          slip_url = COALESCE(?, slip_url),
          transaction_date = COALESCE(?, transaction_date),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(category_id, type, amount ? parseFloat(amount) : null, note, slip_url, transaction_date, id);

    db.prepare(`
      INSERT INTO audit_logs (id, workspace_id, user_id, action, entity_id, details)
      VALUES (?, ?, ?, 'edit_transaction', ?, ?)
    `).run('aud_' + Date.now(), tx.workspace_id, userId, id, `แก้ไขรายการ ${id} (จำนวนเงิน: ${amount || tx.amount} บาท)`);

    res.json({ success: true, message: 'Transaction updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete transaction (RBAC: check can_delete or owner)
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const userId = getCurrentUserId();

    const tx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
    if (!tx) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    const member = db.prepare('SELECT * FROM workspace_members WHERE workspace_id = ? AND user_id = ?').get(tx.workspace_id, userId);
    if (!member || (!member.can_delete && member.role !== 'owner')) {
      return res.status(403).json({ success: false, error: 'คุณไม่มีสิทธิ์ลบรายการนี้ (ต้องได้รับสิทธิ์จากเจ้าของพื้นที่)' });
    }

    db.prepare('DELETE FROM transactions WHERE id = ?').run(id);

    db.prepare(`
      INSERT INTO audit_logs (id, workspace_id, user_id, action, entity_id, details)
      VALUES (?, ?, ?, 'delete_transaction', ?, ?)
    `).run('aud_' + Date.now(), tx.workspace_id, userId, id, `ลบรายการธุรกรรม ${id} (ยอดเงิน: ${tx.amount.toLocaleString()} บาท)`);

    res.json({ success: true, message: 'Transaction deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get Audit Trail for workspace
router.get('/audit-trail', (req, res) => {
  try {
    const { workspace_id } = req.query;
    if (!workspace_id) {
      return res.status(400).json({ success: false, error: 'workspace_id is required' });
    }

    const logs = db.prepare(`
      SELECT a.*, u.display_name as user_name, u.picture_url as user_picture
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.workspace_id = ?
      ORDER BY a.created_at DESC
      LIMIT 100
    `).all(workspace_id);

    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
