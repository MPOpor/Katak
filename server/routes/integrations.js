import express from 'express';
import db from '../db/database.js';
import { testDriveConnection, uploadSlipToDrive } from '../services/googleDriveService.js';
import { testSheetsConnection, syncWorkspaceToSheet } from '../services/googleSheetsService.js';
import { getServiceAccountCredentials } from '../services/googleAuth.js';
import { getCurrentUserId } from './auth.js';

const router = express.Router();

// 1. Get Google Integration Status
router.get('/google/status', async (req, res) => {
  try {
    const creds = getServiceAccountCredentials();
    const driveParentId = process.env.GOOGLE_DRIVE_PARENT_ID || process.env.PARENT_FOLDER_ID;
    const spreadsheetId = process.env.SPREADSHEET_ID || process.env.GOOGLE_SPREADSHEET_ID;

    res.json({
      success: true,
      data: {
        isServiceAccountConfigured: !!creds,
        serviceAccountEmail: creds ? creds.client_email : null,
        driveParentFolderId: driveParentId || null,
        spreadsheetId: spreadsheetId || null,
        driveUrl: driveParentId ? `https://drive.google.com/drive/folders/${driveParentId}` : null,
        spreadsheetUrl: spreadsheetId ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit` : null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Test Google Drive & Sheets Connection
router.post('/google/test', async (req, res) => {
  try {
    const { customDriveParentId, customSpreadsheetId } = req.body || {};

    const driveResult = await testDriveConnection(customDriveParentId);
    const sheetsResult = await testSheetsConnection(customSpreadsheetId);

    const overallSuccess = driveResult.success && sheetsResult.success;

    res.json({
      success: overallSuccess,
      data: {
        drive: driveResult,
        sheets: sheetsResult
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. 1-Click Sync Workspace to Google Sheets
router.post('/google/sync', async (req, res) => {
  try {
    const { workspaceId, customSpreadsheetId } = req.body || {};
    const targetWsId = workspaceId || 'ws_thanachote';

    const result = await syncWorkspaceToSheet(targetWsId, customSpreadsheetId);

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Update Google Integration Config
router.post('/google/config', (req, res) => {
  try {
    const { driveParentFolderId, spreadsheetId } = req.body || {};

    if (driveParentFolderId) {
      process.env.GOOGLE_DRIVE_PARENT_ID = driveParentFolderId;
    }
    if (spreadsheetId) {
      process.env.SPREADSHEET_ID = spreadsheetId;
    }

    res.json({
      success: true,
      message: 'บันทึกการตั้งค่า Google Drive และ Google Sheets สำเร็จ',
      data: {
        driveParentFolderId: process.env.GOOGLE_DRIVE_PARENT_ID,
        spreadsheetId: process.env.SPREADSHEET_ID
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. Export Transactions as CSV (with UTF-8 BOM for Thai Excel)
router.get('/export/csv', (req, res) => {
  try {
    const { workspace_id = 'ws_thanachote', period, startDate, endDate } = req.query;

    let query = `
      SELECT t.*, 
             c.name as category_name,
             u.display_name as user_name,
             w.name as workspace_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN workspaces w ON t.workspace_id = w.id
      WHERE t.workspace_id = ?
    `;
    const params = [workspace_id];

    if (startDate && endDate) {
      query += ' AND t.transaction_date >= ? AND t.transaction_date <= ?';
      params.push(startDate, endDate);
    }

    query += ' ORDER BY t.transaction_date DESC, t.created_at DESC';

    const rows = db.prepare(query).all(...params);

    const headers = [
      'รหัสรายการ',
      'วันที่',
      'ประเภท',
      'หมวดหมู่',
      'จำนวนเงิน (บาท)',
      'บันทึกช่วยจำ/รายละเอียด',
      'ช่องทางบันทึก',
      'ผู้บันทึก',
      'ธนาคาร/ผู้ให้บริการ',
      'รหัสอ้างอิง (Ref No)',
      'ลิงก์ภาพสลิป'
    ];

    const csvLines = [headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',')];

    for (const r of rows) {
      let meta = {};
      try {
        if (r.ocr_metadata) meta = JSON.parse(r.ocr_metadata);
      } catch (e) {}

      const typeLabel = r.type === 'income' ? 'รายรับ' : 'รายจ่าย';
      const bankName = meta.bank || (r.input_method === 'ocr' ? 'สลิปโอนเงิน' : '-');
      const refNo = meta.referenceNo || '-';
      const slipUrl = r.slip_url ? (r.slip_url.startsWith('http') ? r.slip_url : `${process.env.PUBLIC_APP_URL || 'http://localhost:5000'}${r.slip_url}`) : '-';

      const line = [
        r.id,
        r.transaction_date,
        typeLabel,
        r.category_name || 'ทั่วไป',
        parseFloat(r.amount || 0).toFixed(2),
        r.note || '',
        (r.input_method || 'manual').toUpperCase(),
        r.user_name || 'ผู้ใช้',
        bankName,
        refNo,
        slipUrl
      ].map(val => `"${String(val || '').replace(/"/g, '""')}"`).join(',');

      csvLines.push(line);
    }

    const csvContent = '\uFEFF' + csvLines.join('\r\n'); // UTF-8 BOM for Excel Thai support
    const filename = `expense_report_${workspace_id}_${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. Export Full JSON Backup
router.get('/export/json', (req, res) => {
  try {
    const { workspace_id = 'ws_thanachote' } = req.query;

    const ws = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(workspace_id);
    const transactions = db.prepare('SELECT * FROM transactions WHERE workspace_id = ?').all(workspace_id);
    const categories = db.prepare('SELECT * FROM categories WHERE workspace_id = ? OR workspace_id IS NULL').all(workspace_id);
    const members = db.prepare('SELECT wm.*, u.display_name FROM workspace_members wm JOIN users u ON wm.user_id = u.id WHERE wm.workspace_id = ?').all(workspace_id);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="backup_${workspace_id}_${Date.now()}.json"`);
    res.json({
      workspace: ws,
      transactions,
      categories,
      members,
      exportedAt: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
