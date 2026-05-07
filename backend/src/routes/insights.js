import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createUserClient } from '../utils/supabase.js';

const router = Router();

router.use(requireAuth);

// Get insights (generated from expense data)
router.get('/', async (req, res) => {
  try {
    const supabase = createUserClient(req.supabaseToken);
    const { limit = 10, level } = req.query;

    // Get user profile for currency and insight level
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('currency, monthly_budget, insight_level')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    const currency = profile?.currency || 'USD';
    const monthlyBudget = Number(profile?.monthly_budget || 0);
    const insightLevel = (profile?.insight_level || 'basic');

    // Insights 2.0 dashboard payload (server-calculated)
    if (level) {
      const requestedLevel = level === 'advanced' ? 'advanced' : 'basic';
      const payload = await buildInsightsV2(supabase, {
        userId: user.id,
        currency,
        monthlyBudget,
        level: requestedLevel,
      });
      return res.json(payload);
    }

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

    const dynamicInsights = generateInsights(expenses || [], {
      currency,
      monthlyBudget,
      insightLevel,
    });

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
 * This will be extended in Insights 2.0 but kept backward compatible for now.
 */
function generateInsights(expenses, { currency, monthlyBudget, insightLevel }) {
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
      description: `Over the last 3 months, your average monthly expenditure is ${formatCurrency(avgPerMonth, currency)}.`,
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
      description: `Recurring expenses account for ${pct}% of your spending (${formatCurrency(recurringTotal, currency)} over 3 months). These are predictable and easier to plan for.`,
      data: { recurring_total: recurringTotal, pct: parseFloat(pct) },
      created_at: new Date().toISOString()
    });
  }

  return insights;
}

function formatCurrency(amount, currency) {
  const value = Number.isFinite(amount) ? Number(amount) : 0;

  const format = (code) =>
    new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

  try {
    return format(currency);
  } catch {
    return format('USD');
  }
}

export default router;

function monthKey(date) {
  return new Date(date).toISOString().slice(0, 7);
}

function firstDayOfMonth(ym) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1);
}

function lastDayOfMonth(ym) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m, 0);
}

function toISODate(d) {
  return d.toISOString().slice(0, 10);
}

function addMonths(ym, delta) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  d.setMonth(d.getMonth() + delta);
  return d.toISOString().slice(0, 7);
}

