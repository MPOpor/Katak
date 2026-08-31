import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_VISION_API_KEY;
console.log('API Key:', apiKey);

const uploadDir = path.resolve(__dirname, '../../uploads');
const files = fs.readdirSync(uploadDir).filter(f => f.startsWith('line_slip_'));
const filePath = path.join(uploadDir, files[files.length - 1]);
const base64Image = fs.readFileSync(filePath).toString('base64');
console.log('Image Base64 length:', base64Image.length);

async function testVision() {
  console.log('\n--- 1. Testing Google Cloud Vision API ---');
  const visionUrl = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;
  const visionBody = {
    requests: [
      {
        image: { content: base64Image },
        features: [
          { type: 'DOCUMENT_TEXT_DETECTION' },
          { type: 'TEXT_DETECTION' }
        ]
      }
    ]
  };

  try {
    const res = await fetch(visionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(visionBody)
    });
    console.log('Vision Status:', res.status);
    const json = await res.json();
    console.log('Vision Response:', JSON.stringify(json, null, 2).slice(0, 500));
  } catch (e) {
    console.error('Vision fetch error:', e);
  }
}

async function testGemini() {
  console.log('\n--- 2. Testing Gemini 1.5 Flash API ---');
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const geminiBody = {
    contents: [
      {
        parts: [
          { text: 'Extract text from this slip image.' },
          { inline_data: { mime_type: 'image/jpeg', data: base64Image } }
        ]
      }
    ]
  };

  try {
    const res = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody)
    });
    console.log('Gemini Status:', res.status);
    const json = await res.json();
    console.log('Gemini Response:', JSON.stringify(json, null, 2).slice(0, 500));
  } catch (e) {
    console.error('Gemini fetch error:', e);
  }
}

async function run() {
  await testVision();
  await testGemini();
}

run();
