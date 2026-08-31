import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const slipsDir = path.resolve(__dirname, '../../sample-slips');

if (!fs.existsSync(slipsDir)) {
  fs.mkdirSync(slipsDir, { recursive: true });
}

// 1. KBank Slip SVG
const kbankSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 650" width="400" height="650">
  <defs>
    <linearGradient id="kbankGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00A950"/>
      <stop offset="100%" stop-color="#007A38"/>
    </linearGradient>
  </defs>
  <rect width="400" height="650" rx="16" fill="#F8FAF9"/>
  <!-- Header -->
  <path d="M 0 16 Q 0 0 16 0 L 384 0 Q 400 0 400 16 L 400 110 L 0 110 Z" fill="url(#kbankGrad)"/>
  <circle cx="50" cy="55" r="24" fill="#FFFFFF"/>
  <text x="50" y="62" font-family="'Prompt', sans-serif" font-weight="bold" font-size="20" fill="#00A950" text-anchor="middle">K+</text>
  <text x="90" y="50" font-family="'Prompt', sans-serif" font-weight="bold" font-size="18" fill="#FFFFFF">ธนาคารกสิกรไทย</text>
  <text x="90" y="74" font-family="'Prompt', sans-serif" font-size="13" fill="#E8F5E9">โอนเงินสำเร็จ / Transfer Successful</text>

  <!-- Content Card -->
  <rect x="20" y="130" width="360" height="490" rx="12" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1"/>
  
  <text x="200" y="165" font-family="'Prompt', sans-serif" font-size="12" fill="#6B7280" text-anchor="middle">24 ส.ค. 2569 14:25 น.</text>
  
  <!-- From -->
  <circle cx="45" cy="205" r="14" fill="#E8F5E9"/>
  <text x="45" y="210" font-family="'Prompt', sans-serif" font-size="11" fill="#00A950" text-anchor="middle">จาก</text>
  <text x="70" y="202" font-family="'Prompt', sans-serif" font-weight="bold" font-size="14" fill="#1F2937">นาย กิตติศักดิ์ พรหมดี</text>
  <text x="70" y="220" font-family="'Prompt', sans-serif" font-size="12" fill="#6B7280">KBANK xxx-x-x1234-x</text>

  <!-- Divider -->
  <line x1="45" y1="230" x2="45" y2="255" stroke="#00A950" stroke-width="2" stroke-dasharray="3,3"/>

  <!-- To -->
  <circle cx="45" cy="280" r="14" fill="#00A950"/>
  <text x="45" y="285" font-family="'Prompt', sans-serif" font-size="11" fill="#FFFFFF" text-anchor="middle">ถึง</text>
  <text x="70" y="277" font-family="'Prompt', sans-serif" font-weight="bold" font-size="14" fill="#1F2937">ร้านขายของฝากไร่ธนโชติ</text>
  <text x="70" y="295" font-family="'Prompt', sans-serif" font-size="12" fill="#6B7280">KBANK xxx-x-x5678-x</text>

  <line x1="40" y1="320" x2="360" y2="320" stroke="#F3F4F6" stroke-width="2"/>

  <!-- Amount -->
  <text x="200" y="360" font-family="'Prompt', sans-serif" font-size="13" fill="#6B7280" text-anchor="middle">จำนวนเงิน (บาท) / Amount</text>
  <text x="200" y="405" font-family="'Prompt', sans-serif" font-weight="bold" font-size="34" fill="#00A950" text-anchor="middle">1,500.00</text>
  <text x="200" y="430" font-family="'Prompt', sans-serif" font-size="12" fill="#9CA3AF" text-anchor="middle">ค่าธรรมเนียม: 0.00 บาท</text>

  <line x1="40" y1="455" x2="360" y2="455" stroke="#F3F4F6" stroke-width="2"/>

  <!-- Ref & QR Code simulation -->
  <text x="40" y="485" font-family="'Prompt', sans-serif" font-size="11" fill="#9CA3AF">รหัสอ้างอิง:</text>
  <text x="40" y="505" font-family="'Prompt', sans-serif" font-weight="bold" font-size="12" fill="#4B5563">202608240987KBANK991</text>
  
  <rect x="270" y="475" width="80" height="80" fill="#F3F4F6" rx="6"/>
  <rect x="280" y="485" width="60" height="60" fill="#1F2937"/>
  <rect x="290" y="495" width="40" height="40" fill="#FFFFFF"/>
  <rect x="300" y="505" width="20" height="20" fill="#00A950"/>
  
  <text x="200" y="595" font-family="'Prompt', sans-serif" font-size="11" fill="#10B981" text-anchor="middle">✓ สแกนตรวจสอบความถูกต้องกับธนาคารแล้ว</text>
