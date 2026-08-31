import { buildOcrResultFlexMessage } from '../services/flexService.js';
import dotenv from 'dotenv';
dotenv.config();

const flex = buildOcrResultFlexMessage({
  amount: 1500,
  type: 'income',
  bank: 'ธนาคารกสิกรไทย (KBank)',
  date: '2026-08-25',
  time: '00:09',
  sender: 'นาย กิตติศักดิ์ พรหมดี',
  receiver: 'ร้านขายของฝากไร่ธนโชติ',
  referenceNo: '20260825KBANK991',
  category: 'ขายของหน้าร้าน',
  workspaceName: 'ร้านขายของฝากไร่ธนโชติ',
  userName: 'Punch',
  confidence: 99.5
});

console.log('Flex Message payload valid JSON:');
console.log(JSON.stringify(flex, null, 2));
