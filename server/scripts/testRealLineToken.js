import dotenv from 'dotenv';
dotenv.config();

async function testLineBotInfo() {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  console.log('Testing LINE Channel Access Token...');

  try {
    const res = await fetch('https://api.line.me/v2/bot/info', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await res.json();
    if (res.ok) {
      console.log('✅ LINE BOT CONNECTED SUCCESSFULLY!');
      console.log('Bot Name:', data.displayName);
      console.log('Bot User ID:', data.userId);
      console.log('Basic ID:', data.basicId);
      console.log('Premium / Verified ID:', data.premiumId || 'Standard');
      console.log('Picture URL:', data.pictureUrl);
    } else {
      console.log('❌ LINE API Error:', data);
    }
  } catch (err) {
    console.error('Error connecting to LINE API:', err.message);
  }
}

testLineBotInfo();
