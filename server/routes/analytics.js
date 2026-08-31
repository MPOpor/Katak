import express from 'express';
import db from '../db/database.js';

const router = express.Router();

function getDateRangeFilter(period, customStart, customEnd) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  if (period === 'today') {
    return { start: todayStr, end: todayStr };
  } else if (period === 'week') {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(now.getDate() - 7);
    return { start: oneWeekAgo.toISOString().split('T')[0], end: todayStr };
  } else if (period === 'month') {
    const firstDay = `${year}-${month}-01`;
    const lastDay = new Date(year, now.getMonth() + 1, 0).toISOString().split('T')[0];
    return { start: firstDay, end: lastDay };
  } else if (period === 'year') {
    return { start: `${year}-01-01`, end: `${year}-12-31` };
  } else if (period === 'custom' && customStart && customEnd) {
    return { start: customStart, end: customEnd };
  }
  return null;
}

// 1. Overview Summary Cards
router.get('/overview', (req, res) => {
  try {
    const { workspace_id, period = 'month', startDate, endDate } = req.query;
    if (!workspace_id) {
      return res.status(400).json({ success: false, error: 'workspace_id is required' });
    }

    const ws = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(workspace_id);
    if (!ws) {
      return res.status(404).json({ success: false, error: 'Workspace not found' });
    }

    let query = 'SELECT type, SUM(amount) as total, COUNT(*) as count FROM transactions WHERE workspace_id = ?';
    const params = [workspace_id];

    const dateRange = getDateRangeFilter(period, startDate, endDate);
    if (dateRange) {
      query += ' AND transaction_date >= ? AND transaction_date <= ?';
      params.push(dateRange.start, dateRange.end);
    }
    query += ' GROUP BY type';

    const results = db.prepare(query).all(...params);
    let totalIncome = 0;
    let totalExpense = 0;
    let incomeCount = 0;
    let expenseCount = 0;

    for (const row of results) {
      if (row.type === 'income') {
        totalIncome = row.total || 0;
        incomeCount = row.count;
      } else if (row.type === 'expense') {
        totalExpense = row.total || 0;
        expenseCount = row.count;
      }
    }

    const netBalance = totalIncome - totalExpense;
    const budgetLimit = ws.budget_limit || 0;
    const budgetUsedPercent = budgetLimit > 0 ? (totalExpense / budgetLimit) * 100 : 0;
    const budgetRemaining = budgetLimit > 0 ? budgetLimit - totalExpense : 0;

    // Determine budget status
    let budgetStatus = 'normal';
    if (budgetLimit > 0) {
      if (budgetUsedPercent >= 100) budgetStatus = 'exceeded';
      else if (budgetUsedPercent >= 80) budgetStatus = 'warning';
    }

    res.json({
      success: true,
      data: {
        workspaceName: ws.name,
        workspaceType: ws.type,
        period,
        totalIncome,
        totalExpense,
        netBalance,
        incomeCount,
        expenseCount,
        totalCount: incomeCount + expenseCount,
        budgetLimit,
        budgetUsedPercent: Math.round(budgetUsedPercent * 10) / 10,
        budgetRemaining,
        budgetStatus
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Trend Chart (Grouped by Date)
router.get('/trend', (req, res) => {
  try {
    const { workspace_id, period = 'month', startDate, endDate } = req.query;
    if (!workspace_id) {
      return res.status(400).json({ success: false, error: 'workspace_id is required' });
    }

    let query = `
      SELECT transaction_date, type, SUM(amount) as total
      FROM transactions
      WHERE workspace_id = ?
    `;
    const params = [workspace_id];

    const dateRange = getDateRangeFilter(period, startDate, endDate);
    if (dateRange) {
      query += ' AND transaction_date >= ? AND transaction_date <= ?';
      params.push(dateRange.start, dateRange.end);
    }
    query += ' GROUP BY transaction_date, type ORDER BY transaction_date ASC';

    const rows = db.prepare(query).all(...params);

    // Format into chart labels & datasets
    const dateMap = {};
    for (const r of rows) {
      if (!dateMap[r.transaction_date]) {
        dateMap[r.transaction_date] = { date: r.transaction_date, income: 0, expense: 0 };
      }
      if (r.type === 'income') dateMap[r.transaction_date].income = r.total;
      else if (r.type === 'expense') dateMap[r.transaction_date].expense = r.total;
    }

    const trendData = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));

    res.json({ success: true, data: trendData });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Category Breakdown (Donut / Pie Chart)
router.get('/category-breakdown', (req, res) => {
  try {
    const { workspace_id, period = 'month', type = 'expense', startDate, endDate } = req.query;
    if (!workspace_id) {
      return res.status(400).json({ success: false, error: 'workspace_id is required' });
    }

    let query = `
      SELECT c.id as category_id, c.name, c.color, c.icon, SUM(t.amount) as total, COUNT(t.id) as count
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.workspace_id = ? AND t.type = ?
    `;
    const params = [workspace_id, type];

    const dateRange = getDateRangeFilter(period, startDate, endDate);
    if (dateRange) {
      query += ' AND t.transaction_date >= ? AND t.transaction_date <= ?';
      params.push(dateRange.start, dateRange.end);
    }
    query += ' GROUP BY c.id, c.name, c.color, c.icon ORDER BY total DESC';

    const rows = db.prepare(query).all(...params);
    const overallSum = rows.reduce((acc, cur) => acc + cur.total, 0);

    const breakdown = rows.map(r => ({
      ...r,
      percentage: overallSum > 0 ? Math.round((r.total / overallSum) * 1000) / 10 : 0
    }));

    res.json({ success: true, data: breakdown, totalSum: overallSum });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Word Cloud Data (Frequency of high-usage keywords/tags)
router.get('/wordcloud', (req, res) => {
  try {
    const { workspace_id, period = 'month', startDate, endDate } = req.query;
    if (!workspace_id) {
      return res.status(400).json({ success: false, error: 'workspace_id is required' });
    }

    let query = `
      SELECT t.note, c.name as category_name, t.amount, t.type
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.workspace_id = ?
    `;
    const params = [workspace_id];

    const dateRange = getDateRangeFilter(period, startDate, endDate);
    if (dateRange) {
      query += ' AND t.transaction_date >= ? AND t.transaction_date <= ?';
      params.push(dateRange.start, dateRange.end);
    }

    const rows = db.prepare(query).all(...params);

    // Build word frequency map
    const wordFreq = {};
    const stopWords = new Set(['และ', 'ใน', 'ของ', 'ที่', 'ไป', 'ได้', 'ทำ', 'กับ', 'ให้', 'มี', 'เปรียบ']);

    for (const r of rows) {
      // Add category name
      if (r.category_name) {
        wordFreq[r.category_name] = (wordFreq[r.category_name] || 0) + 3;
      }
      // Tokenize note
      if (r.note) {
        const words = r.note.split(/[\s,./\n-]+/).filter(w => w.length > 2 && !stopWords.has(w));
        for (const w of words) {
          wordFreq[w] = (wordFreq[w] || 0) + 1;
        }
      }
    }

    // Convert to word cloud objects with sizes and colors
    const colors = ['#ED2E92', '#F59E0B', '#10B981', '#6366F1', '#3B82F6', '#EC4899', '#8B5CF6', '#14B8A6'];
    const wordCloud = Object.entries(wordFreq)
      .map(([text, value], idx) => ({
        text,
        value,
        color: colors[idx % colors.length]
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 25);

    res.json({ success: true, data: wordCloud });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
