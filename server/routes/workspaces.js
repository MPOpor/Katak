import express from 'express';
import db from '../db/database.js';
import { getCurrentUserId } from './auth.js';

const router = express.Router();

// Get all workspaces the current user has access to
router.get('/', (req, res) => {
  try {
    const userId = getCurrentUserId();
    const workspaces = db.prepare(`
      SELECT w.*, wm.role as user_role, wm.can_add, wm.can_edit, wm.can_delete, wm.can_view_reports,
             (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = w.id) as member_count
      FROM workspaces w
      JOIN workspace_members wm ON w.id = wm.workspace_id
      WHERE wm.user_id = ?
      ORDER BY w.created_at ASC
    `).all(userId);

    res.json({ success: true, data: workspaces });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single workspace with details and members
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const userId = getCurrentUserId();

    const workspace = db.prepare(`
      SELECT w.*, wm.role as user_role, wm.can_add, wm.can_edit, wm.can_delete, wm.can_view_reports
      FROM workspaces w
      JOIN workspace_members wm ON w.id = wm.workspace_id
      WHERE w.id = ? AND wm.user_id = ?
    `).get(id, userId);

    if (!workspace) {
      return res.status(404).json({ success: false, error: 'Workspace not found or access denied' });
    }

    const members = db.prepare(`
      SELECT wm.*, u.display_name, u.picture_url, u.role as system_role
      FROM workspace_members wm
      JOIN users u ON wm.user_id = u.id
      WHERE wm.workspace_id = ?
      ORDER BY wm.role DESC, wm.joined_at ASC
    `).all(id);

    res.json({ success: true, data: { ...workspace, members } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create new workspace
router.post('/', (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { name, type, description, budget_limit, icon, color } = req.body;

    if (!name || !type) {
      return res.status(400).json({ success: false, error: 'Name and type are required' });
    }

    const wsId = 'ws_' + Date.now().toString(36);

    const insertWs = db.prepare(`
      INSERT INTO workspaces (id, name, type, owner_id, description, budget_limit, icon, color)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMember = db.prepare(`
      INSERT INTO workspace_members (id, workspace_id, user_id, role, can_add, can_edit, can_delete, can_view_reports)
      VALUES (?, ?, ?, 'owner', 1, 1, 1, 1)
    `);

    db.transaction(() => {
      insertWs.run(
        wsId,
        name,
        type,
        userId,
        description || '',
        budget_limit || 0,
        icon || (type === 'merchant' ? 'Store' : type === 'group' ? 'Users' : 'Wallet'),
        color || (type === 'merchant' ? '#ED2E92' : type === 'group' ? '#6366F1' : '#10B981')
      );
      insertMember.run('wm_' + Date.now().toString(36), wsId, userId);

      // Create default categories for this workspace
      const insertCat = db.prepare(`
        INSERT INTO categories (id, workspace_id, name, type, icon, color, is_default)
        VALUES (?, ?, ?, ?, ?, ?, 1)
      `);

      if (type === 'merchant') {
        insertCat.run('cat_' + Date.now() + '_1', wsId, 'ขายของหน้าร้าน', 'income', 'ShoppingBag', '#10B981');
        insertCat.run('cat_' + Date.now() + '_2', wsId, 'ขายออนไลน์', 'income', 'Globe', '#059669');
        insertCat.run('cat_' + Date.now() + '_3', wsId, 'ค่าสินค้า/วัตถุดิบ', 'expense', 'Package', '#F59E0B');
        insertCat.run('cat_' + Date.now() + '_4', wsId, 'ค่าแรงงาน', 'expense', 'UserCheck', '#EC4899');
        insertCat.run('cat_' + Date.now() + '_5', wsId, 'ค่าเช่าสถานที่', 'expense', 'Home', '#8B5CF6');
        insertCat.run('cat_' + Date.now() + '_6', wsId, 'ค่าสาธารณูปโภค', 'expense', 'Zap', '#EF4444');
      } else {
        insertCat.run('cat_' + Date.now() + '_1', wsId, 'เงินเดือน/รายได้', 'income', 'Briefcase', '#10B981');
        insertCat.run('cat_' + Date.now() + '_2', wsId, 'ค่าอาหารและเครื่องดื่ม', 'expense', 'Coffee', '#F97316');
        insertCat.run('cat_' + Date.now() + '_3', wsId, 'ค่าเดินทาง', 'expense', 'Car', '#3B82F6');
        insertCat.run('cat_' + Date.now() + '_4', wsId, 'ของใช้/ช้อปปิ้ง', 'expense', 'ShoppingCart', '#EC4899');
      }

      // Log to Audit Trail
      db.prepare(`
        INSERT INTO audit_logs (id, workspace_id, user_id, action, entity_id, details)
        VALUES (?, ?, ?, 'create_workspace', ?, ?)
      `).run('aud_' + Date.now(), wsId, userId, wsId, `สร้างพื้นที่การเงินใหม่: ${name} (${type})`);
    })();

    res.json({ success: true, data: { id: wsId, name, type } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update workspace settings (Budget, Name, etc.)
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const userId = getCurrentUserId();
    const { name, description, budget_limit, color, icon } = req.body;

    // Check if user is owner
    const member = db.prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?').get(id, userId);
    if (!member || member.role !== 'owner') {
      return res.status(403).json({ success: false, error: 'Only workspace owner can update settings' });
    }

    db.prepare(`
      UPDATE workspaces
      SET name = COALESCE(?, name),
          description = COALESCE(?, description),
          budget_limit = COALESCE(?, budget_limit),
          color = COALESCE(?, color),
          icon = COALESCE(?, icon),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, description, budget_limit, color, icon, id);

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, workspace_id, user_id, action, entity_id, details)
      VALUES (?, ?, ?, 'update_workspace', ?, ?)
    `).run('aud_' + Date.now(), id, userId, id, `อัปเดตการตั้งค่า/งบประมาณเป็น ${budget_limit || 0} บาท`);

    res.json({ success: true, message: 'Workspace updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete workspace
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const userId = getCurrentUserId();

    if (id === 'ws_thanachote') {
      return res.status(400).json({ success: false, error: 'ไม่สามารถลบพื้นที่หลักของร้านได้' });
    }

    const workspace = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(id);
    if (!workspace) {
      return res.status(404).json({ success: false, error: 'ไม่พบพื้นที่การเงินนี้' });
    }

    const member = db.prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?').get(id, userId);
    if (!member || member.role !== 'owner') {
      return res.status(403).json({ success: false, error: 'เฉพาะเจ้าของพื้นที่เท่านั้นที่สามารถลบได้' });
    }

    db.prepare('DELETE FROM audit_logs WHERE workspace_id = ?').run(id);
    db.prepare('DELETE FROM transactions WHERE workspace_id = ?').run(id);
    db.prepare('DELETE FROM categories WHERE workspace_id = ?').run(id);
    db.prepare('DELETE FROM workspace_invites WHERE workspace_id = ?').run(id);
    db.prepare('DELETE FROM workspace_members WHERE workspace_id = ?').run(id);
    db.prepare('DELETE FROM workspaces WHERE id = ?').run(id);

    res.json({ success: true, message: `ลบพื้นที่การเงิน "${workspace.name}" สำเร็จ` });
  } catch (error) {
    console.error('Delete workspace error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update member permissions (RBAC)
router.put('/:id/members/:userId', (req, res) => {
  try {
    const { id: workspaceId, userId: targetUserId } = req.params;
    const currentUserId = getCurrentUserId();
    const { role, can_add, can_edit, can_delete, can_view_reports } = req.body;

    // Check if requester is owner
    const requester = db.prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?').get(workspaceId, currentUserId);
    if (!requester || requester.role !== 'owner') {
      return res.status(403).json({ success: false, error: 'Only owner can change member permissions' });
    }

    db.prepare(`
      UPDATE workspace_members
      SET role = COALESCE(?, role),
          can_add = COALESCE(?, can_add),
          can_edit = COALESCE(?, can_edit),
          can_delete = COALESCE(?, can_delete),
          can_view_reports = COALESCE(?, can_view_reports)
      WHERE workspace_id = ? AND user_id = ?
    `).run(role, can_add, can_edit, can_delete, can_view_reports, workspaceId, targetUserId);

    db.prepare(`
      INSERT INTO audit_logs (id, workspace_id, user_id, action, entity_id, details)
      VALUES (?, ?, ?, 'update_member_role', ?, ?)
    `).run('aud_' + Date.now(), workspaceId, currentUserId, targetUserId, `ปรับเปลี่ยนสิทธิ์สมาชิก (${role || 'member'})`);

    res.json({ success: true, message: 'Member permissions updated' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get or create invite link / code
router.get('/:id/invite', (req, res) => {
  try {
    const { id } = req.params;
    const userId = getCurrentUserId();

    let invite = db.prepare('SELECT * FROM workspace_invites WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 1').get(id);
    if (!invite) {
      const code = 'INV-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      const inviteId = 'inv_' + Date.now();
      db.prepare(`
        INSERT INTO workspace_invites (id, workspace_id, invite_code, created_by)
        VALUES (?, ?, ?, ?)
      `).run(inviteId, id, code, userId);
      invite = { id: inviteId, workspace_id: id, invite_code: code };
    }

    const inviteUrl = `${req.protocol}://${req.get('host')}/join?code=${invite.invite_code}`;
    res.json({ success: true, data: { ...invite, inviteUrl } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Join workspace using code
router.post('/join', (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { inviteCode } = req.body;

    if (!inviteCode) {
      return res.status(400).json({ success: false, error: 'Invite code is required' });
    }

    const invite = db.prepare('SELECT * FROM workspace_invites WHERE invite_code = ?').get(inviteCode);
    if (!invite) {
      return res.status(404).json({ success: false, error: 'Invalid or expired invite code' });
    }

    // Check if already member
    const existing = db.prepare('SELECT * FROM workspace_members WHERE workspace_id = ? AND user_id = ?').get(invite.workspace_id, userId);
    if (existing) {
      return res.json({ success: true, message: 'You are already a member of this workspace', workspaceId: invite.workspace_id });
    }

    db.prepare(`
      INSERT INTO workspace_members (id, workspace_id, user_id, role, can_add, can_edit, can_delete, can_view_reports)
      VALUES (?, ?, ?, 'member', 1, 1, 0, 1)
    `).run('wm_' + Date.now(), invite.workspace_id, userId);

    db.prepare('UPDATE workspace_invites SET used_count = used_count + 1 WHERE id = ?').run(invite.id);

    db.prepare(`
      INSERT INTO audit_logs (id, workspace_id, user_id, action, entity_id, details)
      VALUES (?, ?, ?, 'join_group', ?, ?)
    `).run('aud_' + Date.now(), invite.workspace_id, userId, invite.workspace_id, 'เข้าร่วมพื้นที่การเงินผ่านลิงก์คำเชิญ');

    res.json({ success: true, message: 'Joined workspace successfully', workspaceId: invite.workspace_id });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
