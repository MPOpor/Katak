import dotenv from 'dotenv';
dotenv.config();

const candidateModels = [
  'gemini-3.5-flash',
  'gemini-flash-latest',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-2.5-pro'
];

/**
 * Generates an intelligent, conversational Thai AI reply for LINE chat
 */
export async function askGeminiAssistant(userText, storeContext = {}) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_VISION_API_KEY;

  if (!apiKey) {
    return `สวัสดีค่ะคุณ ${storeContext.userName || 'ลูกค้า'}! น้องกบ Katak 🐸 ผู้ช่วยบันทึกบัญชีอัจฉริยะยินดีให้บริการค่ะ สามารถส่งรูปสลิปหรือพิมพ์ยอดเงินมาได้เลยนะคะ 😊`;
  }

  const todayIncome = storeContext.todayIncome || 0;
  const todayExpense = storeContext.todayExpense || 0;
  const todayNet = todayIncome - todayExpense;

  const systemInstruction = `คุณคือผู้ช่วย AI ประจำระบบบัญชีร้านค้า "${storeContext.workspaceName || 'ร้านขายของฝากไร่ธนโชติ'}"
ข้อมูลปัจจุบัน:
- ผู้ใช้: ${storeContext.userName || 'คุณลูกค้า'}
- รายรับวันนี้: ฿${todayIncome.toLocaleString()} บาท
- รายจ่ายวันนี้: ฿${todayExpense.toLocaleString()} บาท
- คงเหลือสุทธิวันนี้: ฿${todayNet.toLocaleString()} บาท
- รายการล่าสุด: ${storeContext.lastTransaction || 'ไม่มี'}

กฎสำคัญในการตอบ (ต้องปฏิบัติตามอย่างเคร่งครัด):
1. ตอบสั้น กระชับ ตรงประเด็นที่สุด ถามอะไรตอบแค่นั้น ไม่เกิน 1-2 ประโยค
2. ห้ามพูดนอกเรื่อง ห้ามอวยเยอะ ห้ามร่ายยาว ห้ามสรุปยอดถ้าผู้ใช้ไม่ได้ถาม
3. ถ้าผู้ใช้แค่ทักทาย เช่น สวัสดี ให้ทักทายตอบสั้นๆ เท่านั้น
4. ใช้ภาษาไทยสุภาพและเป็นกันเอง`;

  for (const model of candidateModels) {
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemInstruction}\n\nข้อความจากผู้ใช้: "${userText}"` }]
            }
          ]
        })
      });

      if (res.ok) {
        const json = await res.json();
        const replyText = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (replyText) {
          return replyText.trim();
        }
      }
    } catch (e) {
      // try next candidate model
    }
  }

  return `สวัสดีค่ะคุณ ${storeContext.userName || 'ลูกค้า'}! น้องกบ Katak ได้รับข้อความแล้วค่ะ 🐸 มีอะไรให้ช่วยบันทึกบัญชีหรือสอบถามข้อมูลยอดขายไหมคะ? พิมพ์บอกหรือส่งรูปสลิปมาได้เลยค่ะ ✨`;
}
