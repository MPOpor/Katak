import { getGoogleAccessToken, getServiceAccountCredentials } from './googleAuth.js';
import db from '../db/database.js';

const EXPENSE_HEADERS = [
  'เวลาที่บันทึก',
  'หมวดหมู่',
  'วันที่ทำรายการ',
  'ประเภท',
  'จำนวนเงิน (บาท)',
  'ผู้รับ/ผู้โอน',
  'บันทึกช่วยจำ/หมายเหตุ',
  'ช่องทางบันทึก',
  'รหัสอ้างอิง (Ref)',
  'ลิงก์ภาพสลิป/Google Drive',
  'ผู้บันทึก',
  'พื้นที่การเงิน (Workspace)'
];

const SLIP_HEADERS = [
  'เวลาที่บันทึก',
  'ธนาคาร',
  'วันที่ในสลิป',
  'เวลาในสลิป',
  'ผู้โอน (จาก)',
  'ผู้รับ (ถึง)',
  'ยอดเงิน (บาท)',
  'ประเภท',
  'หมวดหมู่',
  'รหัสอ้างอิง',
  'ความมั่นใจ AI (%)',
  'ลิงก์สลิป/Google Drive',
  'ผู้บันทึก'
];

/**
 * Test Google Sheets connection and permissions
 */
export async function testSheetsConnection(customSpreadsheetId = null) {
  try {
    const creds = getServiceAccountCredentials();
    if (!creds) {
      return {
        success: false,
        configured: false,
        message: 'ยังไม่ได้ตั้งค่า Google Service Account Credentials'
      };
    }

    const spreadsheetId = customSpreadsheetId || process.env.SPREADSHEET_ID || process.env.GOOGLE_SPREADSHEET_ID;
    if (!spreadsheetId) {
      return {
        success: true,
        configured: true,
        authenticated: true,
        hasSpreadsheet: false,
        clientEmail: creds.client_email,
        message: 'เชื่อมต่อ Google Service Account สำเร็จ (ยังไม่ได้ระบุ SPREADSHEET_ID)'
      };
    }

    const token = await getGoogleAccessToken();
    const sheetRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!sheetRes.ok) {
      const errText = await sheetRes.text();
      return {
        success: false,
        configured: true,
        authenticated: true,
        hasSpreadsheet: false,
        spreadsheetId,
        clientEmail: creds.client_email,
        message: `เข้าถึง Google Sheet ไม่ได้ (${sheetRes.status}): กรุณาแชร์สิทธิ์ชีตให้ ${creds.client_email} เป็น Editor`
      };
    }

    const sheetData = await sheetRes.json();
    const tabNames = (sheetData.sheets || []).map(s => s.properties.title);

    return {
      success: true,
      configured: true,
      authenticated: true,
      hasSpreadsheet: true,
      spreadsheetId,
      spreadsheetTitle: sheetData.properties.title,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
      tabs: tabNames,
      clientEmail: creds.client_email,
      message: `เชื่อมต่อตาราง "${sheetData.properties.title}" (${tabNames.length} ชีตย่อย) สำเร็จแล้ว`
    };
  } catch (error) {
    return {
      success: false,
      configured: false,
      message: `เกิดข้อผิดพลาดในการเชื่อมต่อ Google Sheets: ${error.message}`
    };
  }
}

/**
 * Ensures required sheets and standard headers exist in the spreadsheet
 */
export async function ensureSheetStructure(spreadsheetId) {
  if (!spreadsheetId) return false;

  const token = await getGoogleAccessToken();

  // 1. Get current sheet structure
  const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!metaRes.ok) return false;
  const metaData = await metaRes.json();
  const existingTabs = (metaData.sheets || []).map(s => s.properties.title);

  const addSheetRequests = [];
  if (!existingTabs.includes('บันทึกรายรับรายจ่าย')) {
    addSheetRequests.push({ addSheet: { properties: { title: 'บันทึกรายรับรายจ่าย' } } });
  }
  if (!existingTabs.includes('สลิปโอนเงิน')) {
    addSheetRequests.push({ addSheet: { properties: { title: 'สลิปโอนเงิน' } } });
  }

  if (addSheetRequests.length > 0) {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requests: addSheetRequests })
    });
  }

  // 2. Check and write headers if empty
  const checkExpenseHeaderRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/บันทึกรายรับรายจ่าย!A1:L1`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (checkExpenseHeaderRes.ok) {
    const data = await checkExpenseHeaderRes.json();
    if (!data.values || data.values.length === 0) {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/บันทึกรายรับรายจ่าย!A1:L1?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values: [EXPENSE_HEADERS] })
      });
    }
  }

  const checkSlipHeaderRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/สลิปโอนเงิน!A1:M1`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (checkSlipHeaderRes.ok) {
    const data = await checkSlipHeaderRes.json();
    if (!data.values || data.values.length === 0) {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/สลิปโอนเงิน!A1:M1?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values: [SLIP_HEADERS] })
      });
    }
  }

  return true;
}

