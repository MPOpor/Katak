/**
 * OCR Processing & Thai Slip / Receipt Entity Extraction Service
 * Includes OCR parsing regex, Bank slip detection, and Category Auto-matching
 */

export function parseThaiSlipText(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return {
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
      sender: '',
      receiver: '',
      bank: 'PromptPay',
      referenceNo: '',
      confidence: 0,
      suggestedCategory: 'ค่าใช้จ่ายทั่วไป',
      suggestedType: 'expense'
    };
  }

  const cleanText = rawText.replace(/\r/g, '\n');
  let amount = 0;
  let date = new Date().toISOString().split('T')[0];
  let time = new Date().toTimeString().slice(0, 5);
  let sender = '';
  let receiver = '';
  let bank = 'ทั่วไป / พร้อมเพย์';
  let referenceNo = '';
  let confidence = 85;

  // 1. Detect Bank
  if (/กสิกรไทย|kbank|kasikorn/i.test(cleanText)) bank = 'ธนาคารกสิกรไทย (KBank)';
  else if (/ไทยพาณิชย์|scb|siam commercial/i.test(cleanText)) bank = 'ธนาคารไทยพาณิชย์ (SCB)';
  else if (/กรุงไทย|krungthai|ktb/i.test(cleanText)) bank = 'ธนาคารกรุงไทย (Krungthai)';
  else if (/กรุงเทพ|bangkok bank|bbl/i.test(cleanText)) bank = 'ธนาคารกรุงเทพ (BBL)';
  else if (/ทีเอ็มบีธนชาต|ttb/i.test(cleanText)) bank = 'ธนาคารทหารไทยธนชาต (TTB)';
  else if (/ออมสิน|gsb/i.test(cleanText)) bank = 'ธนาคารออมสิน (GSB)';
  else if (/promptpay|พร้อมเพย์/i.test(cleanText)) bank = 'พร้อมเพย์ (PromptPay)';
  else if (/7-eleven|เซเว่น|cp all/i.test(cleanText)) bank = 'ใบเสร็จ 7-Eleven';
  else if (/lotus|โลตัส/i.test(cleanText)) bank = 'ใบเสร็จ Lotus';
  else if (/big c|บิ๊กซี/i.test(cleanText)) bank = 'ใบเสร็จ Big C';
  else if (/makro|แม็คโคร/i.test(cleanText)) bank = 'ใบเสร็จ Makro';

  // 2. Extract Amount
  // Patterns like: "จำนวนเงิน 1,500.00 บาท", "ยอดเงินสุทธิ 850.00", "Amount 500.00", "Total 120.00", "THB 1,200.00"
  const amountPatterns = [
    /(?:จำนวนเงิน|ยอดเงิน|ยอดรวม|สุทธิ|amount|total|thb|บาท)\s*[:=]?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)/i,
    /([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2}))\s*(?:บาท|thb|baht)/i,
    /(?:โอนเงินสำเร็จ|ชำระเงินสำเร็จ|success)\s*[\n\r\s]*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2}))/i,
    /\b([0-9]{1,3}(?:,[0-9]{3})*\.[0-9]{2})\b/
  ];

  for (const pattern of amountPatterns) {
    const match = cleanText.match(pattern);
    if (match && match[1]) {
      const parsed = parseFloat(match[1].replace(/,/g, ''));
      if (parsed > 0 && parsed < 10000000) {
        amount = parsed;
        break;
      }
    }
  }

  // 3. Extract Time (HH:MM or HH:MM:SS)
  const timeMatch = cleanText.match(/(?:เวลา|time)?\s*([01]?[0-9]|2[0-3])[:.]([0-5][0-9])(?::([0-5][0-9]))?/);
  if (timeMatch) {
    time = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
  }

  // 4. Extract Date (DD/MM/YYYY, DD-MM-YYYY, or Thai Month like 24 ส.ค. 2569)
  const thaiMonths = {
    'ม.ค.': '01', 'มกราคม': '01', 'ก.พ.': '02', 'กุมภาพันธ์': '02',
    'มี.ค.': '03', 'มีนาคม': '03', 'เม.ย.': '04', 'เมษายน': '04',
    'พ.ค.': '05', 'พฤษภาคม': '05', 'มิ.ย.': '06', 'มิถุนายน': '06',
    'ก.ค.': '07', 'กรกฎาคม': '07', 'ส.ค.': '08', 'สิงหาคม': '08',
    'ก.ย.': '09', 'กันยายน': '09', 'ต.ค.': '10', 'ตุลาคม': '10',
    'พ.ย.': '11', 'พฤศจิกายน': '11', 'ธ.ค.': '12', 'ธันวาคม': '12'
  };

  // Thai date pattern: 24 ส.ค. 2569 or 24 ส.ค. 69
  const thaiDateMatch = cleanText.match(/([0-3]?[0-9])\s+(ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.|มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม)\s+(25[0-9]{2}|[0-9]{2})/);
  if (thaiDateMatch) {
    const day = thaiDateMatch[1].padStart(2, '0');
    const month = thaiMonths[thaiDateMatch[2]] || '08';
    let year = parseInt(thaiDateMatch[3], 10);
    if (year > 2500) year -= 543;
    else if (year < 100) year += 2000;
    date = `${year}-${month}-${day}`;
  } else {
    // Numeric date pattern: DD/MM/YYYY or YYYY-MM-DD
    const numDateMatch = cleanText.match(/([0-3]?[0-9])[/-]([0-1]?[0-9])[/-](20[0-9]{2}|25[0-9]{2})/);
    if (numDateMatch) {
      let yr = parseInt(numDateMatch[3], 10);
      if (yr > 2500) yr -= 543;
      date = `${yr}-${numDateMatch[2].padStart(2, '0')}-${numDateMatch[1].padStart(2, '0')}`;
    }
  }

  // 5. Extract Reference / Transaction ID
  const refMatch = cleanText.match(/(?:เลขที่รายการ|รหัสอ้างอิง|ref(?:\s*no)?|transaction id)\s*[:=]?\s*([a-zA-Z0-9]{8,30})/i);
  if (refMatch) {
    referenceNo = refMatch[1];
  }

  // 6. Extract Sender / Receiver
  const senderMatch = cleanText.match(/(?:จาก|ผู้โอน|sender|from)\s*[:=]?\s*([^\n\r,]+)/i);
  if (senderMatch) {
    sender = senderMatch[1].trim().slice(0, 50);
  }
  const receiverMatch = cleanText.match(/(?:ถึง|ผู้รับ|ไปยัง|receiver|to)\s*[:=]?\s*([^\n\r,]+)/i);
  if (receiverMatch) {
    receiver = receiverMatch[1].trim().slice(0, 50);
  }

  // 7. Auto Category & Type Suggestion
  let suggestedCategory = 'ค่าใช้จ่ายทั่วไป';
  let suggestedType = 'expense';

  if (/ไร่ธนโชติ|โอนเข้า|รับเงิน|ขายของ|ลูกค้า/i.test(cleanText) || (receiver && /ไร่ธนโชติ/i.test(receiver))) {
    suggestedType = 'income';
    suggestedCategory = 'ขายของหน้าร้าน';
  } else if (/กฟภ|การไฟฟ้า|การประปา|ค่าไฟ|ค่าน้ำ|บิลค่า|mea|pea|pwa/i.test(cleanText)) {
    suggestedCategory = 'ค่าสาธารณูปโภค';
  } else if (/ค่าเช่า|rent|ตลาด|แผง/i.test(cleanText)) {
    suggestedCategory = 'ค่าเช่าสถานที่';
  } else if (/วัตถุดิบ|ของสด|ผลไม้|บรรจุภัณฑ์|กล่อง|ถุง|makro|แพ็คเกจ/i.test(cleanText)) {
    suggestedCategory = 'ค่าสินค้า/วัตถุดิบ';
  } else if (/ค่าแรง|เงินเดือน|ค่าจ้าง|พนักงาน/i.test(cleanText)) {
    suggestedCategory = 'ค่าแรงงาน';
  } else if (/7-eleven|อาหาร|food|grab|lineman|ร้านอาหาร|กาแฟ|cafe/i.test(cleanText)) {
    suggestedCategory = 'ค่าอาหารและเครื่องดื่ม';
  } else if (/ปตท|ptt|น้ำมัน|gasoline|เชลล์|shell|caltex/i.test(cleanText)) {
    suggestedCategory = 'ค่าเดินทาง/ยานพาหนะ';
  }

  return {
    amount,
    date,
    time,
    sender,
    receiver,
    bank,
    referenceNo,
    confidence,
    suggestedCategory,
    suggestedType,
    rawText: rawText.slice(0, 1000)
  };
}

