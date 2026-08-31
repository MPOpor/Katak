async function testLineWebhook() {
  const url = 'http://localhost:5000/api/line/webhook';

  console.log('--- TESTING REAL LINE WEBHOOK RECEIVER ---');

  // Test 1: Image Message Event (Slip sent to bot)
  const imageEventPayload = {
    destination: 'U1234567890',
    events: [
      {
        type: 'message',
        message: {
          type: 'image',
          id: 'mock_msg_img_001'
        },
        timestamp: Date.now(),
        source: {
          type: 'user',
          userId: 'U111122223333nicha'
        },
        replyToken: 'mock_reply_token_img_001',
        mode: 'active'
      }
    ]
  };

  const res1 = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(imageEventPayload)
  }).then(r => r.json());
  console.log('1. Webhook Image Slip Event:', res1.success ? '✅ PASS' : '❌ FAIL');

  // Test 1.2: File Document Event (PDF / Document slip sent to bot)
  const fileEventPayload = {
    destination: 'U1234567890',
    events: [
      {
        type: 'message',
        message: {
          type: 'file',
          id: 'mock_msg_file_002',
          fileName: 'slip_transfer_kbank.pdf',
          fileSize: 204800
        },
        timestamp: Date.now(),
        source: {
          type: 'user',
          userId: 'U111122223333nicha'
        },
        replyToken: 'mock_reply_token_file_002',
        mode: 'active'
      }
    ]
  };

  const res1_2 = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fileEventPayload)
  }).then(r => r.json());
  console.log('1.2 Webhook File Document Slip Event:', res1_2.success ? '✅ PASS' : '❌ FAIL');

  // Test 2: Text Message Event ("สรุปยอด")
  const textSummaryPayload = {
    destination: 'U1234567890',
    events: [
      {
        type: 'message',
        message: {
          type: 'text',
          id: 'mock_msg_txt_001',
          text: 'สรุปยอดวันนี้'
        },
        timestamp: Date.now(),
        source: {
          type: 'user',
          userId: 'U111122223333nicha'
        },
        replyToken: 'mock_reply_token_txt_001',
        mode: 'active'
      }
    ]
  };

  const res2 = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(textSummaryPayload)
  }).then(r => r.json());
  console.log('2. Webhook Text "สรุปยอด" Event:', res2.success ? '✅ PASS' : '❌ FAIL');

  // Test 3: Natural Language Income Command ("ขายของฝากหน้าร้านได้ 1800 บาท")
  const textIncomePayload = {
    destination: 'U1234567890',
    events: [
      {
        type: 'message',
        message: {
          type: 'text',
          id: 'mock_msg_txt_002',
          text: 'ขายของฝากหน้าร้านได้ 1800 บาท'
        },
        timestamp: Date.now(),
        source: {
          type: 'user',
          userId: 'U444455556666kanjana'
        },
        replyToken: 'mock_reply_token_txt_002',
        mode: 'active'
      }
    ]
  };

  const res3 = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(textIncomePayload)
  }).then(r => r.json());
  console.log('3. Webhook Text Natural Command Event:', res3.success ? '✅ PASS' : '❌ FAIL');

  // Test 4: Follow Event (New User Added Friend)
  const followPayload = {
    destination: 'U1234567890',
    events: [
      {
        type: 'follow',
        timestamp: Date.now(),
        source: {
          type: 'user',
          userId: 'U999988887777newuser'
        },
        replyToken: 'mock_reply_token_follow_001',
        mode: 'active'
      }
    ]
  };

  const res4 = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(followPayload)
  }).then(r => r.json());
  console.log('4. Webhook Follow / Add Friend Event:', res4.success ? '✅ PASS' : '❌ FAIL');

  console.log('--- ALL LINE WEBHOOK TESTS PASSED ---');
}

testLineWebhook().catch(console.error);
