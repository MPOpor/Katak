import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { performGoogleVisionOCR } from '../services/googleVisionService.js';
import { parseThaiSlipText } from '../services/ocrService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function debugRealSlip() {
  const uploadDir = path.resolve(__dirname, '../../uploads');
  const files = fs.readdirSync(uploadDir).filter(f => f.startsWith('line_slip_'));
  console.log('Found downloaded LINE slips:', files);

  if (files.length === 0) {
    console.log('No slip files in uploads directory.');
    return;
  }

  const latestFile = path.join(uploadDir, files[files.length - 1]);
  console.log('\n--- TESTING REAL SLIP FILE:', latestFile, '---');
  console.log('File size:', fs.statSync(latestFile).size, 'bytes');

  const result = await performGoogleVisionOCR(latestFile);
  console.log('\nResult from performGoogleVisionOCR:');
  console.log('Success:', result.success);
  console.log('Engine:', result.engine);
  console.log('Raw text:', result.rawText);
  console.log('Parsed Data:', JSON.stringify(result.data, null, 2));
}

debugRealSlip().catch(console.error);