/**
 * Predefined Sample Slips for Instant Testing
 */
export const SAMPLE_SLIPS = [
  {
    id: 'sample-kbank-1',
    name: 'สลิป KBank - รับเงินขายของฝาก ไร่ธนโชติ (1,500 บาท)',
    bank: 'ธนาคารกสิกรไทย (KBank)',
    amount: 1500.00,
    date: '2026-08-24',
    time: '14:25',
    type: 'income',
    category: 'ขายของหน้าร้าน',
    sender: 'นาย กิตติศักดิ์ พรหมดี',
    receiver: 'ร้านขายของฝากไร่ธนโชติ (บจก. ธนโชติ)',
    referenceNo: '202608240987KBANK991',
    note: 'ลูกค้าซื้อกล้วยตากอบน้ำผึ้งและมะขามแช่อิ่ม 5 กล่อง',
    imageUrl: '/sample-slips/slip_kbank_1500.png',
    rawOcr: `ธนาคารกสิกรไทย\nโอนเงินสำเร็จ\n24 ส.ค. 2569 14:25 น.\nจาก นาย กิตติศักดิ์ พรหมดี\nxxx-x-x1234-x\nไปยัง ร้านขายของฝากไร่ธนโชติ\nxxx-x-x5678-x\nจำนวนเงิน: 1,500.00 บาท\nค่าธรรมเนียม: 0.00 บาท\nรหัสอ้างอิง: 202608240987KBANK991`
  },
  {
    id: 'sample-scb-2',
    name: 'สลิป SCB - จ่ายค่าไฟฟ้าประจำร้าน (800 บาท)',
    bank: 'ธนาคารไทยพาณิชย์ (SCB)',
    amount: 800.00,
    date: '2026-08-23',
    time: '10:15',
    type: 'expense',
    category: 'ค่าสาธารณูปโภค',
    sender: 'ร้านขายของฝากไร่ธนโชติ',
    receiver: 'การไฟฟ้าส่วนภูมิภาค (PEA)',
    referenceNo: 'SCB9928172645100',
    note: 'บิลค่าไฟฟ้าประจำเดือน สิงหาคม 2569',
    imageUrl: '/sample-slips/slip_scb_800.png',
    rawOcr: `ธนาคารไทยพาณิชย์ SCB EASY\nทำรายการโอนเงินสำเร็จ\n23 ส.ค. 2569 10:15:30\nจาก ร้านขายของฝากไร่ธนโชติ\nถึง การไฟฟ้าส่วนภูมิภาค (PEA)\nจำนวนเงิน (บาท)\n800.00\nเลขที่รายการ: SCB9928172645100`
  },
  {
    id: 'sample-promptpay-3',
    name: 'สลิป PromptPay - ซื้อวัตถุดิบบรรจุภัณฑ์ (1,250 บาท)',
    bank: 'พร้อมเพย์ (PromptPay)',
    amount: 1250.00,
    date: '2026-08-22',
    time: '16:40',
    type: 'expense',
    category: 'ค่าสินค้า/วัตถุดิบ',
    sender: 'ณิชา ทองอยู่ (ผู้จัดการ)',
    receiver: 'โรงงานกล่องบรรจุภัณฑ์ไทย',
    referenceNo: 'PP20260822998811',
    note: 'สั่งกล่องกระดาษคราฟท์ใส่ของฝาก 200 ชิ้น',
    imageUrl: '/sample-slips/slip_promptpay_1250.png',
    rawOcr: `พร้อมเพย์ PromptPay Transfer\nโอนเงินสำเร็จ\n22 ส.ค. 2569 16:40\nจาก: ณิชา ทองอยู่\nไปยัง: โรงงานกล่องบรรจุภัณฑ์ไทย\n089-xxx-4321\nยอดเงิน: 1,250.00 บาท\nRef: PP20260822998811`
  },
  {
    id: 'sample-receipt-4',
    name: 'ใบเสร็จ 7-Eleven - ค่าของใช้ทำความสะอาดร้าน (245 บาท)',
    bank: 'ใบเสร็จ 7-Eleven',
    amount: 245.00,
    date: '2026-08-24',
    time: '08:30',
    type: 'expense',
    category: 'ค่าใช้จ่ายทั่วไป',
    sender: 'กัญจนพร จตุรพรพรหม',
    receiver: '7-Eleven สาขาตลาดไร่ธนโชติ (14205)',
    referenceNo: '7ELEVEN-R-20260824',
    note: 'น้ำยาล้างจาน ทิชชู่ และถุงขยะสำหรับร้าน',
    imageUrl: '/sample-slips/receipt_7eleven_245.png',
    rawOcr: `7-ELEVEN (CP ALL PLC.)\nสาขา 14205 ไร่ธนโชติ\n24/08/2569 08:30 น.\nน้ำยาล้างจาน 55.00\nกระดาษทิชชู่ 95.00\nถุงขยะ 95.00\nรวมทั้งสิ้น / Total 245.00 บาท\nเงินสด Cash 300.00 บาท\nเงินทอน Change 55.00 บาท\nTHANK YOU`
  }
];
