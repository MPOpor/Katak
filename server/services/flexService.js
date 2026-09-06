/**
 * Ultra-Premium LINE Flex Message Builder for Smart Expense OCR System
 * Matches the layout and rich capabilities of the master project,
 * customized with the soft pastel yellow/amber aesthetic of Katak.
 */

/**
 * Formats amount with thousand separators and 2 decimals
 */
function formatMoney(amount) {
  try {
    const num = parseFloat(String(amount).replace(/,/g, ''));
    if (isNaN(num)) return amount;
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } catch (e) {
    return amount;
  }
}

/**
 * Returns Bank Theme Color & Icon
 */
function getBankTheme(bankName = '') {
  const b = String(bankName).toLowerCase();
  if (b.includes('kbank') || b.includes('กสิกร')) return { color: '#00A950', name: 'ธนาคารกสิกรไทย (KBank)', bgLight: '#E8F5E9', accent: '#00843D' };
  if (b.includes('scb') || b.includes('ไทยพาณิชย์')) return { color: '#4E2E80', name: 'ธนาคารไทยพาณิชย์ (SCB)', bgLight: '#F3E5F5', accent: '#37186A' };
  if (b.includes('krungthai') || b.includes('กรุงไทย') || b.includes('ktb')) return { color: '#00A4E4', name: 'ธนาคารกรุงไทย (Krungthai)', bgLight: '#E1F5FE', accent: '#007BB0' };
  if (b.includes('bangkok') || b.includes('กรุงเทพ') || b.includes('bbl')) return { color: '#1E3A8A', name: 'ธนาคารกรุงเทพ (BBL)', bgLight: '#E8EAF6', accent: '#152C6D' };
  if (b.includes('ttb') || b.includes('ทหารไทย') || b.includes('ธนชาต')) return { color: '#002D62', name: 'ธนาคารทหารไทยธนชาต (TTB)', bgLight: '#E0F2FE', accent: '#001A3D' };
  if (b.includes('gsb') || b.includes('ออมสิน')) return { color: '#EB1985', name: 'ธนาคารออมสิน (GSB)', bgLight: '#FCE4EC', accent: '#C2185B' };
  if (b.includes('promptpay') || b.includes('พร้อมเพย์')) return { color: '#003D79', name: 'พร้อมเพย์ (PromptPay)', bgLight: '#E3F2FD', accent: '#002952' };
  if (b.includes('7-eleven') || b.includes('เซเว่น')) return { color: '#007A3E', name: 'ใบเสร็จ 7-Eleven', bgLight: '#E8F5E9', accent: '#005C2E' };
  if (b.includes('lotus') || b.includes('โลตัส')) return { color: '#00953B', name: 'ใบเสร็จ Lotus', bgLight: '#E8F8F0', accent: '#006E2B' };
  return { color: '#D97706', name: bankName || 'สลิปโอนเงิน / ใบเสร็จ', bgLight: '#FEF3C7', accent: '#B45309' };
}

/**
 * Standard Quick Reply items for LINE Bot
 */
export function getStandardQuickReplies(sheetUrl = null, driveUrl = null) {
  const items = [
    {
      type: 'action',
      action: {
        type: 'message',
        label: '📷 ส่งสลิปเพิ่ม',
        text: 'ส่งภาพสลิปมาได้เลย ระบบจะบันทึกและสแกนให้อัตโนมัติค่ะ'
      }
    },
    {
      type: 'action',
      action: {
        type: 'message',
        label: '📊 สรุปยอดวันนี้',
        text: 'สรุปยอดวันนี้'
      }
    },
    {
      type: 'action',
      action: {
        type: 'message',
        label: '💰 สรุปรายจ่าย',
        text: 'สรุปรายจ่าย'
      }
    }
  ];

  if (sheetUrl) {
    items.push({
      type: 'action',
      action: {
        type: 'uri',
        label: '📊 Google Sheet',
        uri: sheetUrl
      }
    });
  }

  if (driveUrl) {
    items.push({
      type: 'action',
      action: {
        type: 'uri',
        label: '☁️ Google Drive',
        uri: driveUrl
      }
    });
  }

  return { items };
}

