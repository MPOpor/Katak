import express from 'express';
import db from '../db/database.js';

const router = express.Router();

// Get categories by workspace_id
router.get('/', (req, res) => {
  try {
    const { workspace_id, type } = req.query;
    let query = 'SELECT * FROM categories WHERE (workspace_id = ? OR workspace_id IS NULL)';
    const params = [workspace_id];

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    query += ' ORDER BY is_default DESC, name ASC';
    const categories = db.prepare(query).all(...params);
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create custom category
router.post('/', (req, res) => {
  try {
    const { workspace_id, name, type, icon, color } = req.body;
    if (!workspace_id || !name || !type) {
      return res.status(400).json({ success: false, error: 'workspace_id, name, and type are required' });
    }

    const catId = 'cat_' + Date.now().toString(36);
    db.prepare(`
      INSERT INTO categories (id, workspace_id, name, type, icon, color, is_default)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `).run(catId, workspace_id, name, type, icon || 'Tags', color || '#3B82F6');

    const created = db.prepare('SELECT * FROM categories WHERE id = ?').get(catId);
    res.json({ success: true, data: created });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update category
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, icon, color } = req.body;

    db.prepare(`
      UPDATE categories
      SET name = COALESCE(?, name),
          icon = COALESCE(?, icon),
          color = COALESCE(?, color)
      WHERE id = ?
    `).run(name, icon, color, id);

    res.json({ success: true, message: 'Category updated' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete category
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    // Check if transactions exist with this category
    const count = db.prepare('SELECT COUNT(*) as count FROM transactions WHERE category_id = ?').get(id).count;
    if (count > 0) {
      return res.status(400).json({ success: false, error: `ไม่สามารถลบได้เนื่องจากมี ${count} รายการที่ใช้หมวดหมู่นี้อยู่` });
    }

    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    res.json({ success: true, message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
