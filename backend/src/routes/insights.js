import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createUserClient } from '../utils/supabase.js';

const router = Router();

router.use(requireAuth);

// Get insights (generated from expense data)
router.get('/', async (req, res) => {
  try {
    const supabase = createUserClient(req.supabaseToken);
    const { limit = 10 } = req.query;

    // Fetch stored insights first
    const { data: stored, error: storedError } = await supabase
      .from('insights')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit, 10));

    if (storedError) throw storedError;

    // Fetch recent expenses for dynamic insights
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const { data: expenses, error: expError } = await supabase
      .from('expenses')
      .select('amount, date, category_id, recurring')
      .gte('date', threeMonthsAgo.toISOString().slice(0, 10));

    if (expError) throw expError;

    const dynamicInsights = generateInsights(expenses || []);

    // Combine stored and dynamic (prefer dynamic for freshness)
    const combined = [...dynamicInsights];
    const storedIds = new Set(combined.map((i) => i.id));
    for (const s of stored || []) {
      if (!storedIds.has(s.id)) combined.push(s);
    }

    res.json(combined.slice(0, parseInt(limit, 10)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Generate data-driven insights from expense history.
 * Non-judgmental, professional tone.
 */
function generateInsights(expenses) {
  const insights = [];
  if (!expenses.length) {
    insights.push({
      id: 'no-data',
      type: 'summary',
      title: 'No spending data yet',
      description: 'Add expenses to start receiving personalized insights and trends.',
      data: {},
      created_at: new Date().toISOString()
    });
    return insights;
  }

  const total = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
  const avgPerMonth = total / 3;

  insights.push({
    id: 'avg-monthly',
    type: 'summary',
    title: 'Average monthly spend',
    description: `Over the last 3 months, your average monthly expenditure is ${formatCurrency(avgPerMonth)}.`,
    data: { value: avgPerMonth, period: '3 months' },
    created_at: new Date().toISOString()
  });

  // Weekday vs weekend
  const weekdayTotal = expenses
    .filter((e) => {
      const d = new Date(e.date);
      const day = d.getDay();
      return day >= 1 && day <= 5;
    })
    .reduce((s, e) => s + parseFloat(e.amount), 0);
  const weekendTotal = total - weekdayTotal;

  if (weekendTotal > 0 && weekdayTotal > 0) {
    const weekendPct = ((weekendTotal / total) * 100).toFixed(1);
    insights.push({
      id: 'weekend-trend',
      type: 'trend',
      title: 'Weekend vs weekday spending',
      description: `${weekendPct}% of your spending occurs on weekends. Understanding this pattern can help with budget allocation.`,
      data: { weekend: weekendTotal, weekday: weekdayTotal, weekend_pct: parseFloat(weekendPct) },
      created_at: new Date().toISOString()
    });
  }

  // Recurring costs
  const recurring = expenses.filter((e) => e.recurring);
  const recurringTotal = recurring.reduce((s, e) => s + parseFloat(e.amount), 0);

  if (recurringTotal > 0) {
    const pct = ((recurringTotal / total) * 100).toFixed(1);
    insights.push({
      id: 'recurring',
      type: 'trend',
      title: 'Recurring expenses',
      description: `Recurring expenses account for ${pct}% of your spending (${formatCurrency(recurringTotal)} over 3 months). These are predictable and easier to plan for.`,
      data: { recurring_total: recurringTotal, pct: parseFloat(pct) },
      created_at: new Date().toISOString()
    });
  }

  return insights;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

export default router;
