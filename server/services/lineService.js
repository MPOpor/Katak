import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import https from 'https';
import dns from 'dns/promises';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, '../../uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Google Public DNS Resolver for fast, reliable LINE API routing
const dnsResolver = new dns.Resolver();
dnsResolver.setServers(['8.8.8.8', '1.1.1.1', '208.67.222.222']);

let cachedIps = {};

async function getFastIp(hostname) {
  if (cachedIps[hostname]) return cachedIps[hostname];
  try {
    const ips = await dnsResolver.resolve4(hostname);
    if (ips && ips.length > 0) {
      cachedIps[hostname] = ips[0];
      return ips[0];
    }
  } catch (err) {
    // fallback
  }
  return hostname;
}

/**
 * Robust HTTP/HTTPS Request to LINE APIs using Public DNS and SNI
 */
export function lineApiRequest({ hostname = 'api.line.me', path, method = 'GET', headers = {}, body = null }) {
  return new Promise(async (resolve, reject) => {
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const targetIp = await getFastIp(hostname);

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
      timeout: 12000,
      rejectUnauthorized: false
    };

    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          buffer: buffer,
          text: () => buffer.toString('utf-8'),
          json: () => {
            try {
              return JSON.parse(buffer.toString('utf-8'));
            } catch (e) {
              return { raw: buffer.toString('utf-8') };
            }
          }
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout connecting to LINE API (${hostname} via ${targetIp})`));
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

/**
 * Verify LINE Webhook Signature (HMAC-SHA256)
 */
export function verifyLineSignature(rawBody, signature) {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  if (!channelSecret || channelSecret === 'YOUR_LINE_CHANNEL_SECRET_HERE') {
    console.log('   [1/6 🔍 Signature] Bypass (LINE_CHANNEL_SECRET not configured or dev mode)');
    return true;
  }
  if (!signature) {
    console.log('   [1/6 ❌ Signature] Missing x-line-signature header');
    return false;
  }

  const hash = crypto
    .createHmac('sha256', channelSecret)
    .update(rawBody)
    .digest('base64');

  const isValid = hash === signature;
  console.log(`   [1/6 🔍 Signature] Verification: ${isValid ? 'PASSED ✓' : 'FAILED ❌'}`);
  return isValid;
}

/**
 * Download media content (slip image / audio / document) from LINE Content API
 */
export async function downloadLineContent(messageId) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token || token === 'YOUR_LINE_CHANNEL_ACCESS_TOKEN_HERE') {
    console.log('   [3/6 ℹ️ Download] LINE_CHANNEL_ACCESS_TOKEN is not configured.');
    return null;
  }

  console.log(`   [3/6 📥 Download] Fetching binary from LINE API (Message ID: ${messageId})...`);

  try {
    const res = await lineApiRequest({
      hostname: 'api-data.line.me',
      path: `/v2/bot/message/${messageId}/content`,
      method: 'GET'
    });

    if (res.statusCode !== 200) {
      throw new Error(`LINE API returned status ${res.statusCode}: ${res.text()}`);
    }

    const buffer = res.buffer;
    const filename = `line_slip_${Date.now()}_${messageId}.jpg`;
    const filePath = path.join(uploadDir, filename);

    fs.writeFileSync(filePath, buffer);
    const sizeKB = (buffer.length / 1024).toFixed(1);
    console.log(`   [3/6 ✅ Download] Saved image to uploads/${filename} (Size: ${sizeKB} KB)`);

    return {
      filePath,
      fileUrl: `/uploads/${filename}`,
      buffer,
      sizeKB
    };
  } catch (err) {
    console.error(`   [3/6 ❌ Download Failed]: ${err.message}`);
    return null;
  }
}

/**
 * Get User Profile from LINE Messaging API
 */
export async function getLineUserProfile(userId) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token || token === 'YOUR_LINE_CHANNEL_ACCESS_TOKEN_HERE') {
    return null;
  }

  try {
    const res = await lineApiRequest({
      hostname: 'api.line.me',
      path: `/v2/bot/profile/${userId}`,
      method: 'GET'
    });

    if (res.statusCode !== 200) return null;
    const data = res.json();
    console.log(`   [2/6 👤 Profile] Fetched LINE user: "${data.displayName}"`);
    return {
      displayName: data.displayName,
      pictureUrl: data.pictureUrl,
      statusMessage: data.statusMessage
    };
  } catch (err) {
    console.error(`   [2/6 ⚠️ Profile Fetch Error]: ${err.message}`);
    return null;
  }
}

/**
 * Reply message using LINE Messaging API
 */
export async function replyLineMessage(replyToken, messages) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token || token === 'YOUR_LINE_CHANNEL_ACCESS_TOKEN_HERE') {
    console.log('   [6/6 ℹ️ Reply] LINE_CHANNEL_ACCESS_TOKEN is not set. Logged locally.');
    return { success: true, localSimulation: true };
  }

  const payload = {
    replyToken,
    messages: Array.isArray(messages) ? messages : [messages]
  };

  console.log(`   [6/6 📤 Reply] Sending Flex Message via LINE API (replyToken: ${replyToken?.slice(0, 10)}...)...`);

  try {
    const res = await lineApiRequest({
      hostname: 'api.line.me',
      path: '/v2/bot/message/reply',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: payload
    });

    if (res.statusCode !== 200) {
      throw new Error(`LINE Reply API error ${res.statusCode}: ${res.text()}`);
    }

    console.log('   [6/6 ✅ Reply Delivered] Sent Flex Message card successfully to user!');
    return { success: true };
  } catch (err) {
    console.error(`   [6/6 ❌ Reply Failed]: ${err.message}`);
    return { success: false, error: err.message };
  }
}

/**
 * Build Welcome Flex Message when User Adds Bot or Sends "เมนู"
 */
export function buildWelcomeFlexMessage(displayName, publicAppUrl) {
  let liffUrl = publicAppUrl || 'https://thanachote-expense-ocr.loca.lt';
  if (!liffUrl.startsWith('https://')) {
    liffUrl = 'https://thanachote-expense-ocr.loca.lt';
  }

  return {
    type: 'flex',
    altText: 'ยินดีต้อนรับสู่ ป้านวล บัญชีรายรับ-รายจ่ายอัจฉริยะ',
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#F59E0B',
        paddingAll: '16px',
        contents: [
          {
            type: 'text',
            text: '✨ ป้านวล (ร้านขายของฝากไร่ธนโชติ)',
            color: '#FFFFFF',
            size: 'xs',
            weight: 'bold'
          },
          {
            type: 'text',
            text: `สวัสดีค่ะคุณ ${displayName || 'ลูกค้า'} 🙏`,
            color: '#FFFFFF',
            size: 'md',
            weight: 'bold',
            margin: 'xs'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        paddingAll: '16px',
        contents: [
          {
            type: 'text',
            text: '📷 ส่งสลิปโอนเงิน / ใบเสร็จ เข้ามาในแชทนี้ได้เลยค่ะ',
            size: 'xs',
            color: '#111827',
            weight: 'bold'
          },
          {
            type: 'text',
            text: 'ระบบ OCR จะอ่านยอดเงิน, วันเวลา และผู้รับ/ผู้โอน พร้อมบันทึกลงบัญชีให้อัตโนมัติทันที',
            size: 'xxs',
            color: '#6B7280',
            wrap: true
          },
          {
            type: 'separator',
            margin: 'sm'
          },
          {
            type: 'text',
            text: '🎙️ หรือพิมพ์คำสั่ง เช่น "ขายของได้ 1500 บาท", "จ่ายค่าไฟ 800"',
            size: 'xxs',
            color: '#4B5563',
            wrap: true
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        backgroundColor: '#FFFDF0',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#F59E0B',
            height: 'sm',
            action: {
              type: 'uri',
              label: '📊 เปิดแอปบัญชีบน LIFF',
              uri: liffUrl
            }
          }
        ]
      }
    }
  };
}