async function buildInsightsV2(supabase, { userId, currency, monthlyBudget, level }) {
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  const prevMonth = addMonths(currentMonth, -1);
  const startTrendMonth = addMonths(currentMonth, -5);

  // Subscriptions (monthly equivalent) – applies to each month
  const { data: subscriptions, error: subError } = await supabase
    .from('subscriptions')
    .select('amount, billing_cycle')
    .eq('is_active', true);
  if (subError) throw subError;

  let subsMonthly = 0;
  for (const s of subscriptions || []) {
    const amt = Number(s.amount);
    subsMonthly += s.billing_cycle === 'yearly' ? amt / 12 : amt;
  }

  // Expenses across last 6 months for trend + patterns
  const trendStart = firstDayOfMonth(startTrendMonth);
  const trendEnd = lastDayOfMonth(currentMonth);
  const { data: expenses, error: expError } = await supabase
    .from('expenses')
    .select('amount, date, category_id')
    .gte('date', toISODate(trendStart))
    .lte('date', toISODate(trendEnd));
  if (expError) throw expError;

  const trendMonths = Array.from({ length: 6 }, (_, i) => addMonths(startTrendMonth, i));
  const trendTotals = Object.fromEntries(trendMonths.map((m) => [m, 0]));

  for (const e of expenses || []) {
    const m = String(e.date).slice(0, 7);
    if (trendTotals[m] !== undefined) {
      trendTotals[m] += Number(e.amount);
    }
  }

  const trend = trendMonths.map((m) => ({
    month: m,
    total_expenses: round2(trendTotals[m]),
    total: round2(trendTotals[m] + subsMonthly),
  }));

  const currentSpend = (trend.find((t) => t.month === currentMonth)?.total) || round2(subsMonthly);
  const prevSpend = (trend.find((t) => t.month === prevMonth)?.total) || 0;
  const growthPct = prevSpend > 0 ? round2(((currentSpend - prevSpend) / prevSpend) * 100) : null;

  // Category distribution (current month)
  const currentExpenses = (expenses || []).filter((e) => String(e.date).slice(0, 7) === currentMonth);
  const categoryTotals = {};
  for (const e of currentExpenses) {
    const cat = e.category_id || 'uncategorized';
    categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(e.amount);
  }

  const categoryIds = [...new Set(Object.keys(categoryTotals).filter((id) => id !== 'uncategorized'))];
  let categoryNames = {};
  if (categoryIds.length > 0) {
    const { data: cats, error: catsError } = await supabase
      .from('expense_categories')
      .select('id, name')
      .in('id', categoryIds);
    if (catsError) throw catsError;
    categoryNames = Object.fromEntries((cats || []).map((c) => [c.id, c.name || 'Uncategorized']));
  }

  const currentExpenseTotal = currentExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const categories = Object.entries(categoryTotals)
    .map(([id, total]) => {
      const sharePct = currentExpenseTotal > 0 ? (Number(total) / currentExpenseTotal) * 100 : 0;
      return {
        category_id: id,
        category_name: id === 'uncategorized' ? 'Other' : categoryNames[id] || id,
        total: round2(Number(total)),
        share_pct: round2(sharePct),
      };
    })
    .sort((a, b) => b.total - a.total);

  const topCategory = categories.length
    ? {
        category_id: categories[0].category_id,
        category_name: categories[0].category_name,
        total: categories[0].total,
        share_pct: categories[0].share_pct,
      }
    : null;

  // Budget usage
  const budgetUsagePct = monthlyBudget > 0 ? round2((currentSpend / monthlyBudget) * 100) : null;

  // Settlement impact (remaining amounts)
  const { data: settlements, error: setError } = await supabase
    .from('settlements')
    .select(
      `
      id,
      type,
      total_amount,
      due_date,
      settlement_payments ( amount )
    `
    )
    .eq('user_id', userId);
  if (setError) throw setError;

  let toReceive = 0;
  let toPay = 0;
  for (const s of settlements || []) {
    const paid = (s.settlement_payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
    const remaining = Number(s.total_amount) - paid;
    if (remaining <= 0) continue;
    if (s.type === 'gave') toReceive += remaining;
    if (s.type === 'received') toPay += remaining;
  }

  const settlementImpact = {
    total_to_receive: round2(toReceive),
    total_to_pay: round2(toPay),
    net_position: round2(toReceive - toPay),
  };

  const base = {
    level,
    currency,
    current_month: currentMonth,
    previous_month: prevMonth,
    current_spend: round2(currentSpend),
    previous_spend: round2(prevSpend),
    growth_pct: growthPct,
    budget: {
      monthly_budget: round2(monthlyBudget),
      usage_pct: budgetUsagePct,
    },
    trend,
    categories,
    top_category: topCategory,
    settlement_impact: settlementImpact,
  };

  if (level !== 'advanced') {
    // Basic mode: totals + one chart (trend)
    return {
      ...base,
      categories: [],
      top_category: null,
      behavioral: [],
    };
  }

  // Behavioral statements (rule-based, advanced only)
  const behavioral = [];

  if (growthPct !== null) {
    behavioral.push({
      id: 'growth',
      title: growthPct > 0 ? 'Spending increased' : growthPct < 0 ? 'Spending decreased' : 'Spending is stable',
      description:
        growthPct > 0
          ? `Your spending is up ${round2(growthPct)}% vs last month.`
          : growthPct < 0
          ? `Your spending is down ${round2(Math.abs(growthPct))}% vs last month.`
          : 'Your spending is flat vs last month.',
    });
  }

  if (topCategory) {
    behavioral.push({
      id: 'top-category',
      title: 'Top category dominance',
      description: `${topCategory.category_name} accounts for ${round2(topCategory.share_pct)}% of your expense spend this month.`,
    });
  }

  // Weekend vs weekday (current month)
  const weekdayTotal = currentExpenses
    .filter((e) => {
      const day = new Date(e.date).getDay();
      return day >= 1 && day <= 5;
    })
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const weekendTotal = currentExpenseTotal - weekdayTotal;
  if (currentExpenseTotal > 0) {
    const weekendPct = (weekendTotal / currentExpenseTotal) * 100;
    behavioral.push({
      id: 'weekend-vs-weekday',
      title: 'Weekend vs weekday pattern',
      description: `${round2(weekendPct)}% of your expense spending happens on weekends.`,
    });
  }

  // Settlement exposure ratio vs spend
  const exposure = settlementImpact.total_to_receive + settlementImpact.total_to_pay;
  if (currentSpend > 0) {
    behavioral.push({
      id: 'settlement-exposure',
      title: 'Settlement exposure',
      description: `Your open settlements exposure is ${round2((exposure / currentSpend) * 100)}% of this month’s spend.`,
    });
  }

  return { ...base, behavioral };
}

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}