</svg>`;

// 2. SCB Slip SVG
const scbSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 650" width="400" height="650">
  <defs>
    <linearGradient id="scbGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4E2E80"/>
      <stop offset="100%" stop-color="#3A1C68"/>
    </linearGradient>
  </defs>
  <rect width="400" height="650" rx="16" fill="#F9F8FC"/>
  <!-- Header -->
  <path d="M 0 16 Q 0 0 16 0 L 384 0 Q 400 0 400 16 L 400 110 L 0 110 Z" fill="url(#scbGrad)"/>
  <circle cx="50" cy="55" r="24" fill="#FEBC11"/>
  <text x="50" y="62" font-family="'Prompt', sans-serif" font-weight="bold" font-size="16" fill="#4E2E80" text-anchor="middle">SCB</text>
  <text x="90" y="50" font-family="'Prompt', sans-serif" font-weight="bold" font-size="18" fill="#FFFFFF">SCB EASY</text>
  <text x="90" y="74" font-family="'Prompt', sans-serif" font-size="13" fill="#E2D9F3">ทำรายการโอนเงินสำเร็จ</text>

  <!-- Content Card -->
  <rect x="20" y="130" width="360" height="490" rx="12" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1"/>
  <text x="200" y="165" font-family="'Prompt', sans-serif" font-size="12" fill="#6B7280" text-anchor="middle">23 ส.ค. 2569 10:15:30</text>
  
  <text x="40" y="200" font-family="'Prompt', sans-serif" font-size="12" fill="#6B7280">จาก</text>
  <text x="40" y="222" font-family="'Prompt', sans-serif" font-weight="bold" font-size="15" fill="#1F2937">ร้านขายของฝากไร่ธนโชติ</text>
  
  <text x="40" y="265" font-family="'Prompt', sans-serif" font-size="12" fill="#6B7280">ถึง</text>
  <text x="40" y="287" font-family="'Prompt', sans-serif" font-weight="bold" font-size="15" fill="#1F2937">การไฟฟ้าส่วนภูมิภาค (PEA)</text>
  <text x="40" y="307" font-family="'Prompt', sans-serif" font-size="12" fill="#6B7280">บิลค่าไฟฟ้าประจำเดือน สิงหาคม</text>

  <line x1="40" y1="330" x2="360" y2="330" stroke="#F3F4F6" stroke-width="2"/>

  <text x="200" y="370" font-family="'Prompt', sans-serif" font-size="13" fill="#6B7280" text-anchor="middle">จำนวนเงิน (บาท)</text>
  <text x="200" y="415" font-family="'Prompt', sans-serif" font-weight="bold" font-size="36" fill="#4E2E80" text-anchor="middle">800.00</text>

  <line x1="40" y1="460" x2="360" y2="460" stroke="#F3F4F6" stroke-width="2"/>

  <text x="40" y="495" font-family="'Prompt', sans-serif" font-size="12" fill="#9CA3AF">เลขที่รายการ:</text>
  <text x="40" y="520" font-family="'Prompt', sans-serif" font-weight="bold" font-size="13" fill="#374151">SCB9928172645100</text>

  <text x="200" y="585" font-family="'Prompt', sans-serif" font-size="12" fill="#4E2E80" text-anchor="middle">SCB EASY Application</text>
</svg>`;

// 3. PromptPay Slip SVG
const promptPaySvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 650" width="400" height="650">
  <defs>
    <linearGradient id="ppGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#003D79"/>
      <stop offset="100%" stop-color="#002244"/>
    </linearGradient>
  </defs>
  <rect width="400" height="650" rx="16" fill="#F0F7FF"/>
  <path d="M 0 16 Q 0 0 16 0 L 384 0 Q 400 0 400 16 L 400 110 L 0 110 Z" fill="url(#ppGrad)"/>
  <text x="200" y="55" font-family="'Prompt', sans-serif" font-weight="bold" font-size="22" fill="#FFFFFF" text-anchor="middle">PromptPay พร้อมเพย์</text>
  <text x="200" y="80" font-family="'Prompt', sans-serif" font-size="13" fill="#BAE6FD" text-anchor="middle">โอนเงินสำเร็จ / Transfer Successful</text>

  <rect x="20" y="130" width="360" height="490" rx="12" fill="#FFFFFF" stroke="#E0F2FE" stroke-width="1"/>
  <text x="200" y="165" font-family="'Prompt', sans-serif" font-size="12" fill="#6B7280" text-anchor="middle">22 ส.ค. 2569 16:40 น.</text>
  
  <text x="40" y="205" font-family="'Prompt', sans-serif" font-size="12" fill="#6B7280">จาก (Sender)</text>
  <text x="40" y="228" font-family="'Prompt', sans-serif" font-weight="bold" font-size="15" fill="#1F2937">ณิชา ทองอยู่</text>

  <text x="40" y="270" font-family="'Prompt', sans-serif" font-size="12" fill="#6B7280">ไปยัง (Receiver)</text>
  <text x="40" y="293" font-family="'Prompt', sans-serif" font-weight="bold" font-size="15" fill="#1F2937">โรงงานกล่องบรรจุภัณฑ์ไทย</text>
  <text x="40" y="313" font-family="'Prompt', sans-serif" font-size="12" fill="#0284C7">PromptPay 089-xxx-4321</text>

  <line x1="40" y1="335" x2="360" y2="335" stroke="#F0F9FF" stroke-width="2"/>

  <text x="200" y="375" font-family="'Prompt', sans-serif" font-size="13" fill="#6B7280" text-anchor="middle">ยอดเงิน (Amount)</text>
  <text x="200" y="420" font-family="'Prompt', sans-serif" font-weight="bold" font-size="36" fill="#0369A1" text-anchor="middle">1,250.00 บาท</text>

  <line x1="40" y1="465" x2="360" y2="465" stroke="#F0F9FF" stroke-width="2"/>

  <text x="40" y="500" font-family="'Prompt', sans-serif" font-size="12" fill="#9CA3AF">Ref No:</text>
  <text x="40" y="525" font-family="'Prompt', sans-serif" font-weight="bold" font-size="13" fill="#1E293B">PP20260822998811</text>
