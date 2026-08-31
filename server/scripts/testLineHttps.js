import https from 'https';
import dotenv from 'dotenv';
dotenv.config();

const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

const options = {
  hostname: 'api.line.me',
  path: '/v2/bot/info',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (d) => { body += d; });
  res.on('end', () => {
    console.log('Status code:', res.statusCode);
    console.log('Response body:', body);
  });
});

req.on('error', (e) => {
  console.error('HTTPS request error:', e);
});

req.end();
