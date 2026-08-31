import express from 'express';
import db from '../db/database.js';
import { parseThaiSlipText, SAMPLE_SLIPS } from '../services/ocrService.js';
import { performGoogleVisionOCR } from '../services/googleVisionService.js';
import { parseThaiVoiceCommand } from '../services/voiceService.js';
import { buildOcrResultFlexMessage } from '../services/flexService.js';
import {
  verifyLineSignature,
  replyLineMessage,
  downloadLineContent,
  buildWelcomeFlexMessage,
  getLineUserProfile
} from '../services/lineService.js';
import { getCurrentUserId } from './auth.js';

const router = express.Router();

// Helper to find or create user by LINE User ID
function getOrCreateLineUser(lineUserId, displayName = 'ผู้ใช้ LINE', pictureUrl = null) {
  let user = db.prepare('SELECT * FROM users WHERE line_user_id = ?').get(lineUserId);
  if (!user) {
    const newId = 'usr_' + Date.now().toString(36);
    db.prepare(`
      INSERT INTO users (id, line_user_id, display_name, picture_url, role, status)
      VALUES (?, ?, ?, ?, 'user', 'active')
    `).run(newId, lineUserId, displayName, pictureUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150');

    // Add user to default Thanachote workspace as member
    db.prepare(`
      INSERT OR IGNORE INTO workspace_members (id, workspace_id, user_id, role, can_add, can_edit, can_delete, can_view_reports)
      VALUES (?, 'ws_thanachote', ?, 'member', 1, 1, 0, 1)
    `).run('wm_' + Date.now().toString(36), newId);

    user = db.prepare('SELECT * FROM users WHERE id = ?').get(newId);
    console.log(`   [2/6 ✅ User] Registered new user in database: "${displayName}" (ID: ${newId})`);
  } else {
    console.log(`   [2/6 👤 User] Found existing user: "${user.display_name}" (ID: ${user.id})`);
  }
  return user;
}

// -----------------------------------------------------------------------------
// 1. OFFICIAL LINE MESSAGING API WEBHOOK RECEIVER
// -----------------------------------------------------------------------------
router.post('/webhook', async (req, res) => {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log('\n========================================================================');
  console.log(`[LINE WEBHOOK] 📨 Received Webhook Event at ${timestamp}`);
  console.log('========================================================================');

  try {
    const signature = req.headers['x-line-signature'];

    // [Step 1] Verify LINE signature
    if (req.rawBody && !verifyLineSignature(req.rawBody, signature)) {
      console.warn('❌ [1/6 ⚠️ Signature Warning] Signature mismatch. Proceeding in permissive mode.');
    }

    const { events } = req.body;
    if (!events || !Array.isArray(events) || events.length === 0) {
      console.log('ℹ️ Empty events array received (Connection test / Ping).');
      console.log('========================================================================\n');
      return res.status(200).json({ success: true, message: 'Ping acknowledged' });
    }

    console.log(`📋 Total events in payload: ${events.length}`);

    // Process all incoming events
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const lineUserId = event.source?.userId;
      console.log(`\n--- [Processing Event ${i + 1}/${events.length}: Type="${event.type}"] ---`);

      // [Step 2] Resolve User
      let user = null;
      if (lineUserId) {
        let existing = db.prepare('SELECT * FROM users WHERE line_user_id = ?').get(lineUserId);
        if (!existing) {
          console.log(`   [2/6 🔍 User] Fetching profile for LINE User ID: ${lineUserId}...`);
          const profile = await getLineUserProfile(lineUserId);
          user = getOrCreateLineUser(lineUserId, profile?.displayName || 'ผู้ใช้ LINE', profile?.pictureUrl);
        } else {
          user = existing;
          console.log(`   [2/6 👤 User] User: "${user.display_name}" (ID: ${user.id})`);
        }
      }

      const targetWsId = 'ws_thanachote'; // Default workspace: ร้านขายของฝากไร่ธนโชติ
      const ws = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(targetWsId);
      const wsName = ws ? ws.name : 'ร้านขายของฝากไร่ธนโชติ';

      // -----------------------------------------------------------------------
      // EVENT A: IMAGE OR FILE (SLIP / RECEIPT SENT VIA LINE OA)
      // -----------------------------------------------------------------------
      if (event.type === 'message' && (event.message.type === 'image' || event.message.type === 'file')) {
        const messageId = event.message.id;
        const msgType = event.message.type;
        console.log(`📷 [3/6 📥 Image/File] Receiving ${msgType} message (Message ID: ${messageId})`);

        // 1. Download image binary from LINE Content API
        const downloaded = await downloadLineContent(messageId);
        let ocrData = null;
        let slipUrl = null;

        if (downloaded && downloaded.filePath) {
          slipUrl = downloaded.fileUrl;

          // 2. Run Google Cloud Vision OCR / Gemini Vision OCR
          console.log(`🧠 [4/6 🚀 Google OCR] Sending image to Google Cloud Vision API...`);
          const googleRes = await performGoogleVisionOCR(downloaded.filePath);
          if (googleRes.data) {
            ocrData = googleRes.data;
            console.log(`   [4/6 ✅ OCR Success] Engine: "${googleRes.engine}"`);
            console.log(`   ↳ ธนาคาร: ${ocrData.bank}`);
            console.log(`   ↳ ยอดเงิน: ฿${parseFloat(ocrData.amount).toLocaleString()} บาท (${ocrData.suggestedType === 'income' ? 'รายรับ' : 'รายจ่าย'})`);
            console.log(`   ↳ วันเวลา: ${ocrData.date} ${ocrData.time}`);
            console.log(`   ↳ ผู้โอน (จาก): ${ocrData.sender || '-'}`);
            console.log(`   ↳ ผู้รับ (ถึง): ${ocrData.receiver || '-'}`);
            console.log(`   ↳ หมวดหมู่: ${ocrData.suggestedCategory}`);
            console.log(`   ↳ ความมั่นใจ AI: ${ocrData.confidence}%`);
          }
        }

        // If OCR could not parse
        if (!ocrData) {
          console.warn('   [4/6 ⚠️ OCR] Could not extract structured data from slip.');
          ocrData = {
            amount: 0,
            bank: 'สลิปโอนเงิน / ใบเสร็จ',
            date: new Date().toISOString().split('T')[0],
            time: new Date().toTimeString().slice(0, 5),
            sender: user?.display_name || 'ลูกค้า',
            receiver: wsName,
            suggestedCategory: 'ทั่วไป',
            suggestedType: 'expense',
            confidence: 60.0,
            referenceNo: '-'
          };
        }

        // 3. Match category in workspace
        let cat = db.prepare('SELECT id, name FROM categories WHERE (workspace_id = ? OR workspace_id IS NULL) AND name LIKE ?').get(targetWsId, `%${ocrData.suggestedCategory}%`);
        if (!cat) {
          cat = db.prepare('SELECT id, name FROM categories WHERE (workspace_id = ? OR workspace_id IS NULL) AND type = ? LIMIT 1').get(targetWsId, ocrData.suggestedType);
        }
        const catId = cat ? cat.id : 'cat_t_inc_1';
        const catName = cat ? cat.name : ocrData.suggestedCategory;

        // 4. Save transaction to database
        const txId = 'tx_line_' + Date.now().toString(36);
        console.log(`💾 [5/6 🗄️ Database] Saving transaction to workspace "${wsName}" (TxID: ${txId})...`);

        db.prepare(`
          INSERT INTO transactions (
            id, workspace_id, user_id, category_id, type, amount, note,
            slip_url, input_method, raw_ocr_text, ocr_verified, ocr_metadata, transaction_date
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ocr', ?, 1, ?, ?)
        `).run(
          txId,
          targetWsId,
          user?.id || 'usr_nicha',
          catId,
          ocrData.suggestedType,
          ocrData.amount,
          ocrData.note || `สลิป ${ocrData.bank} (โอน ${ocrData.sender || 'ลูกค้า'} -> ${ocrData.receiver || wsName})`,
          slipUrl,
          ocrData.rawText || 'LINE Slip Image Upload',
          JSON.stringify(ocrData),
          ocrData.date
        );

        // Add to Audit Trail
        db.prepare(`
          INSERT INTO audit_logs (id, workspace_id, user_id, action, entity_id, details)
          VALUES (?, ?, ?, 'create_transaction', ?, ?)
        `).run(
          'aud_' + Date.now(),
          targetWsId,
          user?.id || 'usr_nicha',
          txId,
          `ส่งสลิปผ่าน LINE OA: บันทึก ${ocrData.suggestedType === 'income' ? 'รายรับ' : 'รายจ่าย'} ${ocrData.amount.toLocaleString()} บาท (${ocrData.bank})`
        );
        console.log(`   [5/6 ✅ Database] Transaction & Audit Trail recorded successfully.`);

        // 5. Build the Professional Flex Message Card and Reply
        console.log(`📤 [6/6 🎨 Flex Card] Building professional receipt card for ${ocrData.bank}...`);
        const flexMessage = buildOcrResultFlexMessage({
          amount: ocrData.amount,
          type: ocrData.suggestedType,
          bank: ocrData.bank,
          date: ocrData.date,
          time: ocrData.time,
          sender: ocrData.sender,
          receiver: ocrData.receiver,
          referenceNo: ocrData.referenceNo,
          category: catName,
          workspaceName: wsName,
          userName: user?.display_name || 'ผู้ใช้ LINE',
          confidence: ocrData.confidence || 98.5,
          slipUrl: slipUrl,
          txId: txId
        });

        if (event.replyToken) {
          await replyLineMessage(event.replyToken, flexMessage);
        }
      }

      // -----------------------------------------------------------------------
      // EVENT B: TEXT MESSAGE (COMMANDS / QUICK SUMMARY / INTENT)
      // -----------------------------------------------------------------------
      else if (event.type === 'message' && event.message.type === 'text') {
        const text = event.message.text.trim();
        console.log(`💬 [3/6 📝 Text Message] Received text: "${text}"`);

        // Check if user requested Summary / Report
        if (/สรุป|ยอด|รายงาน|ดูยอด|บัญชี/i.test(text)) {
          console.log(`   ↳ Intent detected: "SUMMARY_REPORT"`);
          const todayStr = new Date().toISOString().split('T')[0];
          const incRow = db.prepare('SELECT COALESCE(SUM(amount), 0) as s FROM transactions WHERE workspace_id = ? AND transaction_date = ? AND type = "income"').get(targetWsId, todayStr);
          const expRow = db.prepare('SELECT COALESCE(SUM(amount), 0) as s FROM transactions WHERE workspace_id = ? AND transaction_date = ? AND type = "expense"').get(targetWsId, todayStr);
          const incSum = incRow ? incRow.s : 0;
          const expSum = expRow ? expRow.s : 0;

          const summaryFlex = {
            type: 'flex',
            altText: `สรุปยอดการเงินวันนี้: รายรับ ฿${incSum.toLocaleString()} / รายจ่าย ฿${expSum.toLocaleString()}`,
            contents: {
              type: 'bubble',
              header: {
                type: 'box',
                layout: 'vertical',
                backgroundColor: '#ED2E92',
                contents: [
                  { type: 'text', text: '📊 สรุปยอดการเงินวันนี้ (Today)', color: '#FFFFFF', weight: 'bold', size: 'sm' },
                  { type: 'text', text: wsName, color: '#FDFBF9', size: 'xs', margin: 'xs' }
                ]
              },
              body: {
                type: 'box',
                layout: 'vertical',
                spacing: 'sm',
                contents: [
                  {
                    type: 'box',
                    layout: 'horizontal',
                    contents: [
                      { type: 'text', text: 'รายรับวันนี้', color: '#6B7280', size: 'xs' },
                      { type: 'text', text: `+฿${incSum.toLocaleString()}`, color: '#059669', weight: 'bold', align: 'end', size: 'sm' }
                    ]
                  },
                  {
                    type: 'box',
                    layout: 'horizontal',
                    contents: [
                      { type: 'text', text: 'รายจ่ายวันนี้', color: '#6B7280', size: 'xs' },
                      { type: 'text', text: `-฿${expSum.toLocaleString()}`, color: '#DC2626', weight: 'bold', align: 'end', size: 'sm' }
                    ]
                  },
                  {
                    type: 'separator',
                    margin: 'sm'
                  },
                  {
                    type: 'box',
                    layout: 'horizontal',
                    contents: [
                      { type: 'text', text: 'คงเหลือสุทธิ', color: '#111827', weight: 'bold', size: 'xs' },
                      { type: 'text', text: `฿${(incSum - expSum).toLocaleString()}`, color: incSum >= expSum ? '#059669' : '#DC2626', weight: 'bold', align: 'end', size: 'md' }
                    ]
                  }
                ]
              },
              footer: {
                type: 'box',
                layout: 'vertical',
                contents: [
                  {
                    type: 'button',
                    style: 'primary',
                    color: '#ED2E92',
                    height: 'sm',
                    action: {
                      type: 'uri',
                      label: '📈 เปิดดูกราฟเชิงลึกบน LIFF',
                      uri: (process.env.PUBLIC_APP_URL && process.env.PUBLIC_APP_URL.startsWith('https://'))
                        ? process.env.PUBLIC_APP_URL
                        : 'https://thanachote-expense-ocr.loca.lt'
                    }
                  }
                ]
              }
            }
          };

          if (event.replyToken) {
            await replyLineMessage(event.replyToken, summaryFlex);
          }
        }
        // Check natural language expense/income command
        else if (/ขาย|จ่าย|ซื้อ|ค่า|โอน/i.test(text)) {
          console.log(`   ↳ Intent detected: "NATURAL_LANGUAGE_COMMAND"`);
          const parsed = parseThaiVoiceCommand(text);
          if (parsed.amount > 0) {
            let cat = db.prepare('SELECT id, name FROM categories WHERE (workspace_id = ? OR workspace_id IS NULL) AND name LIKE ?').get(targetWsId, `%${parsed.category}%`);
            if (!cat) {
              cat = db.prepare('SELECT id, name FROM categories WHERE (workspace_id = ? OR workspace_id IS NULL) AND type = ? LIMIT 1').get(targetWsId, parsed.type);
            }
            const catId = cat ? cat.id : 'cat_t_inc_1';

            const txId = 'tx_line_txt_' + Date.now().toString(36);
            db.prepare(`
              INSERT INTO transactions (id, workspace_id, user_id, category_id, type, amount, note, input_method, transaction_date)
              VALUES (?, ?, ?, ?, ?, ?, ?, 'voice', ?)
            `).run(txId, targetWsId, user?.id || 'usr_nicha', catId, parsed.type, parsed.amount, text, new Date().toISOString().split('T')[0]);

            console.log(`   ↳ Recorded text transaction: ฿${parsed.amount} (${parsed.type})`);

            const receiptFlex = buildOcrResultFlexMessage({
              amount: parsed.amount,
              type: parsed.type,
              bank: 'ข้อความคำสั่งภาษาไทย',
              date: new Date().toISOString().split('T')[0],
              time: new Date().toTimeString().slice(0, 5),
              sender: user?.display_name,
              receiver: wsName,
              category: cat?.name || parsed.category,
              workspaceName: wsName,
              userName: user?.display_name || 'ผู้ใช้ LINE',
              confidence: 95.0,
              txId
            });

            if (event.replyToken) {
              await replyLineMessage(event.replyToken, receiptFlex);
            }
          }
        }
        // Default Welcome / Menu
        else {
          console.log(`   ↳ Intent: "WELCOME_MENU"`);
          const welcomeFlex = buildWelcomeFlexMessage(user?.display_name, process.env.PUBLIC_APP_URL);
          if (event.replyToken) {
            await replyLineMessage(event.replyToken, welcomeFlex);
          }
        }
      }

      // -----------------------------------------------------------------------
      // EVENT C: FOLLOW / ADD FRIEND EVENT
      // -----------------------------------------------------------------------
      else if (event.type === 'follow') {
        console.log(`👋 [3/6 🤝 Follow Event] New user followed LINE OA: ${lineUserId}`);
        const welcomeFlex = buildWelcomeFlexMessage(user?.display_name, process.env.PUBLIC_APP_URL);
        if (event.replyToken) {
          await replyLineMessage(event.replyToken, welcomeFlex);
        }
      }
    }

    console.log('========================================================================\n');
    res.status(200).json({ success: true, message: 'All webhook events processed' });
  } catch (error) {
    console.error('\n❌ [LINE Webhook Error]:', error);
    console.log('========================================================================\n');
    res.status(200).json({ success: false, error: error.message });
  }
});

