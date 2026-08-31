import { lineApiRequest } from '../services/lineService.js';
import { buildOcrResultFlexMessage } from '../services/flexService.js';
import dotenv from 'dotenv';
dotenv.config();

async function validateFlexAgainstLine() {
  console.log('Validating Flex Message directly against LINE Messaging API...');

  const flex = buildOcrResultFlexMessage({
    amount: 1500,
    type: 'income',
    bank: 'ธนาคารกสิกรไทย (KBank)',
    date: '2026-08-25',
    time: '00:16',
    sender: 'นาย กิตติศักดิ์ พรหมดี',
    receiver: 'ร้านขายของฝากไร่ธนโชติ',
    referenceNo: '20260825KBANK991',
    category: 'ขายของหน้าร้าน',
    workspaceName: 'ร้านขายของฝากไร่ธนโชติ',
    userName: 'Punch',
    confidence: 99.5
  });

  const payload = {
    messages: [flex]
  };

  try {
    const res = await lineApiRequest({
      hostname: 'api.line.me',
      path: '/v2/bot/message/validate/reply',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: payload
    });

    console.log('LINE Validation Status:', res.statusCode);
    if (res.statusCode === 200) {
      console.log('✅ 100% PERFECT! LINE Messaging API validated and approved this Flex Message schema!');
    } else {
      console.log('❌ LINE Validation Error:', res.text());
    }
  } catch (err) {
    console.error('Validation request error:', err.message);
  }
}

validateFlexAgainstLine();
