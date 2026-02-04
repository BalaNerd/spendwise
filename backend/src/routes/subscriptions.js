import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createUserClient } from '../utils/supabase.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const supabase = createUserClient(req.supabaseToken);
    const { active } = req.query;

    let query = supabase
      .from('subscriptions')
      .select('*')
      .order('amount', { ascending: false });

    if (active !== undefined) {
      query = query.eq('is_active', active === 'true');
    }

    const { data, error } = await query;

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const supabase = createUserClient(req.supabaseToken);
    const { name, amount, billing_cycle, last_activity_date, is_active = true } = req.body;

    if (!name || !amount || !billing_cycle) {
      return res.status(400).json({ error: 'Name, amount, and billing_cycle are required' });
    }

    if (!['monthly', 'yearly'].includes(billing_cycle)) {
      return res.status(400).json({ error: 'billing_cycle must be monthly or yearly' });
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .insert({
        user_id: req.user.id,
        name,
        amount: parseFloat(amount),
        billing_cycle,
        last_activity_date: last_activity_date || null,
        is_active: !!is_active
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const supabase = createUserClient(req.supabaseToken);
    const { id } = req.params;
    const { name, amount, billing_cycle, last_activity_date, is_active } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (amount !== undefined) updates.amount = parseFloat(amount);
    if (billing_cycle !== undefined) updates.billing_cycle = billing_cycle;
    if (last_activity_date !== undefined) updates.last_activity_date = last_activity_date;
    if (is_active !== undefined) updates.is_active = !!is_active;

    const { data, error } = await supabase
      .from('subscriptions')
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

router.delete('/:id', async (req, res) => {
  try {
    const supabase = createUserClient(req.supabaseToken);
    const { id } = req.params;

    const { error } = await supabase.from('subscriptions').delete().eq('id', id);

    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
