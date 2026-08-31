import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_VISION_API_KEY;

const modelsToTest = [
  'gemini-flash-latest',
  'gemini-pro-latest',
  'gemini-2.5-flash-lite',
  'gemini-3.7-flash',
  'gemini-3.5-flash'
];

async function testWorkingModel() {
  for (const m of modelsToTest) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Hello' }] }]
        })
      });
      console.log(`Model [${m}] Status:`, res.status);
      if (res.status === 200) {
        const d = await res.json();
        console.log(`✅ SUCCESS with model: ${m}! Response:`, d.candidates[0].content.parts[0].text.trim());
        return m;
      }
    } catch (e) {
      console.log(`Model [${m}] error:`, e.message);
    }
  }
}

testWorkingModel();