/**
 * 1. Build OCR / Slip Result Flex Message Card
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
  confidence = 99.2,
  slipUrl,
  driveUrl,
  sheetUrl,
  txId,
  isDuplicate = false,
  warningMessage = null
}) {
  const isIncome = type === 'income';
  const theme = getBankTheme(bank);
  const formattedAmount = formatMoney(amount);
  const appUrl = (process.env.PUBLIC_APP_URL && process.env.PUBLIC_APP_URL.startsWith('https://'))
    ? process.env.PUBLIC_APP_URL
    : 'https://thanachote-expense-ocr.loca.lt';

  const defaultSheetUrl = sheetUrl || (process.env.SPREADSHEET_ID ? `https://docs.google.com/spreadsheets/d/${process.env.SPREADSHEET_ID}/edit` : null);
  const defaultDriveUrl = driveUrl || (process.env.GOOGLE_DRIVE_PARENT_ID ? `https://drive.google.com/drive/folders/${process.env.GOOGLE_DRIVE_PARENT_ID}` : null);

  const bubble = {
    type: 'bubble',
    size: 'giga',
    header: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: theme.color,
      paddingAll: '18px',
      contents: [
        // Top status row
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              backgroundColor: '#FFFFFF22',
              cornerRadius: '12px',
              paddingStart: '8px',
              paddingEnd: '8px',
              paddingTop: '3px',
              paddingBottom: '3px',
              contents: [
                {
                  type: 'text',
                  text: '✓ บันทึกสำเร็จ',
                  color: '#FFFFFF',
                  size: 'xxs',
                  weight: 'bold'
                }
              ]
            },
            {
              type: 'text',
              text: `AI แม่นยำ ${confidence}%`,
              color: '#FFFFFFCC',
              size: 'xxs',
              align: 'end',
              weight: 'bold',
              gravity: 'center'
            }
          ]
        },
        // Bank Name Title
        {
          type: 'text',
          text: theme.name,
          color: '#FFFFFF',
          size: 'sm',
          weight: 'bold',
          margin: 'md'
        },
        // Big Amount Display
        {
          type: 'box',
          layout: 'baseline',
          margin: 'sm',
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
              text: formattedAmount,
              size: 'xxl',
              color: '#FFFFFF',
              weight: 'bold',
              margin: 'xs'
            },
            {
              type: 'text',
              text: isIncome ? 'รายรับ' : 'รายจ่าย',
              size: 'xs',
              color: '#FFFFFFEE',
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
      backgroundColor: '#FFFFFF',
      contents: [
        // Warning banner if present
        warningMessage ? {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#FEF2F2',
          borderColor: '#FECACA',
          borderWidth: '1px',
          cornerRadius: '8px',
          paddingAll: '10px',
          contents: [
            {
              type: 'text',
              text: `⚠️ ${warningMessage}`,
              color: '#DC2626',
              size: 'xs',
              weight: 'bold',
              wrap: true
            }
          ]
        } : null,

        // Extracted Key-Value Table
        {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: 'หมวดหมู่', size: 'xs', color: '#6B7280', flex: 3 },
                { type: 'text', text: category, size: 'xs', color: '#111827', weight: 'bold', flex: 6 }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: 'วันที่ / เวลา', size: 'xs', color: '#6B7280', flex: 3 },
                { type: 'text', text: `${date || '-'} ${time || ''}`, size: 'xs', color: '#111827', flex: 6 }
              ]
            },
            sender ? {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: 'ผู้โอน (จาก)', size: 'xs', color: '#6B7280', flex: 3 },
                { type: 'text', text: sender, size: 'xs', color: '#111827', flex: 6, wrap: true }
              ]
            } : null,
            receiver ? {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: 'ผู้รับ (ถึง)', size: 'xs', color: '#6B7280', flex: 3 },
                { type: 'text', text: receiver, size: 'xs', color: '#111827', weight: 'bold', flex: 6, wrap: true }
              ]
            } : null,
            referenceNo ? {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: 'รหัสอ้างอิง', size: 'xs', color: '#6B7280', flex: 3 },
                { type: 'text', text: referenceNo, size: 'xxs', color: '#4B5563', flex: 6, wrap: true }
              ]
            } : null,
            {
              type: 'separator',
              margin: 'sm',
              color: '#F3F4F6'
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: 'พื้นที่การเงิน', size: 'xs', color: '#6B7280', flex: 3 },
                { type: 'text', text: workspaceName, size: 'xs', color: '#D97706', weight: 'bold', flex: 6 }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: 'ผู้บันทึก', size: 'xs', color: '#6B7280', flex: 3 },
                { type: 'text', text: userName, size: 'xs', color: '#111827', flex: 6 }
              ]
            }
          ].filter(Boolean)
        },

        // Cloud Backup Badges
        {
          type: 'box',
          layout: 'horizontal',
          spacing: 'sm',
          margin: 'sm',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              backgroundColor: '#ECFDF5',
              cornerRadius: '8px',
              paddingStart: '8px',
              paddingEnd: '8px',
              paddingTop: '4px',
              paddingBottom: '4px',
              contents: [
                { type: 'text', text: '☁️ Google Drive สำรองแล้ว', size: 'xxs', color: '#059669', weight: 'bold' }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              backgroundColor: '#EFF6FF',
              cornerRadius: '8px',
              paddingStart: '8px',
              paddingEnd: '8px',
              paddingTop: '4px',
              paddingBottom: '4px',
              contents: [
                { type: 'text', text: '📊 Google Sheets อัปเดตแล้ว', size: 'xxs', color: '#2563EB', weight: 'bold' }
              ]
            }
          ]
        }
      ].filter(Boolean)
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      paddingAll: '16px',
      backgroundColor: '#FEFDF5',
      contents: [
        // Primary Action: Open LIFF App
        {
          type: 'button',
          style: 'primary',
          color: '#F59E0B',
          height: 'sm',
          action: {
            type: 'uri',
            label: '📊 เปิดดูรายงานบนเว็บ (Katak)',
            uri: appUrl
          }
        },
        // Secondary Action: View Slip / Drive / Sheet
        driveUrl ? {
          type: 'button',
          style: 'secondary',
          height: 'sm',
          action: {
            type: 'uri',
            label: '☁️ ดูภาพสลิปบน Google Drive',
            uri: driveUrl
          }
        } : (slipUrl ? {
          type: 'button',
          style: 'secondary',
          height: 'sm',
          action: {
            type: 'uri',
            label: '📷 ดูภาพสลิปต้นฉบับ',
            uri: slipUrl.startsWith('http') ? slipUrl : `${appUrl}${slipUrl}`
          }
        } : null)
      ].filter(Boolean)
    }
  };

  return {
    type: 'flex',
    altText: `สแกนสลิปสำเร็จ: ${isIncome ? '+' : '-'}฿${formattedAmount} (${category})`,
    contents: bubble,
    quickReply: getStandardQuickReplies(defaultSheetUrl, defaultDriveUrl)
  };
}

/**
 * 2. Build Duplicate Slip Warning Flex Message
 */
