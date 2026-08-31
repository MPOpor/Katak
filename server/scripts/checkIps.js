import https from 'https';
import dns from 'dns/promises';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

async function checkCandidates() {
  const resolver = new dns.Resolver();
  resolver.setServers(['8.8.8.8', '1.1.1.1', '208.67.222.222']);

  const ips = [
    '104.85.2.193',
    '23.50.236.196',
    '23.50.236.197',
    '104.83.198.196',
    '147.92.191.80',
    '147.92.175.80'
  ];

  for (const ip of ips) {
    await new Promise((resolve) => {
      const req = https.request({
        hostname: ip,
        port: 443,
        path: '/v2/bot/info',
        method: 'GET',
        headers: {
          'Host': 'api.line.me',
          'Authorization': `Bearer ${token}`
        },
        timeout: 3000,
        rejectUnauthorized: false
      }, (res) => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => {
          console.log(`[${ip}] Status: ${res.statusCode}, Body: ${d.slice(0, 100)}`);
          resolve();
        });
      });

      req.on('error', e => {
        console.log(`[${ip}] Error: ${e.message}`);
        resolve();
      });
      req.on('timeout', () => {
        console.log(`[${ip}] Timeout`);
        req.destroy();
        resolve();
      });
      req.end();
    });
  }
}

checkCandidates();
