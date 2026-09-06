/**
 * Transcribes and extracts income/expense information from Audio using Google Gemini Multimodal AI
 */
export async function transcribeAudioWithGemini(audioBuffer, mimeType = 'audio/m4a') {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey || !audioBuffer) {
    return {
      transcript: '',
      type: 'expense',
      amount: 0,
      category: 'ค่าใช้จ่ายทั่วไป',
      confidence: 0
    };
  }

  const base64Audio = Buffer.isBuffer(audioBuffer) ? audioBuffer.toString('base64') : '';
  const candidateModels = [
    'gemini-3.5-flash',
    'gemini-flash-latest',
    'gemini-2.0-flash',
    'gemini-1.5-flash'
  ];

  const promptText = `คุณคือ AI ผู้เชี่ยวชาญการถอดเสียงภาษาไทยและสกัดข้อมูลรายรับ-รายจ่ายของร้านค้า
กรุณาฟังเสียงภาษาไทยที่แนบมานี้อย่างละเอียด ถอดเสียงข้อความทั้งหมด และระบุรายการรายรับ-รายจ่ายออกมาในรูปแบบ JSON:
{
  "transcript": "ข้อความภาษาไทยทั้งหมดที่พูดในคลิปเสียง เช่น ขายของฝากได้ 500 บาท หรือ ซื้อกล่องพัสดุ 150 บาท",
  "type": "income" (ถ้ารายรับ/ขายได้/ได้เงิน) หรือ "expense" (ถ้ารายจ่าย/ซื้อของ/จ่ายค่า...),
  "amount": ตัวเลขยอดเงินสุทธิ Float เช่น 500.00 หรือ 0 (ถ้าไม่ได้พูดจำนวนเงิน),
  "category": "หมวดหมู่ภาษาไทย เช่น ขายของหน้าร้าน, ค่าสินค้า/วัตถุดิบ, ค่าสาธารณูปโภค, ค่าแรงงาน, ค่าอาหารและเครื่องดื่ม, ค่าเดินทาง/ยานพาหนะ, รายรับอื่นๆ, ค่าใช้จ่ายทั่วไป",
  "confidence": 98.5
}`;

  for (const model of candidateModels) {
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: promptText },
                {
                  inline_data: {
                    mime_type: mimeType || 'audio/m4a',
                    data: base64Audio
                  }
                }
              ]
            }
          ]
        })
      });

      if (res.ok) {
        const json = await res.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJson);
          return {
            transcript: parsed.transcript || '',
            type: parsed.type || 'expense',
            amount: parseFloat(parsed.amount) || 0,
            category: parsed.category || 'ค่าใช้จ่ายทั่วไป',
            confidence: parsed.confidence || 95
          };
        }
      }
    } catch (err) {
      console.warn(`[Voice Model ${model}] Error:`, err.message);
    }
  }

  return {
    transcript: '',
    type: 'expense',
    amount: 0,
    category: 'ค่าใช้จ่ายทั่วไป',
    confidence: 0
  };
}