/**
 * Appends a newly created transaction row to Google Sheets
 */
export async function appendTransactionToSheet(tx, customSpreadsheetId = null) {
  const spreadsheetId = customSpreadsheetId || process.env.SPREADSHEET_ID || process.env.GOOGLE_SPREADSHEET_ID;
  if (!spreadsheetId) return null;

  try {
    const token = await getGoogleAccessToken();
    await ensureSheetStructure(spreadsheetId);

    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);

    // Extract OCR metadata if available
    let ocrMeta = {};
    if (tx.ocr_metadata) {
      try {
        ocrMeta = typeof tx.ocr_metadata === 'object' ? tx.ocr_metadata : JSON.parse(tx.ocr_metadata);
      } catch (e) {}
    }

    const typeLabel = tx.type === 'income' ? 'รายรับ' : 'รายจ่าย';
    const amountVal = parseFloat(tx.amount || 0);
    const slipLink = tx.slip_url ? (tx.slip_url.startsWith('http') ? tx.slip_url : `${process.env.PUBLIC_APP_URL || 'http://localhost:5000'}${tx.slip_url}`) : '';
    const senderReceiver = ocrMeta.sender ? `${ocrMeta.sender} -> ${ocrMeta.receiver || '-'}` : (ocrMeta.receiver || tx.user_name || '-');

    const expenseRow = [
      nowStr,
      tx.category_name || ocrMeta.suggestedCategory || 'ทั่วไป',
      tx.transaction_date || ocrMeta.date || nowStr.slice(0, 10),
      typeLabel,
      amountVal,
      senderReceiver,
      tx.note || '',
      (tx.input_method || 'manual').toUpperCase(),
      ocrMeta.referenceNo || '-',
      slipLink,
      tx.user_name || 'ผู้ใช้',
      tx.workspace_name || 'ร้านค้า'
    ];

    // Append to "บันทึกรายรับรายจ่าย"
    const appendExpenseRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/บันทึกรายรับรายจ่าย!A1:append?valueInputOption=USER_ENTERED`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values: [expenseRow] })
    });

    if (appendExpenseRes.ok) {
      console.log(`📊 [Google Sheets ✅] Appended transaction to Google Sheet: ฿${amountVal} (${typeLabel})`);
    }

    // If it is OCR / Slip, also append to "สลิปโอนเงิน"
    if (tx.input_method === 'ocr' || ocrMeta.bank) {
      const slipRow = [
        nowStr,
        ocrMeta.bank || 'สลิปธนาคาร',
        ocrMeta.date || tx.transaction_date,
        ocrMeta.time || '',
        ocrMeta.sender || '-',
        ocrMeta.receiver || '-',
        amountVal,
        typeLabel,
        tx.category_name || ocrMeta.suggestedCategory || 'ทั่วไป',
        ocrMeta.referenceNo || '-',
        ocrMeta.confidence || 98.5,
        slipLink,
        tx.user_name || 'ผู้ใช้'
      ];

      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/สลิปโอนเงิน!A1:append?valueInputOption=USER_ENTERED`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values: [slipRow] })
      });
    }

    return true;
  } catch (error) {
    console.error('❌ appendTransactionToSheet Error:', error.message);
    return false;
  }
}

/**
 * Bulk syncs all transactions of a workspace to Google Sheets
 */
