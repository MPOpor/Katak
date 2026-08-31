import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_VISION_API_KEY;

async function listModels() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const res = await fetch(url);
  console.log('List models status:', res.status);
  const data = await res.json();
  if (data.models) {
    console.log('Available models:', data.models.map(m => m.name));
  } else {
    console.log('Response:', data);
  }
}

listModels();
