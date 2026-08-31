import https from 'https';
import dns from 'dns/promises';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

// Create public DNS resolver (8.8.8.8, 1.1.1.1)
const resolver = new dns.Resolver();
resolver.setServers(['8.8.8.8', '1.1.1.1']);

let cachedLineIps = {};

export async function resolveFastIp(hostname) {
  if (cachedLineIps[hostname]) return cachedLineIps[hostname];
  try {
    const ips = await resolver.resolve4(hostname);
    if (ips && ips.length > 0) {
      cachedLineIps[hostname] = ips[0];
      return ips[0];
    }
  } catch (e) {
    console.warn('Resolver error:', e.message);
  }
  return hostname;
}

export function lineApiRequest({ hostname, path, method = 'GET', headers = {}, body = null }) {
  return new Promise(async (resolve, reject) => {
    const targetIp = await resolveFastIp(hostname);

    const options = {
      hostname: targetIp,
      port: 443,
      path: path,
      method: method,
      servername: hostname,
      headers: {
        'Host': hostname,
        'Authorization': `Bearer ${token}`,
        ...headers
      },
      timeout: 10000,
      rejectUnauthorized: false
    };

    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const resBuffer = Buffer.concat(chunks);
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: resBuffer,
          text: () => resBuffer.toString('utf-8'),
          json: () => JSON.parse(resBuffer.toString('utf-8'))
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout connecting to ${hostname} (${targetIp})`));
    });

    if (body) {
      if (Buffer.isBuffer(body) || typeof body === 'string') {
        req.write(body);
      } else {
        req.write(JSON.stringify(body));
      }
    }
    req.end();
  });
}

async function testHelper() {
  console.log('Testing lineApiRequest helper...');
  const res = await lineApiRequest({
    hostname: 'api.line.me',
    path: '/v2/bot/info'
  });
  console.log('Status:', res.statusCode);
  console.log('Bot info JSON:', res.json());
}

testHelper();
