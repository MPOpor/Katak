import https from 'https';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

// Test direct connection to api-data.line.me (147.92.191.80)
const options = {
  hostname: '147.92.191.80',
  port: 443,
  path: '/v2/bot/info',
  method: 'GET',
  servername: 'api.line.me',
  headers: {
    'Host': 'api.line.me',
    'Authorization': `Bearer ${token}`
  },
  timeout: 8000
};

console.log('Testing connection to 147.92.191.80...');
const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('✅ Response from LINE IP 147.92.191.80:', res.statusCode, data);
  });
});

req.on('error', (e) => {
  console.log('❌ Error connecting to 147.92.191.80:', e.message);
});

req.on('timeout', () => {
  console.log('⏰ Timeout on 147.92.191.80');
  req.destroy();
});

req.end();
