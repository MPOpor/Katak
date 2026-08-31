import dns from 'dns';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Set IPv4 first for Windows network compatibility
dns.setDefaultResultOrder('ipv4first');

const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

async function testFetch() {
  console.log('Testing fetch to api.line.me with ipv4first...');
  try {
    const res = await fetch('https://api.line.me/v2/bot/info', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Bot info:', data);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

testFetch();
