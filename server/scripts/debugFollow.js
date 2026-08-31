const url = 'http://localhost:5000/api/line/webhook';

async function debug() {
  const followPayload = {
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

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(followPayload)
  }).then(r => r.json());

  console.log('Follow response:', res);
}

debug();
