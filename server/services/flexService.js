/**
 * Professional LINE Flex Message Builder for Smart Expense OCR System
 * Generates production-ready LINE Flex Message JSON for slip receipts, budget alerts, and verification cards.
 */

export function buildOcrResultFlexMessage({
  amount,
  type = 'income',
  bank = 'ธนาคารกสิกรไทย (KBank)',
  date,
  time,
  sender,
  receiver,
  referenceNo,
  category = 'ขายของหน้าร้าน',
  workspaceName = 'ร้านขายของฝากไร่ธนโชติ',
  userName = 'ณิชา ทองอยู่',
  confidence = 98.5,
  slipUrl,
  txId
}) {
  // Theme color based on Bank
  let bankColor = '#00A950'; // KBank Green default
  let bankName = bank;

  if (/scb|ไทยพาณิชย์/i.test(bank)) bankColor = '#4E2E80';
  else if (/krungthai|กรุงไทย/i.test(bank)) bankColor = '#00A4E4';
  else if (/bangkok|กรุงเทพ|bbl/i.test(bank)) bankColor = '#1E3A8A';
  else if (/ttb|ทหารไทย/i.test(bank)) bankColor = '#002D62';
  else if (/gsb|ออมสิน/i.test(bank)) bankColor = '#EB1985';
  else if (/promptpay|พร้อมเพย์/i.test(bank)) bankColor = '#003D79';
  else if (/7-eleven|เซเว่น/i.test(bank)) bankColor = '#007A3E';

  const isIncome = type === 'income';

  return {
    type: 'flex',
    altText: `สแกนสลิปสำเร็จ: ${isIncome ? '+' : '-'}฿${parseFloat(amount).toLocaleString()} (${category})`,
    contents: {
      type: 'bubble',
      size: 'giga',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: bankColor,
        paddingAll: '18px',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: '📷 สแกนสลิปสำเร็จ (OCR Auto-Detected)',
                color: '#FFFFFF',
                size: 'xs',
                weight: 'bold',
                flex: 8
              },
              {
                type: 'text',
                text: `${confidence}% AI`,
                color: '#FFFFFF',
                size: 'xxs',
                align: 'end',
                weight: 'bold',
                flex: 3
              }
            ]
          },
          {
            type: 'text',
            text: bankName,
            color: '#FFFFFF',
            size: 'sm',
            weight: 'bold',
            margin: 'sm'
          },
          {
            type: 'box',
            layout: 'baseline',
            margin: 'md',
            contents: [
              {
                type: 'text',
                text: isIncome ? '+฿' : '-฿',
                size: 'xl',
                color: '#FFFFFF',
                weight: 'bold',
                flex: 0
              },
              {
                type: 'text',
                text: parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2 }),
                size: 'xxl',
                color: '#FFFFFF',
                weight: 'bold',
                margin: 'xs'
              },
              {
                type: 'text',
                text: isIncome ? 'รายรับ' : 'รายจ่าย',
                size: 'xs',
                color: '#FFFFFF',
                align: 'end',
                weight: 'bold'
              }
            ]
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '18px',
        spacing: 'md',
        contents: [
          // Section 1: Extracted Slip Info Table
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: 'หมวดหมู่', size: 'xs', color: '#8C8C8C', flex: 3 },
                  { type: 'text', text: category, size: 'xs', color: '#111827', weight: 'bold', flex: 6 }
                ]
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: 'วันที่ / เวลา', size: 'xs', color: '#8C8C8C', flex: 3 },
                  { type: 'text', text: `${date} ${time || ''}`, size: 'xs', color: '#111827', flex: 6 }
                ]
              },
              sender ? {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: 'ผู้โอน (จาก)', size: 'xs', color: '#8C8C8C', flex: 3 },
                  { type: 'text', text: sender, size: 'xs', color: '#111827', flex: 6, wrap: true }
                ]
              } : null,
              receiver ? {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: 'ผู้รับ (ถึง)', size: 'xs', color: '#8C8C8C', flex: 3 },
                  { type: 'text', text: receiver, size: 'xs', color: '#111827', weight: 'bold', flex: 6, wrap: true }
                ]
              } : null,
              referenceNo ? {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: 'รหัสอ้างอิง', size: 'xs', color: '#8C8C8C', flex: 3 },
                  { type: 'text', text: referenceNo, size: 'xxs', color: '#6B7280', flex: 6, wrap: true }
                ]
              } : null,
              {
                type: 'separator',
                margin: 'sm'
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: 'พื้นที่การเงิน', size: 'xs', color: '#8C8C8C', flex: 3 },
                  { type: 'text', text: workspaceName, size: 'xs', color: '#D97706', weight: 'bold', flex: 6 }
                ]
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: 'บันทึกโดย', size: 'xs', color: '#8C8C8C', flex: 3 },
                  { type: 'text', text: userName, size: 'xs', color: '#111827', flex: 6 }
                ]
              }
            ].filter(Boolean)
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        paddingAll: '16px',
        backgroundColor: '#FFFDF0',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#F59E0B',
            height: 'sm',
            action: {
              type: 'uri',
              label: '📊 ดูสรุปการเงินบน LIFF (ป้านวล)',
              uri: (process.env.PUBLIC_APP_URL && process.env.PUBLIC_APP_URL.startsWith('https://'))
                ? process.env.PUBLIC_APP_URL
                : 'https://thanachote-expense-ocr.loca.lt/'
            }
          },
          {
            type: 'button',
            style: 'secondary',
            height: 'sm',
            action: {
              type: 'uri',
              label: '🔍 ตรวจสอบ / แก้ไขรายการนี้',
              uri: (process.env.PUBLIC_APP_URL && process.env.PUBLIC_APP_URL.startsWith('https://'))
                ? `${process.env.PUBLIC_APP_URL}/?tab=transactions`
                : 'https://thanachote-expense-ocr.loca.lt/?tab=transactions'
            }
          }
        ]
      }
    }
  };
}