</svg>`;

// 4. 7-Eleven Receipt SVG
const sevenElevenSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 350 550" width="350" height="550">
  <rect width="350" height="550" fill="#FAF9F5" stroke="#E5E7EB" stroke-width="2"/>
  <text x="175" y="45" font-family="'Courier New', monospace" font-weight="bold" font-size="22" fill="#007A3E" text-anchor="middle">7-ELEVEN</text>
  <text x="175" y="70" font-family="'Courier New', monospace" font-size="11" fill="#4B5563" text-anchor="middle">CP ALL PUBLIC COMPANY LIMITED</text>
  <text x="175" y="90" font-family="'Courier New', monospace" font-size="11" fill="#4B5563" text-anchor="middle">สาขา 14205 ไร่ธนโชติ</text>
  <text x="175" y="110" font-family="'Courier New', monospace" font-size="11" fill="#4B5563" text-anchor="middle">TAX# 0107542000011 POS#02</text>
  <text x="175" y="130" font-family="'Courier New', monospace" font-size="11" fill="#4B5563" text-anchor="middle">24/08/2569 08:30 น.</text>

  <line x1="25" y1="145" x2="325" y2="145" stroke="#9CA3AF" stroke-dasharray="4,4"/>

  <text x="30" y="175" font-family="'Courier New', monospace" font-size="13" fill="#111827">น้ำยาล้างจาน</text>
  <text x="320" y="175" font-family="'Courier New', monospace" font-size="13" fill="#111827" text-anchor="end">55.00</text>

  <text x="30" y="205" font-family="'Courier New', monospace" font-size="13" fill="#111827">กระดาษทิชชู่ 3 ม้วน</text>
  <text x="320" y="205" font-family="'Courier New', monospace" font-size="13" fill="#111827" text-anchor="end">95.00</text>

  <text x="30" y="235" font-family="'Courier New', monospace" font-size="13" fill="#111827">ถุงขยะดำ 30x40 นิ้ว</text>
  <text x="320" y="235" font-family="'Courier New', monospace" font-size="13" fill="#111827" text-anchor="end">95.00</text>

  <line x1="25" y1="260" x2="325" y2="260" stroke="#9CA3AF" stroke-dasharray="4,4"/>

  <text x="30" y="295" font-family="'Courier New', monospace" font-weight="bold" font-size="16" fill="#111827">รวมทั้งสิ้น / TOTAL</text>
  <text x="320" y="295" font-family="'Courier New', monospace" font-weight="bold" font-size="18" fill="#111827" text-anchor="end">245.00</text>

  <text x="30" y="330" font-family="'Courier New', monospace" font-size="12" fill="#4B5563">เงินสด (Cash)</text>
  <text x="320" y="330" font-family="'Courier New', monospace" font-size="12" fill="#4B5563" text-anchor="end">300.00</text>

  <text x="30" y="355" font-family="'Courier New', monospace" font-size="12" fill="#4B5563">เงินทอน (Change)</text>
  <text x="320" y="355" font-family="'Courier New', monospace" font-size="12" fill="#4B5563" text-anchor="end">55.00</text>

  <line x1="25" y1="380" x2="325" y2="380" stroke="#9CA3AF" stroke-dasharray="4,4"/>

  <text x="175" y="420" font-family="'Courier New', monospace" font-size="13" fill="#4B5563" text-anchor="middle">THANK YOU - ขอบคุณที่ใช้บริการ</text>
  <text x="175" y="445" font-family="'Courier New', monospace" font-size="11" fill="#9CA3AF" text-anchor="middle">7-ELEVEN ไร่ธนโชติ</text>
</svg>`;

// Write files
fs.writeFileSync(path.join(slipsDir, 'slip_kbank_1500.png'), kbankSvg);
fs.writeFileSync(path.join(slipsDir, 'slip_scb_800.png'), scbSvg);
fs.writeFileSync(path.join(slipsDir, 'slip_promptpay_1250.png'), promptPaySvg);
fs.writeFileSync(path.join(slipsDir, 'receipt_7eleven_245.png'), sevenElevenSvg);

console.log('✅ Sample visual slip assets created in sample-slips/');
