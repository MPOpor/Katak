const res = await fetch('http://localhost:5000/api/voice/parse', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ transcript: 'ขายของฝากหน้าร้านได้ 2500 บาท' })
}).then(r => r.json());

console.log('Voice result:', res);
