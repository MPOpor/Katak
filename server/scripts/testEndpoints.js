async function test() {
  const baseUrl = 'http://localhost:5000/api';

  console.log('--- Testing API Endpoints ---');

  // 1. Health
  const healthRes = await fetch(`${baseUrl}/health`).then(r => r.json());
  console.log('1. /api/health:', healthRes.status === 'online' ? '✅ PASS' : '❌ FAIL');

  // 2. Workspaces
  const wsRes = await fetch(`${baseUrl}/workspaces`).then(r => r.json());
  console.log('2. /api/workspaces:', wsRes.success && wsRes.data.length >= 3 ? '✅ PASS (Found ' + wsRes.data.length + ' workspaces)' : '❌ FAIL');

  // 3. Analytics Overview
  const ovRes = await fetch(`${baseUrl}/analytics/overview?workspace_id=ws_thanachote&period=month`).then(r => r.json());
  console.log('3. /api/analytics/overview:', ovRes.success && ovRes.data.totalIncome > 0 ? `✅ PASS (Income: ฿${ovRes.data.totalIncome}, Expense: ฿${ovRes.data.totalExpense})` : '❌ FAIL');

  // 4. Analytics Trend
  const trRes = await fetch(`${baseUrl}/analytics/trend?workspace_id=ws_thanachote&period=month`).then(r => r.json());
  console.log('4. /api/analytics/trend:', trRes.success && trRes.data.length > 0 ? `✅ PASS (${trRes.data.length} trend points)` : '❌ FAIL');

  // 5. Category Breakdown
  const catBreakRes = await fetch(`${baseUrl}/analytics/category-breakdown?workspace_id=ws_thanachote&period=month&type=expense`).then(r => r.json());
  console.log('5. /api/analytics/category-breakdown:', catBreakRes.success && catBreakRes.data.length > 0 ? `✅ PASS (${catBreakRes.data.length} categories)` : '❌ FAIL');

  // 6. Word Cloud
  const wcRes = await fetch(`${baseUrl}/analytics/wordcloud?workspace_id=ws_thanachote&period=month`).then(r => r.json());
  console.log('6. /api/analytics/wordcloud:', wcRes.success && wcRes.data.length > 0 ? `✅ PASS (${wcRes.data.length} words)` : '❌ FAIL');

  // 7. OCR Parse Sample
  const ocrRes = await fetch(`${baseUrl}/ocr/parse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sampleId: 'sample-kbank-1' })
  }).then(r => r.json());
  console.log('7. /api/ocr/parse (Sample KBank):', ocrRes.success && ocrRes.data.amount === 1500 ? `✅ PASS (Amount: ฿${ocrRes.data.amount}, Receiver: ${ocrRes.data.receiver})` : '❌ FAIL');

  // 8. Thai Voice Parse
  const voiceRes = await fetch(`${baseUrl}/voice/parse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript: 'ขายของฝากหน้าร้านได้ 2500 บาท' })
  }).then(r => r.json());
  console.log('8. /api/voice/parse:', voiceRes.success && voiceRes.data.amount === 2500 && voiceRes.data.type === 'income' ? `✅ PASS (Intent: ${voiceRes.data.type}, Amount: ฿${voiceRes.data.amount}, Cat: ${voiceRes.data.category})` : '❌ FAIL');

  // 9. Admin Stats
  const adminRes = await fetch(`${baseUrl}/admin/stats`).then(r => r.json());
  console.log('9. /api/admin/stats:', adminRes.success && adminRes.data.totalWorkspaces >= 3 ? `✅ PASS (Users: ${adminRes.data.totalUsers}, Transactions: ${adminRes.data.totalTransactions})` : '❌ FAIL');

  console.log('--- All API Tests Completed Successfully ---');
}

test().catch(console.error);
