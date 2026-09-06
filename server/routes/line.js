import express from 'express';
import db from '../db/database.js';
import { parseThaiSlipText, SAMPLE_SLIPS, checkDuplicateSlip } from '../services/ocrService.js';
import { performGoogleVisionOCR } from '../services/googleVisionService.js';
import { parseThaiVoiceCommand, transcribeAudioWithGemini } from '../services/voiceService.js';
import { buildOcrResultFlexMessage, buildDuplicateWarningFlexMessage, getStandardQuickReplies } from '../services/flexService.js';
import { uploadSlipToDrive } from '../services/googleDriveService.js';
import { appendTransactionToSheet } from '../services/googleSheetsService.js';
import { askGeminiAssistant } from '../services/aiChatService.js';
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

  // If not found by line_user_id, check if usr_nicha can be linked
  if (!user && (displayName.includes('Nicha') || displayName.includes('ณิชา'))) {
    const nicha = db.prepare("SELECT * FROM users WHERE id = 'usr_nicha'").get();
    if (nicha) {
      db.prepare("UPDATE users SET line_user_id = ?, display_name = ?, picture_url = COALESCE(?, picture_url), updated_at = CURRENT_TIMESTAMP WHERE id = 'usr_nicha'").run(lineUserId, displayName, pictureUrl);
      user = db.prepare("SELECT * FROM users WHERE id = 'usr_nicha'").get();
      console.log(`   [2/6 👤 User] Linked LINE ID to owner account: "${user.display_name}" (ID: ${user.id})`);
      return user;
    }
  }

  if (!user) {
    const newId = 'usr_' + Date.now().toString(36);
    db.prepare(`
      INSERT INTO users (id, line_user_id, display_name, picture_url, role, status)
      VALUES (?, ?, ?, ?, 'user', 'active')
    `).run(newId, lineUserId, displayName, pictureUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150');

    // Add user to default workspace as member safely
    const targetWs = db.prepare("SELECT id FROM workspaces WHERE id = 'ws_thanachote'").get()
      || db.prepare("SELECT id FROM workspaces LIMIT 1").get();
    
    if (targetWs) {
      db.prepare(`
        INSERT OR IGNORE INTO workspace_members (id, workspace_id, user_id, role, can_add, can_edit, can_delete, can_view_reports)
        VALUES (?, ?, ?, 'member', 1, 1, 0, 1)
      `).run('wm_' + Date.now().toString(36), targetWs.id, newId);
    }

    user = db.prepare('SELECT * FROM users WHERE id = ?').get(newId);
    console.log(`   [2/6 ✅ User] Registered new user in database: "${displayName}" (ID: ${newId})`);
  } else {
    // Update picture or display name if available
    if (pictureUrl && user.picture_url !== pictureUrl) {
      db.prepare('UPDATE users SET picture_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(pictureUrl, user.id);
    }
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
        let driveUrl = null;

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
            console.log(`   ↳ รหัสอ้างอิง: ${ocrData.referenceNo || '-'}`);
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

        // 3. Duplicate Detection Check
        const dupCheck = checkDuplicateSlip({
          referenceNo: ocrData.referenceNo,
          amount: ocrData.amount,
          date: ocrData.date,
          time: ocrData.time,
          bank: ocrData.bank,
          workspaceId: targetWsId
        });

        if (dupCheck.isDuplicate) {
          console.warn(`⚠️ [Duplicate Detected] ${dupCheck.reason}`);
          const dupFlex = buildDuplicateWarningFlexMessage({
            bank: ocrData.bank,
            amount: ocrData.amount,
            date: ocrData.date,
            time: ocrData.time,
            referenceNo: ocrData.referenceNo,
            existingDate: dupCheck.existingTx?.transaction_date,
            existingAmount: dupCheck.existingTx?.amount,
            workspaceName: wsName
          });

          if (event.replyToken) {
            await replyLineMessage(event.replyToken, dupFlex);
          }
          continue; // Skip inserting duplicate
        }

        // 4. Auto-Upload to Google Drive (if configured)
        if (downloaded && downloaded.filePath) {
          try {
            console.log('☁️ [Google Drive] Uploading slip to Google Drive backup...');
            const driveRes = await uploadSlipToDrive({
              imageInput: downloaded.filePath,
              filename: `slip_${ocrData.bank.replace(/\s+/g, '_')}_${Date.now()}.jpg`,
              mimeType: 'image/jpeg',
              dateStr: ocrData.date,
              workspaceName: wsName
            });
            if (driveRes.success && driveRes.webViewLink) {
              driveUrl = driveRes.webViewLink;
              ocrData.driveUrl = driveUrl;
              ocrData.driveFileId = driveRes.fileId;
              console.log(`   ↳ Google Drive Link: ${driveUrl}`);
            }
          } catch (driveErr) {
            console.warn('⚠️ Google Drive upload error:', driveErr.message);
          }
        }

        // 5. Match category in workspace
        let cat = db.prepare('SELECT id, name FROM categories WHERE (workspace_id = ? OR workspace_id IS NULL) AND name LIKE ?').get(targetWsId, `%${ocrData.suggestedCategory}%`);
        if (!cat) {
          cat = db.prepare('SELECT id, name FROM categories WHERE (workspace_id = ? OR workspace_id IS NULL) AND type = ? LIMIT 1').get(targetWsId, ocrData.suggestedType);
        }
        const catId = cat ? cat.id : 'cat_t_inc_1';
        const catName = cat ? cat.name : ocrData.suggestedCategory;

        // 6. Save transaction to database
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
          driveUrl || slipUrl,
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

        // 7. Auto-Append to Google Sheets (if configured)
        try {
          const createdTx = db.prepare(`
            SELECT t.*, c.name as category_name, u.display_name as user_name, w.name as workspace_name
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            LEFT JOIN users u ON t.user_id = u.id
            LEFT JOIN workspaces w ON t.workspace_id = w.id
            WHERE t.id = ?
          `).get(txId);

          if (createdTx) {
            await appendTransactionToSheet(createdTx);
          }
        } catch (sheetErr) {
          console.warn('⚠️ Google Sheets auto-append warning:', sheetErr.message);
        }

        // 8. Build the Professional Flex Message Card and Reply
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
          confidence: ocrData.confidence || 99.2,
          slipUrl: slipUrl,
          driveUrl: driveUrl,
          txId: txId
        });

        if (event.replyToken) {
          await replyLineMessage(event.replyToken, flexMessage);
        }
      }

      // -----------------------------------------------------------------------
      // -----------------------------------------------------------------------
      // EVENT B: TEXT MESSAGE (AI CHATBOT / COMMANDS / SMART SUMMARY)
      // -----------------------------------------------------------------------
      else if (event.type === 'message' && event.message.type === 'text') {
        const text = event.message.text.trim();
        console.log(`💬 [3/6 📝 Text Message] Received text: "${text}" from "${user?.display_name || 'ผู้ใช้'}"`);

        // Check if user requested Menu / Help
        if (/^(เมนู|menu|help|ช่วยเหลือ|วิธีใช้)$/i.test(text)) {
          console.log(`   ↳ Intent: "WELCOME_MENU"`);
          const welcomeFlex = buildWelcomeFlexMessage(user?.display_name, process.env.PUBLIC_APP_URL);
          if (event.replyToken) {
            await replyLineMessage(event.replyToken, welcomeFlex);
          }
        }
        // Check if user requested Financial Summary / Report
        else if (/^(สรุป|ยอด|รายงาน|ดูยอด|บัญชี|ยอดวันนี้|สรุปยอดวันนี้|สรุปรายจ่าย|สรุปรายรับ)/i.test(text)) {
          console.log(`   ↳ Intent detected: "SUMMARY_REPORT"`);
          const todayStr = new Date().toISOString().split('T')[0];
          const incRow = db.prepare("SELECT COALESCE(SUM(amount), 0) as s FROM transactions WHERE workspace_id = ? AND transaction_date = ? AND type = 'income'").get(targetWsId, todayStr);
          const expRow = db.prepare("SELECT COALESCE(SUM(amount), 0) as s FROM transactions WHERE workspace_id = ? AND transaction_date = ? AND type = 'expense'").get(targetWsId, todayStr);
          const incSum = incRow ? incRow.s : 0;
          const expSum = expRow ? expRow.s : 0;

          const sheetUrl = process.env.SPREADSHEET_ID ? `https://docs.google.com/spreadsheets/d/${process.env.SPREADSHEET_ID}/edit` : null;
          const driveUrl = process.env.GOOGLE_DRIVE_PARENT_ID ? `https://drive.google.com/drive/folders/${process.env.GOOGLE_DRIVE_PARENT_ID}` : null;

          const summaryFlex = {
            type: 'flex',
            altText: `📊 สรุปยอดการเงินวันนี้: รายรับ ฿${incSum.toLocaleString()} / รายจ่าย ฿${expSum.toLocaleString()}`,
            contents: {
              type: 'bubble',
              header: {
                type: 'box',
                layout: 'vertical',
                backgroundColor: '#10B981',
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
                spacing: 'sm',
                contents: [
                  {
                    type: 'button',
                    style: 'primary',
                    color: '#10B981',
                    height: 'sm',
                    action: {
                      type: 'uri',
                      label: '📈 ดูกราฟรายงานบนเว็บ',
                      uri: (process.env.PUBLIC_APP_URL && process.env.PUBLIC_APP_URL.startsWith('https://'))
                        ? process.env.PUBLIC_APP_URL
                        : 'https://katak.fun'
                    }
                  }
                ]
              }
            },
            quickReply: getStandardQuickReplies(sheetUrl, driveUrl)
          };

          if (event.replyToken) {
            await replyLineMessage(event.replyToken, summaryFlex);
          }
        }
        // Check natural language expense/income command
        else if (parseThaiVoiceCommand(text).amount > 0 && /ขาย|จ่าย|ซื้อ|ค่า|โอน|บาท/i.test(text)) {
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

            // Append transaction to Google Sheet
            try {
              const catName = cat?.name || parsed.category;
              await appendTransactionToSheet({
                date: new Date().toISOString().split('T')[0],
                time: new Date().toTimeString().slice(0, 5),
                type: parsed.type,
                amount: parsed.amount,
                category: catName,
                note: text,
                bank: 'ข้อความคำสั่งพิมพ์ใน LINE',
                refNumber: txId,
                userName: user?.display_name || 'ผู้ใช้ LINE',
                slipUrl: ''
              });
            } catch (sheetErr) {
              console.warn('⚠️ Google Sheet append error:', sheetErr.message);
            }

            const sheetUrl = process.env.SPREADSHEET_ID ? `https://docs.google.com/spreadsheets/d/${process.env.SPREADSHEET_ID}/edit` : null;
            const driveUrl = process.env.GOOGLE_DRIVE_PARENT_ID ? `https://drive.google.com/drive/folders/${process.env.GOOGLE_DRIVE_PARENT_ID}` : null;

            const receiptFlex = buildOcrResultFlexMessage({
              amount: parsed.amount,
              type: parsed.type,
              bank: 'ข้อความคำสั่งพิมพ์ใน LINE',
              date: new Date().toISOString().split('T')[0],
              time: new Date().toTimeString().slice(0, 5),
              sender: user?.display_name,
              receiver: wsName,
              category: cat?.name || parsed.category,
              workspaceName: wsName,
              userName: user?.display_name || 'ผู้ใช้ LINE',
              confidence: 98.0,
              txId,
              sheetUrl,
              driveUrl
            });

            if (event.replyToken) {
              await replyLineMessage(event.replyToken, receiptFlex);
            }
          }
        }
        // Intelligent Conversational AI Chatbot (Gemini Powered)
        else {
          console.log(`   ↳ Intent: "AI_CONVERSATION" (Passing to Gemini AI)`);
          const todayStr = new Date().toISOString().split('T')[0];
          const incRow = db.prepare("SELECT COALESCE(SUM(amount), 0) as s FROM transactions WHERE workspace_id = ? AND transaction_date = ? AND type = 'income'").get(targetWsId, todayStr);
          const expRow = db.prepare("SELECT COALESCE(SUM(amount), 0) as s FROM transactions WHERE workspace_id = ? AND transaction_date = ? AND type = 'expense'").get(targetWsId, todayStr);
          const lastTx = db.prepare('SELECT type, amount, note, transaction_date FROM transactions WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 1').get(targetWsId);

          const storeContext = {
            userName: user?.display_name || 'คุณลูกค้า',
            workspaceName: wsName,
            todayIncome: incRow ? incRow.s : 0,
            todayExpense: expRow ? expRow.s : 0,
            lastTransaction: lastTx ? `${lastTx.type === 'income' ? 'รายรับ' : 'รายจ่าย'} ฿${lastTx.amount} (${lastTx.note || 'ไม่มีโน้ต'}) เมื่อ ${lastTx.transaction_date}` : 'ยังไม่มีรายการ'
          };

          const aiReply = await askGeminiAssistant(text, storeContext);

          const sheetUrl = process.env.SPREADSHEET_ID ? `https://docs.google.com/spreadsheets/d/${process.env.SPREADSHEET_ID}/edit` : null;
          const driveUrl = process.env.GOOGLE_DRIVE_PARENT_ID ? `https://drive.google.com/drive/folders/${process.env.GOOGLE_DRIVE_PARENT_ID}` : null;

          const chatMessage = {
            type: 'text',
            text: aiReply,
            quickReply: getStandardQuickReplies(sheetUrl, driveUrl)
          };

          if (event.replyToken) {
            await replyLineMessage(event.replyToken, chatMessage);
          }
        }
      }

      // -----------------------------------------------------------------------
      // EVENT C: AUDIO / VOICE MESSAGE (AI VOICE-TO-EXPENSE)
      // -----------------------------------------------------------------------
      else if (event.type === 'message' && event.message.type === 'audio') {
        const messageId = event.message.id;
        const duration = event.message.duration;
        console.log(`🎤 [3/6 🎙️ Voice Message] Received audio message (Message ID: ${messageId}, Duration: ${duration}ms) from "${user?.display_name || 'ผู้ใช้'}"`);

        const downloadResult = await downloadLineContent(messageId, 'm4a');
        if (downloadResult && downloadResult.buffer) {
          console.log(`🤖 [4/6 🎙️ Google Gemini Voice AI] Transcribing audio message with Multimodal AI...`);
          const voiceData = await transcribeAudioWithGemini(downloadResult.buffer, 'audio/m4a');
          console.log(`   ↳ ได้ยินว่า: "${voiceData.transcript}"`);
          console.log(`   ↳ แปลงข้อมูล: ฿${voiceData.amount} (${voiceData.type}) หมวดหมู่: ${voiceData.category}`);

          if (voiceData.amount > 0) {
            let cat = db.prepare("SELECT id, name FROM categories WHERE (workspace_id = ? OR workspace_id IS NULL) AND name LIKE ?").get(targetWsId, `%${voiceData.category}%`);
            if (!cat) {
              cat = db.prepare("SELECT id, name FROM categories WHERE (workspace_id = ? OR workspace_id IS NULL) AND type = ? LIMIT 1").get(targetWsId, voiceData.type);
            }
            const catId = cat ? cat.id : (voiceData.type === 'income' ? 'cat_t_inc_1' : 'cat_t_exp_1');

            const txId = 'tx_line_voice_' + Date.now().toString(36);
            db.prepare(`
              INSERT INTO transactions (id, workspace_id, user_id, category_id, type, amount, note, input_method, transaction_date)
              VALUES (?, ?, ?, ?, ?, ?, ?, 'voice', ?)
            `).run(txId, targetWsId, user?.id || 'usr_nicha', catId, voiceData.type, voiceData.amount, voiceData.transcript, new Date().toISOString().split('T')[0]);

            console.log(`   [5/6 ✅ Database] Recorded voice transaction: ฿${voiceData.amount} (${voiceData.type})`);

            // Append to Google Sheet
            try {
              const catName = cat?.name || voiceData.category;
              await appendTransactionToSheet({
                date: new Date().toISOString().split('T')[0],
                time: new Date().toTimeString().slice(0, 5),
                type: voiceData.type,
                amount: voiceData.amount,
                category: catName,
                note: `🎙️ ${voiceData.transcript}`,
                bank: 'บันทึกด้วยเสียงพูดผ่าน LINE',
                refNumber: txId,
                userName: user?.display_name || 'ผู้ใช้ LINE',
                slipUrl: ''
              });
            } catch (sheetErr) {
              console.warn('⚠️ Google Sheet append error:', sheetErr.message);
            }

            const sheetUrl = process.env.SPREADSHEET_ID ? `https://docs.google.com/spreadsheets/d/${process.env.SPREADSHEET_ID}/edit` : null;
            const driveUrl = process.env.GOOGLE_DRIVE_PARENT_ID ? `https://drive.google.com/drive/folders/${process.env.GOOGLE_DRIVE_PARENT_ID}` : null;

            const receiptFlex = buildOcrResultFlexMessage({
              amount: voiceData.amount,
              type: voiceData.type,
              bank: '🎙️ บันทึกด้วยเสียงพูดผ่าน LINE',
              date: new Date().toISOString().split('T')[0],
              time: new Date().toTimeString().slice(0, 5),
              sender: user?.display_name,
              receiver: wsName,
              category: cat?.name || voiceData.category,
              workspaceName: wsName,
              userName: user?.display_name || 'ผู้ใช้ LINE',
              confidence: voiceData.confidence || 98.0,
              txId,
              sheetUrl,
              driveUrl
            });

            if (event.replyToken) {
              await replyLineMessage(event.replyToken, receiptFlex);
            }
          } else {
            const sheetUrl = process.env.SPREADSHEET_ID ? `https://docs.google.com/spreadsheets/d/${process.env.SPREADSHEET_ID}/edit` : null;
            const driveUrl = process.env.GOOGLE_DRIVE_PARENT_ID ? `https://drive.google.com/drive/folders/${process.env.GOOGLE_DRIVE_PARENT_ID}` : null;

            const replyMsg = {
              type: 'text',
              text: `🎙️ ได้ยินว่า: "${voiceData.transcript || 'ฟังไม่ชัดเจน'}"\n(💡 หากต้องการบันทึกบัญชี กรุณาระบุจำนวนเงิน เช่น "ขายของได้ 350 บาท" หรือ "ซื้อของ 200" ค่ะ)`,
              quickReply: getStandardQuickReplies(sheetUrl, driveUrl)
            };
            if (event.replyToken) {
              await replyLineMessage(event.replyToken, replyMsg);
            }
          }
        }
      }

      // -----------------------------------------------------------------------
      // EVENT D: FOLLOW / ADD FRIEND EVENT
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
router.post('/process-slip-message', async (req, res) => {
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

    // Check duplicate
    const dupCheck = checkDuplicateSlip({
      referenceNo: ocrData.referenceNo,
      amount: ocrData.amount,
      date: ocrData.date,
      time: ocrData.time,
      bank: ocrData.bank,
      workspaceId: targetWsId
    });

    if (dupCheck.isDuplicate) {
      const dupFlex = buildDuplicateWarningFlexMessage({
        bank: ocrData.bank,
        amount: ocrData.amount,
        date: ocrData.date,
        time: ocrData.time,
        referenceNo: ocrData.referenceNo,
        existingDate: dupCheck.existingTx?.transaction_date,
        existingAmount: dupCheck.existingTx?.amount,
        workspaceName: wsName
      });

      return res.json({
        success: true,
        isDuplicate: true,
        message: dupCheck.reason,
        data: {
          ocrResult: ocrData,
          flexMessage: dupFlex
        }
      });
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

    // Auto-append to Google Sheet
    try {
      const createdTx = db.prepare(`
        SELECT t.*, c.name as category_name, u.display_name as user_name, w.name as workspace_name
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        LEFT JOIN users u ON t.user_id = u.id
        LEFT JOIN workspaces w ON t.workspace_id = w.id
        WHERE t.id = ?
      `).get(txId);
      if (createdTx) {
        await appendTransactionToSheet(createdTx);
      }
    } catch (sheetErr) {}

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
      confidence: ocrData.confidence || 99.2,
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