export function buildDuplicateWarningFlexMessage({
  bank,
  amount,
  date,
  time,
  referenceNo,
  existingDate,
  existingAmount,
  workspaceName = 'ร้านขายของฝากไร่ธนโชติ'
}) {
  const appUrl = (process.env.PUBLIC_APP_URL && process.env.PUBLIC_APP_URL.startsWith('https://'))
    ? process.env.PUBLIC_APP_URL
    : 'https://thanachote-expense-ocr.loca.lt';

  const defaultSheetUrl = process.env.SPREADSHEET_ID ? `https://docs.google.com/spreadsheets/d/${process.env.SPREADSHEET_ID}/edit` : null;
  const defaultDriveUrl = process.env.GOOGLE_DRIVE_PARENT_ID ? `https://drive.google.com/drive/folders/${process.env.GOOGLE_DRIVE_PARENT_ID}` : null;

  return {
    type: 'flex',
    altText: `⚠️ ตรวจพบสลิปนี้ถูกบันทึกไปแล้ว (฿${formatMoney(amount)} บาท)`,
    contents: {
      type: 'bubble',
      size: 'giga',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#DC2626',
        paddingAll: '18px',
        contents: [
          {
            type: 'text',
            text: '⚠️ ตรวจพบสลิปซ้ำซ้อน (Duplicate Slip)',
            color: '#FFFFFF',
            size: 'sm',
            weight: 'bold'
          },
          {
            type: 'text',
            text: 'ระบบข้ามการบันทึกซ้ำให้อัตโนมัติ เพื่อป้องกันยอดเงินคลาดเคลื่อน',
            color: '#FFFFFFDD',
            size: 'xs',
            margin: 'xs',
            wrap: true
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '18px',
        spacing: 'md',
        contents: [
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'xs',
            contents: [
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: 'ธนาคาร', size: 'xs', color: '#6B7280', flex: 3 },
                  { type: 'text', text: bank || 'สลิปโอนเงิน', size: 'xs', color: '#111827', weight: 'bold', flex: 6 }
                ]
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: 'ยอดเงิน', size: 'xs', color: '#6B7280', flex: 3 },
                  { type: 'text', text: `฿${formatMoney(amount || existingAmount)} บาท`, size: 'xs', color: '#DC2626', weight: 'bold', flex: 6 }
                ]
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: 'วันเวลาบนสลิป', size: 'xs', color: '#6B7280', flex: 3 },
                  { type: 'text', text: `${date || existingDate} ${time || ''}`, size: 'xs', color: '#111827', flex: 6 }
                ]
              },
              referenceNo ? {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: 'รหัสอ้างอิง', size: 'xs', color: '#6B7280', flex: 3 },
                  { type: 'text', text: referenceNo, size: 'xxs', color: '#4B5563', flex: 6, wrap: true }
                ]
              } : null
            ].filter(Boolean)
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '16px',
        backgroundColor: '#FEFDF5',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#F59E0B',
            height: 'sm',
            action: {
              type: 'uri',
              label: '📊 ตรวจสอบรายการในระบบ',
              uri: `${appUrl}/?tab=transactions`
            }
          }
        ]
      }
    },
    quickReply: getStandardQuickReplies(defaultSheetUrl, defaultDriveUrl)
  };
}
