import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_VISION_API_KEY;

const uploadDir = path.resolve(__dirname, '../../uploads');
const files = fs.readdirSync(uploadDir).filter(f => f.startsWith('line_slip_'));
const filePath = path.join(uploadDir, files[files.length - 1]);
const base64Image = fs.readFileSync(filePath).toString('base64');

async function testRealOcrWithWorkingModel() {
  console.log(`Sending real slip (${files[files.length - 1]}) to gemini-3.5-flash...`);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        parts: [
          {
            text: `คุณคือ AI ผู้เชี่ยวชาญในการอ่านสลิปโอนเงินธนาคารและใบเสร็จของประเทศไทย กรุณาอ่านข้อมูลจากรูปภาพสลิปนี้อย่างละเอียดและตรงตามความเป็นจริง 100% ห้ามแต่งเติมหรือมโนข้อมูลเองเด็ดขาด

ให้ตอบกลับเป็น JSON เท่านั้นในรูปแบบนี้:
{
  "bank": "ชื่อธนาคารภาษาไทย (เช่น ธนาคารกสิกรไทย, ไทยพาณิชย์, กรุงไทย, กรุงเทพ, พร้อมเพย์, 7-Eleven)",
  "amount": ยอดเงินสุทธิ (ตัวเลข Float เช่น 1500.00 หรือ 500.00),
  "type": "income" (ถ้าเป็นสลิปรับเงิน) หรือ "expense" (ถ้าเป็นสลิปโอนเงิน/จ่ายเงิน),
  "date": "YYYY-MM-DD (วันที่ทำรายการจริงบนสลิป เช่น 2026-08-25)",
  "time": "HH:MM (เวลาบนสลิป)",
  "sender": "ชื่อและนามสกุลของผู้โอนเงิน (จาก)",
  "receiver": "ชื่อและนามสกุลของผู้รับเงิน (ถึง)",
  "referenceNo": "รหัสอ้างอิงหรือเลขที่รายการบนสลิป",
  "category": "หมวดหมู่ภาษาไทย (เช่น ขายของหน้าร้าน, วัตถุดิบ, ค่าสาธารณูปโภค, ค่าอาหาร)",
  "rawText": "ข้อความทั้งหมดที่อ่านได้จากสลิป"
}`
          },
          {
            inline_data: {
              mime_type: 'image/jpeg',
              data: base64Image
            }
          }
        ]
      }
    ]
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const json = await res.json();
  console.log('Status:', res.status);
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  console.log('\n--- EXTRACTED SLIP DATA FROM REAL IMAGE ---');
  console.log(text);
}

testRealOcrWithWorkingModel().catch(console.error);
