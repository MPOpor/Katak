import db, { initDatabase } from './database.js';

export function seedData() {
  initDatabase();

  // Clear existing data
  db.exec(`
    DELETE FROM audit_logs;
    DELETE FROM system_logs;
    DELETE FROM transactions;
    DELETE FROM categories;
    DELETE FROM workspace_members;
    DELETE FROM workspace_invites;
    DELETE FROM workspaces;
    DELETE FROM users;
  `);

  console.log('🧹 Cleared old tables. Seeding realistic data...');

  // 1. Users
  const insertUser = db.prepare(`
    INSERT INTO users (id, line_user_id, display_name, picture_url, role, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const users = [
    {
      id: 'usr_nicha',
      line_user_id: 'U719338ac91753cefe6374e6a2bbf851f',
      display_name: 'ณิชา ทองอยู่ (เจ้าของร้าน)',
      picture_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      role: 'admin',
      status: 'active'
    },
    {
      id: 'usr_kanjanaporn',
      line_user_id: 'U444455556666kanjana',
      display_name: 'กัญจนพร จตุรพรพรหม',
      picture_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
      role: 'user',
      status: 'active'
    },
    {
      id: 'usr_somchai',
      line_user_id: 'U777788889999somchai',
      display_name: 'สมชาย ผู้ช่วยขาย',
      picture_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
      role: 'user',
      status: 'active'
    },
    {
      id: 'usr_admin',
      line_user_id: 'U000000000000admin',
      display_name: 'Admin ระบบส่วนกลาง',
      picture_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
      role: 'admin',
      status: 'active'
    }
  ];

  for (const u of users) {
    insertUser.run(u.id, u.line_user_id, u.display_name, u.picture_url, u.role, u.status);
  }

  // 2. Workspaces
  const insertWorkspace = db.prepare(`
    INSERT INTO workspaces (id, name, type, owner_id, description, budget_limit, icon, color)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const workspaces = [
    {
      id: 'ws_thanachote',
      name: 'ร้านขายของฝากไร่ธนโชติ',
      type: 'merchant',
      owner_id: 'usr_nicha',
      description: 'ระบบบัญชีรายรับ-รายจ่ายร้านขายของฝากและผลิตภัณฑ์แปรรูปการเกษตร ไร่ธนโชติ',
      budget_limit: 45000,
      icon: 'Store',
      color: '#ED2E92'
    },
    {
      id: 'ws_personal',
      name: 'กระเป๋าเงินส่วนตัว (ณิชา)',
      type: 'personal',
      owner_id: 'usr_nicha',
      description: 'บัญชีรายรับ-รายจ่ายส่วนตัว ค่ากินอยู่ ช้อปปิ้ง',
      budget_limit: 18000,
      icon: 'Wallet',
      color: '#10B981'
    },
    {
      id: 'ws_family',
      name: 'กองทุนครอบครัว & บ้าน',
      type: 'group',
      owner_id: 'usr_nicha',
      description: 'กองทุนกลางสำหรับค่าใช้จ่ายส่วนรวมภายในครอบครัว',
      budget_limit: 30000,
      icon: 'Users',
      color: '#6366F1'
    }
  ];

  for (const w of workspaces) {
    insertWorkspace.run(w.id, w.name, w.type, w.owner_id, w.description, w.budget_limit, w.icon, w.color);
  }

  // 3. Workspace Members (RBAC)
  const insertMember = db.prepare(`
    INSERT INTO workspace_members (id, workspace_id, user_id, role, can_add, can_edit, can_delete, can_view_reports)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const members = [
    // Thanachote Merchant Members
    { id: 'wm_1', workspace_id: 'ws_thanachote', user_id: 'usr_nicha', role: 'owner', can_add: 1, can_edit: 1, can_delete: 1, can_view_reports: 1 },
    { id: 'wm_2', workspace_id: 'ws_thanachote', user_id: 'usr_kanjanaporn', role: 'member', can_add: 1, can_edit: 1, can_delete: 0, can_view_reports: 1 },
    { id: 'wm_3', workspace_id: 'ws_thanachote', user_id: 'usr_somchai', role: 'member', can_add: 1, can_edit: 0, can_delete: 0, can_view_reports: 0 },
    // Personal
    { id: 'wm_4', workspace_id: 'ws_personal', user_id: 'usr_nicha', role: 'owner', can_add: 1, can_edit: 1, can_delete: 1, can_view_reports: 1 },
    // Family
    { id: 'wm_5', workspace_id: 'ws_family', user_id: 'usr_nicha', role: 'owner', can_add: 1, can_edit: 1, can_delete: 1, can_view_reports: 1 },
    { id: 'wm_6', workspace_id: 'ws_family', user_id: 'usr_kanjanaporn', role: 'member', can_add: 1, can_edit: 1, can_delete: 0, can_view_reports: 1 }
  ];

  for (const m of members) {
    insertMember.run(m.id, m.workspace_id, m.user_id, m.role, m.can_add, m.can_edit, m.can_delete, m.can_view_reports);
  }

  // 4. Categories
  const insertCategory = db.prepare(`
    INSERT INTO categories (id, workspace_id, name, type, icon, color, is_default)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const categories = [
    // Thanachote Categories
    { id: 'cat_t_inc_1', workspace_id: 'ws_thanachote', name: 'ขายของหน้าร้าน', type: 'income', icon: 'ShoppingBag', color: '#10B981', is_default: 1 },
    { id: 'cat_t_inc_2', workspace_id: 'ws_thanachote', name: 'ขายออนไลน์ (Shopee/TikTok)', type: 'income', icon: 'Globe', color: '#059669', is_default: 1 },
    { id: 'cat_t_inc_3', workspace_id: 'ws_thanachote', name: 'รับจัดกระเช้าของฝาก', type: 'income', icon: 'Gift', color: '#34D399', is_default: 0 },
    
    { id: 'cat_t_exp_1', workspace_id: 'ws_thanachote', name: 'ค่าสินค้า/วัตถุดิบ', type: 'expense', icon: 'Package', color: '#F59E0B', is_default: 1 },
    { id: 'cat_t_exp_2', workspace_id: 'ws_thanachote', name: 'ค่าแรงงาน', type: 'expense', icon: 'UserCheck', color: '#EC4899', is_default: 1 },
    { id: 'cat_t_exp_3', workspace_id: 'ws_thanachote', name: 'ค่าเช่าสถานที่', type: 'expense', icon: 'Home', color: '#8B5CF6', is_default: 1 },
    { id: 'cat_t_exp_4', workspace_id: 'ws_thanachote', name: 'ค่าสาธารณูปโภค', type: 'expense', icon: 'Zap', color: '#EF4444', is_default: 1 },
    { id: 'cat_t_exp_5', workspace_id: 'ws_thanachote', name: 'ค่าบรรจุภัณฑ์/กล่อง', type: 'expense', icon: 'Box', color: '#D97706', is_default: 0 },
    { id: 'cat_t_exp_6', workspace_id: 'ws_thanachote', name: 'ค่าขนส่ง/ส่งพัสดุ', type: 'expense', icon: 'Truck', color: '#3B82F6', is_default: 0 },
    { id: 'cat_t_exp_7', workspace_id: 'ws_thanachote', name: 'ค่าใช้จ่ายทั่วไป', type: 'expense', icon: 'FileText', color: '#6B7280', is_default: 1 },

    // Personal & Family Categories
    { id: 'cat_p_inc_1', workspace_id: 'ws_personal', name: 'เงินเดือน/รายได้หลัก', type: 'income', icon: 'Briefcase', color: '#10B981', is_default: 1 },
    { id: 'cat_p_inc_2', workspace_id: 'ws_personal', name: 'เงินปันผล/รายได้เสริม', type: 'income', icon: 'TrendingUp', color: '#059669', is_default: 0 },
    { id: 'cat_p_exp_1', workspace_id: 'ws_personal', name: 'ค่าอาหารและเครื่องดื่ม', type: 'expense', icon: 'Coffee', color: '#F97316', is_default: 1 },
    { id: 'cat_p_exp_2', workspace_id: 'ws_personal', name: 'ค่าเดินทาง/ยานพาหนะ', type: 'expense', icon: 'Car', color: '#3B82F6', is_default: 1 },
    { id: 'cat_p_exp_3', workspace_id: 'ws_personal', name: 'ช้อปปิ้งและของใช้', type: 'expense', icon: 'ShoppingCart', color: '#EC4899', is_default: 1 },
    { id: 'cat_p_exp_4', workspace_id: 'ws_personal', name: 'สุขภาพและการแพทย์', type: 'expense', icon: 'HeartPulse', color: '#EF4444', is_default: 0 }
  ];

  for (const c of categories) {
    insertCategory.run(c.id, c.workspace_id, c.name, c.type, c.icon, c.color, c.is_default);
  }

  // 5. Seed Transactions for Thanachote Souvenir Shop
  const insertTx = db.prepare(`
    INSERT INTO transactions (id, workspace_id, user_id, category_id, type, amount, note, slip_url, input_method, raw_ocr_text, ocr_verified, ocr_metadata, transaction_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const todayStr = '2026-08-24';
  const yesterdayStr = '2026-08-23';
  const day22Str = '2026-08-22';
  const day20Str = '2026-08-20';
  const day18Str = '2026-08-18';
  const day15Str = '2026-08-15';
  const day10Str = '2026-08-10';
  const day05Str = '2026-08-05';
  const day01Str = '2026-08-01';

  const txs = [
    // Today
    {
      id: 'tx_t_1',
      workspace_id: 'ws_thanachote',
      user_id: 'usr_nicha',
      category_id: 'cat_t_inc_1',
      type: 'income',
      amount: 1500,
      note: 'ลูกค้าสแกนจ่ายกล้วยตากอบน้ำผึ้งและมะขามแช่อิ่ม 5 กล่อง',
      slip_url: '/sample-slips/slip_kbank_1500.png',
      input_method: 'ocr',
      raw_ocr_text: 'ธนาคารกสิกรไทย โอนเงินสำเร็จ 1,500.00 บาท ไปยัง ร้านขายของฝากไร่ธนโชติ',
      ocr_verified: 1,
      ocr_metadata: JSON.stringify({ bank: 'KBank', ref: '202608240987KBANK991', time: '14:25' }),
      transaction_date: todayStr
    },
    {
      id: 'tx_t_2',
      workspace_id: 'ws_thanachote',
      user_id: 'usr_kanjanaporn',
      category_id: 'cat_t_inc_1',
      type: 'income',
      amount: 3200,
      note: 'ขายของฝากชุดของขวัญให้นักท่องเที่ยว 3 ชุด',
      slip_url: null,
      input_method: 'voice',
      raw_ocr_text: null,
      ocr_verified: 0,
      ocr_metadata: null,
      transaction_date: todayStr
    },
    {
      id: 'tx_t_3',
      workspace_id: 'ws_thanachote',
      user_id: 'usr_kanjanaporn',
      category_id: 'cat_t_exp_7',
      type: 'expense',
      amount: 245,
      note: 'ซื้อของใช้ทำความสะอาดร้าน ถุงขยะ และทิชชู่',
      slip_url: '/sample-slips/receipt_7eleven_245.png',
      input_method: 'ocr',
      raw_ocr_text: '7-ELEVEN ไร่ธนโชติ รวมทั้งสิ้น 245.00 บาท',
      ocr_verified: 1,
      ocr_metadata: JSON.stringify({ bank: '7-Eleven', time: '08:30' }),
      transaction_date: todayStr
    },
    // Yesterday
    {
      id: 'tx_t_4',
      workspace_id: 'ws_thanachote',
      user_id: 'usr_nicha',
      category_id: 'cat_t_exp_4',
      type: 'expense',
      amount: 800,
      note: 'บิลค่าไฟฟ้าประจำเดือน สิงหาคม 2569 ร้านไร่ธนโชติ',
      slip_url: '/sample-slips/slip_scb_800.png',
      input_method: 'ocr',
      raw_ocr_text: 'SCB EASY โอนเงินสำเร็จ 800.00 บาท ไปยัง การไฟฟ้าส่วนภูมิภาค',
      ocr_verified: 1,
      ocr_metadata: JSON.stringify({ bank: 'SCB', ref: 'SCB9928172645100', time: '10:15' }),
      transaction_date: yesterdayStr
    },
    {
      id: 'tx_t_5',
      workspace_id: 'ws_thanachote',
      user_id: 'usr_somchai',
      category_id: 'cat_t_inc_1',
      type: 'income',
      amount: 4500,
      note: 'ยอดขายหน้าร้านรวมช่วงบ่าย',
      slip_url: null,
      input_method: 'manual',
      raw_ocr_text: null,
      ocr_verified: 0,
      ocr_metadata: null,
      transaction_date: yesterdayStr
    },
    // Past days
    {
      id: 'tx_t_6',
      workspace_id: 'ws_thanachote',
      user_id: 'usr_nicha',
      category_id: 'cat_t_exp_1',
      type: 'expense',
      amount: 1250,
      note: 'สั่งกล่องกระดาษคราฟท์ใส่ของฝาก 200 ชิ้น',
      slip_url: '/sample-slips/slip_promptpay_1250.png',
      input_method: 'ocr',
      raw_ocr_text: 'PromptPay โอนเงินสำเร็จ 1,250.00 บาท ไปยัง โรงงานกล่องบรรจุภัณฑ์ไทย',
      ocr_verified: 1,
      ocr_metadata: JSON.stringify({ bank: 'PromptPay', ref: 'PP20260822998811' }),
      transaction_date: day22Str
    },
    {
      id: 'tx_t_7',
      workspace_id: 'ws_thanachote',
      user_id: 'usr_kanjanaporn',
      category_id: 'cat_t_exp_2',
      type: 'expense',
      amount: 500,
      note: 'จ่ายค่าแรงรายวันพนักงานช่วยขายหน้าร้าน',
      slip_url: null,
      input_method: 'voice',
      raw_ocr_text: null,
      ocr_verified: 0,
      ocr_metadata: null,
      transaction_date: day20Str
    },
    {
      id: 'tx_t_8',
      workspace_id: 'ws_thanachote',
      user_id: 'usr_nicha',
      category_id: 'cat_t_inc_2',
      type: 'income',
      amount: 5600,
      note: 'ยอดโอนรับเงินจาก Shopee และ TikTok Shop ประจำสัปดาห์',
      slip_url: null,
      input_method: 'manual',
      raw_ocr_text: null,
      ocr_verified: 0,
      ocr_metadata: null,
      transaction_date: day18Str
    },
    {
      id: 'tx_t_9',
      workspace_id: 'ws_thanachote',
      user_id: 'usr_nicha',
      category_id: 'cat_t_exp_1',
      type: 'expense',
      amount: 8500,
      note: 'รับซื้อมะขามหวานและกล้วยน้ำว้าจากเกษตรกรในเครือข่าย',
      slip_url: null,
      input_method: 'manual',
      raw_ocr_text: null,
      ocr_verified: 0,
      ocr_metadata: null,
      transaction_date: day15Str
    },
    {
      id: 'tx_t_10',
      workspace_id: 'ws_thanachote',
      user_id: 'usr_nicha',
      category_id: 'cat_t_exp_3',
      type: 'expense',
      amount: 5000,
      note: 'จ่ายค่าเช่าแผงร้านขายของฝาก ประจำเดือน ส.ค.',
      slip_url: null,
      input_method: 'manual',
      raw_ocr_text: null,
      ocr_verified: 0,
      ocr_metadata: null,
      transaction_date: day01Str
    },
    {
      id: 'tx_t_11',
      workspace_id: 'ws_thanachote',
      user_id: 'usr_somchai',
      category_id: 'cat_t_inc_1',
      type: 'income',
      amount: 8900,
      note: 'ยอดขายวันหยุดยาว เสาร์-อาทิตย์',
      slip_url: null,
      input_method: 'manual',
      raw_ocr_text: null,
      ocr_verified: 0,
      ocr_metadata: null,
      transaction_date: day10Str
    },
    {
      id: 'tx_t_12',
      workspace_id: 'ws_thanachote',
      user_id: 'usr_kanjanaporn',
      category_id: 'cat_t_exp_6',
      type: 'expense',
      amount: 680,
      note: 'ค่าจัดส่งพัสดุ Flash Express ให้ลูกค้าสั่งออนไลน์',
      slip_url: null,
      input_method: 'manual',
      raw_ocr_text: null,
      ocr_verified: 0,
      ocr_metadata: null,
      transaction_date: day05Str
    }
  ];

  for (const t of txs) {
    insertTx.run(
      t.id, t.workspace_id, t.user_id, t.category_id, t.type,
      t.amount, t.note, t.slip_url, t.input_method,
      t.raw_ocr_text, t.ocr_verified, t.ocr_metadata, t.transaction_date
    );
  }

  // 6. Audit Trail Logs
  const insertAudit = db.prepare(`
    INSERT INTO audit_logs (id, workspace_id, user_id, action, entity_id, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const auditLogs = [
    {
      id: 'aud_1',
      workspace_id: 'ws_thanachote',
      user_id: 'usr_nicha',
      action: 'create_transaction',
      entity_id: 'tx_t_1',
      details: 'บันทึกรายรับ 1,500.00 บาท (ขายของหน้าร้าน) ผ่านระบบสแกนสลิป OCR KBank',
      created_at: '2026-08-24 14:26:00'
    },
    {
      id: 'aud_2',
      workspace_id: 'ws_thanachote',
      user_id: 'usr_kanjanaporn',
      action: 'create_transaction',
      entity_id: 'tx_t_2',
      details: 'บันทึกรายรับ 3,200.00 บาท (ขายของหน้าร้าน) ผ่านระบบสั่งการด้วยเสียงภาษาไทย',
      created_at: '2026-08-24 13:10:00'
    },
    {
      id: 'aud_3',
      workspace_id: 'ws_thanachote',
      user_id: 'usr_kanjanaporn',
      action: 'create_transaction',
      entity_id: 'tx_t_3',
      details: 'บันทึกรายจ่าย 245.00 บาท (ค่าใช้จ่ายทั่วไป) ผ่านระบบสแกนใบเสร็จ 7-Eleven OCR',
      created_at: '2026-08-24 08:35:00'
    },
    {
      id: 'aud_4',
      workspace_id: 'ws_thanachote',
      user_id: 'usr_nicha',
      action: 'create_transaction',
      entity_id: 'tx_t_4',
      details: 'บันทึกรายจ่าย 800.00 บาท (ค่าสาธารณูปโภค) ผ่านระบบสแกนสลิป SCB',
      created_at: '2026-08-23 10:18:00'
    },
    {
      id: 'aud_5',
      workspace_id: 'ws_thanachote',
      user_id: 'usr_nicha',
      action: 'update_budget',
      entity_id: 'ws_thanachote',
      details: 'ปรับปรุงงบประมาณประจำเดือนเป็น 45,000.00 บาท',
      created_at: '2026-08-01 09:00:00'
    }
  ];

  for (const a of auditLogs) {
    insertAudit.run(a.id, a.workspace_id, a.user_id, a.action, a.entity_id, a.details, a.created_at);
  }

  // 7. System Logs for Admin
  const insertSysLog = db.prepare(`
    INSERT INTO system_logs (id, level, module, message, metadata, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const sysLogs = [
    {
      id: 'log_1',
      level: 'INFO',
      module: 'AUTH',
      message: 'ผู้ใช้ ณิชา ทองอยู่ เข้าสู่ระบบสำเร็จผ่าน LINE OAuth 2.0',
      metadata: JSON.stringify({ userId: 'usr_nicha', ip: '127.0.0.1' }),
      timestamp: '2026-08-24 14:00:00'
    },
    {
      id: 'log_2',
      level: 'INFO',
      module: 'OCR',
      message: 'ประมวลผลสลิป KBank สำเร็จ ความแม่นยำ 98.5% ยอดเงิน 1,500.00 บาท',
      metadata: JSON.stringify({ bank: 'KBank', amount: 1500 }),
      timestamp: '2026-08-24 14:25:30'
    },
    {
      id: 'log_3',
      level: 'INFO',
      module: 'VOICE',
      message: 'ประมวลผลคำสั่งเสียงภาษาไทยสำเร็จ: "ขายของฝากได้ 3200 บาท"',
      metadata: JSON.stringify({ intent: 'income', category: 'ขายของหน้าร้าน', amount: 3200 }),
      timestamp: '2026-08-24 13:09:45'
    },
    {
      id: 'log_4',
      level: 'WARN',
      module: 'BUDGET',
      message: 'Workspace ws_thanachote ใช้จ่ายไปแล้ว 38.2% ของงบประมาณรายเดือน (17,225/45,000 บาท)',
      metadata: JSON.stringify({ percentage: 38.2, workspaceId: 'ws_thanachote' }),
      timestamp: '2026-08-24 12:00:00'
    }
  ];

  for (const s of sysLogs) {
    insertSysLog.run(s.id, s.level, s.module, s.message, s.metadata, s.timestamp);
  }

  // 8. Default Invite Link
  const insertInvite = db.prepare(`
    INSERT INTO workspace_invites (id, workspace_id, code, role, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertInvite.run('inv_1', 'ws_thanachote', 'THANACHOTE-2026', 'member', '2026-12-31 23:59:59');

  console.log('✅ Seed data created successfully!');
}

// Run directly if called
seedData();