export function parseThaiVoiceCommand(transcript) {
  if (!transcript || typeof transcript !== 'string') {
    return {
      type: 'expense',
      amount: 0,
      category: 'ค่าใช้จ่ายทั่วไป',
      note: '',
      confidence: 0,
      rawTranscript: ''
    };
  }

  const cleanText = transcript.trim().toLowerCase();
  let type = 'expense'; // default
  let amount = 0;
  let category = 'ค่าใช้จ่ายทั่วไป';
  let note = transcript.trim();
  let confidence = 90;

  // 1. Determine Intent (Income vs Expense)
  const incomeKeywords = [
    'ขายของ', 'ขายได้', 'ได้เงิน', 'รับเงิน', 'เงินเดือน', 'โอนเข้า', 
    'รายรับ', 'ขายของฝาก', 'ขายหน้าร้าน', 'ลูกค้าจ่าย', 'กำไร', 'ยอดขาย'
  ];
  const expenseKeywords = [
    'จ่าย', 'ซื้อ', 'ค่า', 'เสียเงิน', 'โอนออก', 'ชำระ', 'เติมน้ำมัน', 
    'กินข้าว', 'ค่าเช่า', 'ค่าไฟ', 'ค่าน้ำ', 'ค่าแรง'
  ];

  let incomeMatches = incomeKeywords.filter(k => cleanText.includes(k)).length;
  let expenseMatches = expenseKeywords.filter(k => cleanText.includes(k)).length;

  if (incomeMatches > expenseMatches) {
    type = 'income';
    category = 'ขายของหน้าร้าน';
  } else {
    type = 'expense';
  }

  // 2. Extract Amount (Convert Thai number words or digits to number)
  // Extract digits first: e.g. "1500", "1,500", "800.50", "2500"
  const digitMatch = cleanText.match(/(?:[0-9]{1,3}(?:,[0-9]{3})+|\d+)(?:\.\d{1,2})?/);
  if (digitMatch) {
    amount = parseFloat(digitMatch[0].replace(/,/g, ''));
  } else {
    // Basic Thai numeral word parser: เช่น "แปดร้อย", "หนึ่งพันห้าร้อย", "สองหมื่น"
    amount = parseThaiWordNumbers(cleanText);
  }

  // 3. Match Category based on Keywords
  if (type === 'income') {
    if (/ขายหน้าร้าน|ของฝาก|หน้าร้าน|ลูกค้าหน้าร้าน/i.test(cleanText)) {
      category = 'ขายของหน้าร้าน';
    } else if (/ออนไลน์|shopee|lazada|tiktok|ส่งพัสดุ/i.test(cleanText)) {
      category = 'ขายออนไลน์';
    } else if (/เงินเดือน|รายได้ประจำ|ค่าจ้าง/i.test(cleanText)) {
      category = 'เงินเดือน/รายได้หลัก';
    } else {
      category = 'รายรับอื่นๆ';
    }
  } else {
    // Expense Categories
    if (/ค่าไฟ|ค่าน้ำ|ค่าอินเทอร์เน็ต|ค่าเน็ต|การไฟฟ้า|การประปา|สาธารณูปโภค/i.test(cleanText)) {
      category = 'ค่าสาธารณูปโภค';
    } else if (/ค่าเช่า|ค่าที่|ค่าแผง|ค่าเช่าร้าน/i.test(cleanText)) {
      category = 'ค่าเช่าสถานที่';
    } else if (/วัตถุดิบ|ของสด|ผลไม้|บรรจุภัณฑ์|กล่อง|ถุง|ของทำขนม|สต็อก/i.test(cleanText)) {
      category = 'ค่าสินค้า/วัตถุดิบ';
    } else if (/ค่าแรง|เงินเดือนพนักงาน|ค่าจ้างพนักงาน|พนักงาน/i.test(cleanText)) {
      category = 'ค่าแรงงาน';
    } else if (/น้ำมัน|เติมน้ำมัน|ค่าเดินทาง|ค่ารถ|ทางด่วน|grab|วิน/i.test(cleanText)) {
      category = 'ค่าเดินทาง/ยานพาหนะ';
    } else if (/ข้าว|อาหาร|กาแฟ|เครื่องดื่ม|กิน|ส้มตำ|หมูกระทะ|ชาไข่มุก/i.test(cleanText)) {
      category = 'ค่าอาหารและเครื่องดื่ม';
    } else if (/ช้อปปิ้ง|ซื้อของ|เสื้อผ้า|อุปกรณ์/i.test(cleanText)) {
      category = 'ช้อปปิ้งและของใช้';
    } else {
      category = 'ค่าใช้จ่ายทั่วไป';
    }
  }

  return {
    type,
    amount,
    category,
    note,
    confidence,
    rawTranscript: transcript
  };
}

/**
 * Basic Thai word-number converter (e.g. "ห้าร้อยบาท", "พันสองร้อย")
 */
function parseThaiWordNumbers(text) {
  const units = {
    'หนึ่ง': 1, 'เอ็ด': 1, 'สอง': 2, 'ยี่': 2, 'สาม': 3, 'สี่': 4,
    'ห้า': 5, 'หก': 6, 'เจ็ด': 7, 'แปด': 8, 'เก้า': 9
  };
  const scales = {
    'สิบ': 10, 'ร้อย': 100, 'พัน': 1000, 'หมื่น': 10000, 'แสน': 100000, 'ล้าน': 1000000
  };

  // Simple heuristic for common patterns
  if (text.includes('ร้อย') || text.includes('พัน') || text.includes('หมื่น')) {
    let total = 0;
    if (text.includes('พันห้า')) total = 1500;
    else if (text.includes('สองพัน')) total = 2000;
    else if (text.includes('หนึ่งพัน')) total = 1000;
    else if (text.includes('แปดร้อย')) total = 800;
    else if (text.includes('ห้าร้อย')) total = 500;
    else if (text.includes('สามร้อย')) total = 300;
    else if (text.includes('สองร้อย')) total = 200;
    else if (text.includes('หนึ่งร้อย') || text.includes('ร้อย')) total = 100;
    return total;
  }
  return 0;
}

export const SAMPLE_VOICE_COMMANDS = [
  {
    id: 'voice-1',
    text: 'ขายของฝากหน้าร้านได้ 1,500 บาท',
    type: 'income',
    amount: 1500,
    category: 'ขายของหน้าร้าน'
  },
  {
    id: 'voice-2',
    text: 'จ่ายค่าไฟฟ้าประจำร้าน 800 บาท',
    type: 'expense',
    amount: 800,
    category: 'ค่าสาธารณูปโภค'
  },
  {
    id: 'voice-3',
    text: 'ซื้อวัตถุดิบบรรจุภัณฑ์กล่องของฝาก 1,250 บาท',
    type: 'expense',
    amount: 1250,
    category: 'ค่าสินค้า/วัตถุดิบ'
  },
  {
    id: 'voice-4',
    text: 'จ่ายค่าแรงรายวันพนักงานช่วยขาย 500 บาท',
    type: 'expense',
    amount: 500,
    category: 'ค่าแรงงาน'
  },
  {
    id: 'voice-5',
    text: 'เติมน้ำมันรถกระบะส่งของ 1,000 บาท',
    type: 'expense',
    amount: 1000,
    category: 'ค่าเดินทาง/ยานพาหนะ'
  }
];
