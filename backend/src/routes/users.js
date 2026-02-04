import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createUserClient } from '../utils/supabase.js';

const router = Router();

router.use(requireAuth);

router.get('/me', async (req, res) => {
  try {
    const supabase = createUserClient(req.supabaseToken);

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) throw error;

    res.json({
      id: user.id,
      email: user.email,
      ...profile
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/me', async (req, res) => {
  try {
    const supabase = createUserClient(req.supabaseToken);
    const { currency, monthly_budget, insight_level } = req.body;

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const updates = {};
    if (currency !== undefined) updates.currency = currency;
    if (monthly_budget !== undefined) updates.monthly_budget = parseFloat(monthly_budget);
    if (insight_level !== undefined) {
      if (!['basic', 'advanced'].includes(insight_level)) {
        return res.status(400).json({ error: 'insight_level must be basic or advanced' });
      }
      updates.insight_level = insight_level;
    }

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