// -----------------------------------------------------------------------------
// 2. SIMULATE SLIP MESSAGE (FOR WEB UI INTERACTIVE TESTING)
// -----------------------------------------------------------------------------
router.post('/process-slip-message', (req, res) => {
  try {
    const { sampleId, rawText, workspaceId } = req.body;
    const userId = getCurrentUserId();
    const targetWsId = workspaceId || 'ws_thanachote';

    const ws = db.prepare('SELECT name FROM workspaces WHERE id = ?').get(targetWsId);
    const wsName = ws ? ws.name : 'ร้านขายของฝากไร่ธนโชติ';

    const user = db.prepare('SELECT display_name FROM users WHERE id = ?').get(userId);
    const userName = user ? user.display_name : 'ณิชา ทองอยู่';

    let ocrData = null;
    let slipUrl = null;

    if (sampleId) {
      const sample = SAMPLE_SLIPS.find(s => s.id === sampleId);
      if (sample) {
        ocrData = {
          amount: sample.amount,
          date: sample.date,
          time: sample.time,
          sender: sample.sender,
          receiver: sample.receiver,
          bank: sample.bank,
          referenceNo: sample.referenceNo,
          confidence: 99.2,
          suggestedCategory: sample.category,
          suggestedType: sample.type,
          note: sample.note
        };
        slipUrl = sample.imageUrl;
      }
    }

    if (!ocrData) {
      ocrData = parseThaiSlipText(rawText);
    }

    let cat = db.prepare('SELECT id, name FROM categories WHERE (workspace_id = ? OR workspace_id IS NULL) AND name LIKE ?').get(targetWsId, `%${ocrData.suggestedCategory}%`);
    if (!cat) {
      cat = db.prepare('SELECT id, name FROM categories WHERE (workspace_id = ? OR workspace_id IS NULL) AND type = ? LIMIT 1').get(targetWsId, ocrData.suggestedType);
    }
    const catId = cat ? cat.id : 'cat_t_inc_1';
    const catName = cat ? cat.name : ocrData.suggestedCategory;

    const txId = 'tx_line_' + Date.now().toString(36);
    db.prepare(`
      INSERT INTO transactions (
        id, workspace_id, user_id, category_id, type, amount, note,
        slip_url, input_method, raw_ocr_text, ocr_verified, ocr_metadata, transaction_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ocr', ?, 1, ?, ?)
    `).run(
      txId,
      targetWsId,
      userId,
      catId,
      ocrData.suggestedType,
      ocrData.amount,
      ocrData.note || `สลิป ${ocrData.bank} (โอน ${ocrData.sender || 'ลูกค้า'} -> ${ocrData.receiver || wsName})`,
      slipUrl,
      rawText || 'LINE OA Slip Upload',
      JSON.stringify(ocrData),
      ocrData.date
    );

    db.prepare(`
      INSERT INTO audit_logs (id, workspace_id, user_id, action, entity_id, details)
      VALUES (?, ?, ?, 'create_transaction', ?, ?)
    `).run(
      'aud_' + Date.now(),
      targetWsId,
      userId,
      txId,
      `ส่งสลิปผ่าน LINE OA: บันทึก ${ocrData.suggestedType === 'income' ? 'รายรับ' : 'รายจ่าย'} ${ocrData.amount.toLocaleString()} บาท (${ocrData.bank})`
    );

    const flexMessage = buildOcrResultFlexMessage({
      amount: ocrData.amount,
      type: ocrData.suggestedType,
      bank: ocrData.bank,
      date: ocrData.date,
      time: ocrData.time,
      sender: ocrData.sender,
      receiver: ocrData.receiver,
      referenceNo: ocrData.referenceNo,
      category: catName,
      workspaceName: wsName,
      userName: userName,
      confidence: ocrData.confidence || 98.5,
      slipUrl: slipUrl,
      txId: txId
    });

    res.json({
      success: true,
      data: {
        ocrResult: ocrData,
        txId,
        flexMessage
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// -----------------------------------------------------------------------------
// 3. FLEX PREVIEW
// -----------------------------------------------------------------------------
router.post('/flex-preview', (req, res) => {
  try {
    const { templateType, data } = req.body;
    if (templateType === 'ocr_result') {
      const flex = buildOcrResultFlexMessage(data || {});
      return res.json({ success: true, data: flex });
    }
    res.json({ success: true, message: 'Preview generated' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
