async function testSlipMessage() {
  const res = await fetch('http://localhost:5000/api/line/process-slip-message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sampleId: 'sample-kbank-1',
      workspaceId: 'ws_thanachote'
    })
  }).then(r => r.json());

  console.log('--- TEST LINE SLIP MESSAGE & FLEX CARD ---');
  console.log('Success:', res.success);
  console.log('Extracted OCR:', res.data.ocrResult);
  console.log('Generated Flex Message AltText:', res.data.flexMessage.altText);
  console.log('Flex Header:', JSON.stringify(res.data.flexMessage.contents.header, null, 2));
}

testSlipMessage().catch(console.error);
