import { Router } from 'express';
import { requireAuth, createUserClient } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

// Get monthly summary (computes from expenses if not cached)
router.get('/:month', async (req, res) => {
  try {
    const supabase = createUserClient(req.supabaseToken);
    const { month } = req.params;

    const [year, m] = month.split('-').map(Number);
    const startDate = new Date(year, m - 1, 1).toISOString().slice(0, 10);
    const endDate = new Date(year, m, 0).toISOString().slice(0, 10);

    // Fetch expenses for the month
    const { data: expenses, error: expError } = await supabase
      .from('expenses')
      .select('amount, category_id, date')
      .gte('date', startDate)
      .lte('date', endDate);

    if (expError) throw expError;

    // Fetch subscriptions (monthly cost)
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('amount, billing_cycle')
      .eq('is_active', true);

    if (subError) throw subError;

    const totalExpenses = (expenses || []).reduce((sum, e) => sum + parseFloat(e.amount), 0);

    let totalSubscriptionsMonthly = 0;
    for (const s of subscriptions || []) {
      const amt = parseFloat(s.amount);
      totalSubscriptionsMonthly += s.billing_cycle === 'yearly' ? amt / 12 : amt;
    }

    // Category breakdown
    const categoryTotals = {};
    for (const e of expenses || []) {
      const cat = e.category_id || 'uncategorized';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + parseFloat(e.amount);
    }

    // Fetch category names for labels
    const categoryIds = [...new Set(Object.keys(categoryTotals).filter((id) => id !== 'uncategorized'))];
    let categoryNames = {};
    if (categoryIds.length > 0) {
      const { data: cats } = await supabase.from('expense_categories').select('id, name').in('id', categoryIds);
      categoryNames = Object.fromEntries((cats || []).map((c) => [c.id, c.name || 'Uncategorized']));
    }

    const categoryBreakdown = Object.entries(categoryTotals).map(([id, total]) => ({
      category_id: id,
      category_name: id === 'uncategorized' ? 'Other' : categoryNames[id] || id,
      total: Math.round(total * 100) / 100
    }));

    res.json({
      month,
      total_expenses: Math.round(totalExpenses * 100) / 100,
      total_subscriptions: Math.round(totalSubscriptionsMonthly * 100) / 100,
      category_breakdown: categoryBreakdown,
      total: Math.round((totalExpenses + totalSubscriptionsMonthly) * 100) / 100
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