export async function syncWorkspaceToSheet(workspaceId = 'ws_thanachote', customSpreadsheetId = null) {
  const spreadsheetId = customSpreadsheetId || process.env.SPREADSHEET_ID || process.env.GOOGLE_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error('ยังไม่ได้ระบุ SPREADSHEET_ID ในระบบ');
  }

  const token = await getGoogleAccessToken();
  await ensureSheetStructure(spreadsheetId);

  // 1. Fetch transactions from DB
  const query = `
    SELECT t.*, 
           c.name as category_name,
           u.display_name as user_name,
           w.name as workspace_name
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN users u ON t.user_id = u.id
    LEFT JOIN workspaces w ON t.workspace_id = w.id
    WHERE t.workspace_id = ?
    ORDER BY t.transaction_date ASC, t.created_at ASC
  `;

  const rows = db.prepare(query).all(workspaceId);

  if (!rows || rows.length === 0) {
    return { success: true, syncedCount: 0, message: 'ไม่มีรายการธุรกรรมในพื้นที่นี้' };
  }

  const expenseRows = [EXPENSE_HEADERS];
  const slipRows = [SLIP_HEADERS];

  const appUrl = process.env.PUBLIC_APP_URL || 'http://localhost:5000';

  for (const tx of rows) {
    let ocrMeta = {};
    if (tx.ocr_metadata) {
      try {
        ocrMeta = typeof tx.ocr_metadata === 'object' ? tx.ocr_metadata : JSON.parse(tx.ocr_metadata);
      } catch (e) {}
    }

    const typeLabel = tx.type === 'income' ? 'รายรับ' : 'รายจ่าย';
    const amountVal = parseFloat(tx.amount || 0);
    const slipLink = tx.slip_url ? (tx.slip_url.startsWith('http') ? tx.slip_url : `${appUrl}${tx.slip_url}`) : '';
    const senderReceiver = ocrMeta.sender ? `${ocrMeta.sender} -> ${ocrMeta.receiver || '-'}` : (ocrMeta.receiver || tx.user_name || '-');

    expenseRows.push([
      tx.created_at || new Date().toISOString(),
      tx.category_name || 'ทั่วไป',
      tx.transaction_date,
      typeLabel,
      amountVal,
      senderReceiver,
      tx.note || '',
      (tx.input_method || 'manual').toUpperCase(),
      ocrMeta.referenceNo || '-',
      slipLink,
      tx.user_name || 'ผู้ใช้',
      tx.workspace_name || 'ร้านค้า'
    ]);

    if (tx.input_method === 'ocr' || ocrMeta.bank) {
      slipRows.push([
        tx.created_at || new Date().toISOString(),
        ocrMeta.bank || 'สลิปธนาคาร',
        ocrMeta.date || tx.transaction_date,
        ocrMeta.time || '',
        ocrMeta.sender || '-',
        ocrMeta.receiver || '-',
        amountVal,
        typeLabel,
        tx.category_name || 'ทั่วไป',
        ocrMeta.referenceNo || '-',
        ocrMeta.confidence || 98.5,
        slipLink,
        tx.user_name || 'ผู้ใช้'
      ]);
    }
  }

  // 2. Overwrite full table with synced data
  // Clear first
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/บันทึกรายรับรายจ่าย!A1:L${Math.max(rows.length + 100, 200)}:clear`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });

  // Write new data
  const updateExpenseRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/บันทึกรายรับรายจ่าย!A1?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ values: expenseRows })
  });

  if (slipRows.length > 1) {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/สลิปโอนเงิน!A1:M${Math.max(rows.length + 100, 200)}:clear`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/สลิปโอนเงิน!A1?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values: slipRows })
    });
  }

  console.log(`📊 [Google Sheets Sync ✅] Synced ${rows.length} transactions to Google Sheet!`);

  // Log to Audit Trail
  db.prepare(`
    INSERT INTO audit_logs (id, workspace_id, user_id, action, entity_id, details)
    VALUES (?, ?, 'usr_nicha', 'google_sync', ?, ?)
  `).run(
    'aud_' + Date.now(),
    workspaceId,
    spreadsheetId,
    `ซิงค์ข้อมูลบัญชี ${rows.length} รายการขึ้น Google Sheets เรียบร้อยแล้ว`
  );

  return {
    success: true,
    syncedCount: rows.length,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    message: `ซิงค์รายการ ${rows.length} รายการขึ้น Google Sheets เรียบร้อยแล้ว`
  };
}
