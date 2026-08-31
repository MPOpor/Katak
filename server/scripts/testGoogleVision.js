async function testGoogleVision() {
  const res = await fetch('http://localhost:5000/api/ocr/google-vision', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sampleId: 'sample-kbank-1'
    })
  }).then(r => r.json());

  console.log('--- TEST GOOGLE VISION OCR ENDPOINT ---');
  console.log('Success:', res.success);
  console.log('Engine:', res.engine);
  console.log('Extracted Data:', res.data);
}

testGoogleVision().catch(console.error);
