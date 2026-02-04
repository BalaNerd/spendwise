import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createUserClient } from '../utils/supabase.js';

const router = Router();

router.use(requireAuth);

// Export expenses as CSV
router.get('/expenses', async (req, res) => {
  try {
    const supabase = createUserClient(req.supabaseToken);
    const { month, limit = 5000 } = req.query;

    let query = supabase
      .from('expenses')
      .select('*, expense_categories(name)')
      .order('date', { ascending: false })
      .limit(parseInt(limit, 10));

    if (month) {
      const [year, m] = month.split('-');
      const start = new Date(year, m - 1, 1).toISOString().slice(0, 10);
      const end = new Date(year, m, 0).toISOString().slice(0, 10);
      query = query.gte('date', start).lte('date', end);
    }

    const { data, error } = await query;

    if (error) throw error;

    const rows = [
      ['Date', 'Amount', 'Category', 'Description', 'Recurring'].join(','),
      ...(data || []).map((e) =>
        [
          e.date,
          e.amount,
          e.expense_categories?.name || '',
          (e.description || '').replace(/"/g, '""'),
          e.recurring ? 'Yes' : 'No'
        ].join(',')
      )
    ];

    const csv = rows.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="spendwise-expenses.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
