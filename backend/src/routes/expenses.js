import { Router } from 'express';
import { requireAuth, createUserClient } from '../middleware/auth.js';

const router = Router();

// All routes protected
router.use(requireAuth);

/**
 * GET /expenses
 */
router.get('/', async (req, res) => {
  try {
    const supabase = createUserClient(req.supabaseToken);
    const { month, limit = 100 } = req.query;

    let query = supabase
      .from('expenses')
      .select(`
        id,
        amount,
        description,
        date,
        recurring,
        created_at,
        expense_categories (
          id,
          name,
          icon,
          color
        )
      `)
      .order('date', { ascending: false })
      .limit(Number(limit));

    if (month) {
      const [year, m] = month.split('-').map(Number);
      const start = new Date(year, m - 1, 1).toISOString().slice(0, 10);
      const end = new Date(year, m, 0).toISOString().slice(0, 10);

      query = query.gte('date', start).lte('date', end);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /expenses
 */
router.post('/', async (req, res) => {
  try {
    const supabase = createUserClient(req.supabaseToken);
    const userId = req.user.id;

    const { amount, category_id, description, date, recurring = false } = req.body;

    if (!amount || !date) {
      return res.status(400).json({
        error: 'Amount and date are required'
      });
    }

    const { data, error } = await supabase
      .from('expenses')
      .insert({
        user_id: userId,          // 🔑 REQUIRED FOR RLS
        amount: Number(amount),
        category_id: category_id || null,
        description: description || null,
        date,
        recurring: Boolean(recurring)
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /expenses/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const supabase = createUserClient(req.supabaseToken);
    const { id } = req.params;
    const { amount, category_id, description, date, recurring } = req.body;

    const updates = {};
    if (amount !== undefined) updates.amount = Number(amount);
    if (category_id !== undefined) updates.category_id = category_id || null;
    if (description !== undefined) updates.description = description;
    if (date !== undefined) updates.date = date;
    if (recurring !== undefined) updates.recurring = Boolean(recurring);

    const { data, error } = await supabase
      .from('expenses')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /expenses/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const supabase = createUserClient(req.supabaseToken);
    const { id } = req.params;

    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
