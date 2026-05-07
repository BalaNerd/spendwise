import { Router } from 'express';
import { requireAuth, createUserClient } from '../middleware/auth.js';

const router = Router();

// All routes protected
router.use(requireAuth);

/**
 * GET /settlements
 * Returns all settlements for authenticated user with computed fields
 */
router.get('/', async (req, res) => {
  try {
    const supabase = createUserClient(req.supabaseToken);
    const userId = req.user.id;

    // Fetch settlements with payments
    const { data: settlements, error: settlementsError } = await supabase
      .from('settlements')
      .select(`
        id,
        person_name,
        type,
        total_amount,
        due_date,
        notes,
        created_at,
        settlement_payments (
          id,
          amount,
          paid_at,
          note,
          created_at
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (settlementsError) throw settlementsError;

    // Compute derived fields
    const enriched = settlements.map((settlement) => {
      const payments = settlement.settlement_payments || [];
      const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const remaining = Number(settlement.total_amount) - totalPaid;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let status = 'pending';
      if (remaining === 0) {
        status = 'completed';
      } else if (remaining < Number(settlement.total_amount)) {
        status = 'partially_settled';
      } else if (settlement.due_date) {
        const dueDate = new Date(settlement.due_date);
        dueDate.setHours(0, 0, 0, 0);
        if (dueDate < today && remaining > 0) {
          status = 'overdue';
        }
      }

      return {
        ...settlement,
        total_paid: totalPaid,
        remaining,
        status,
        payments: payments.sort((a, b) => new Date(b.paid_at) - new Date(a.paid_at))
      };
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /settlements
 * Create new settlement
 */
router.post('/', async (req, res) => {
  try {
    const supabase = createUserClient(req.supabaseToken);
    const userId = req.user.id;

    const { person_name, type, total_amount, due_date, notes } = req.body;

    if (!person_name || !type || !total_amount) {
      return res.status(400).json({
        error: 'person_name, type, and total_amount are required'
      });
    }

    if (!['gave', 'received'].includes(type)) {
      return res.status(400).json({
        error: 'type must be either "gave" or "received"'
      });
    }

    if (Number(total_amount) <= 0) {
      return res.status(400).json({
        error: 'total_amount must be greater than 0'
      });
    }

    const { data, error } = await supabase
      .from('settlements')
      .insert({
        user_id: userId,
        person_name: person_name.trim(),
        type,
        total_amount: Number(total_amount),
        due_date: due_date || null,
        notes: notes || null
      })
      .select()
      .single();

    if (error) throw error;

    // Return with computed fields
    const enriched = {
      ...data,
      total_paid: 0,
      remaining: Number(data.total_amount),
      status: 'pending',
      payments: []
    };

    res.status(201).json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /settlements/:id/payments
 * Add partial payment to a settlement
 */
router.post('/:id/payments', async (req, res) => {
  try {
    const supabase = createUserClient(req.supabaseToken);
    const userId = req.user.id;
    const { id } = req.params;

    // Verify settlement belongs to user
    const { data: settlement, error: settlementError } = await supabase
      .from('settlements')
      .select('id, total_amount')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (settlementError || !settlement) {
      return res.status(404).json({ error: 'Settlement not found' });
    }

    const { amount, paid_at, note } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        error: 'amount is required and must be greater than 0'
      });
    }

    // Get current payments to check if adding this payment would exceed total
    const { data: existingPayments } = await supabase
      .from('settlement_payments')
      .select('amount')
      .eq('settlement_id', id);

    const currentTotal = existingPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
    const newTotal = currentTotal + Number(amount);

    if (newTotal > Number(settlement.total_amount)) {
      return res.status(400).json({
        error: `Payment amount exceeds remaining balance. Remaining: ${Number(settlement.total_amount) - currentTotal}`
      });
    }

    const { data, error } = await supabase
      .from('settlement_payments')
      .insert({
        settlement_id: id,
        amount: Number(amount),
        paid_at: paid_at || new Date().toISOString().slice(0, 10),
        note: note || null
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
 * PUT /settlements/:id
 * Update settlement (notes, due_date, or total_amount)
 */
router.put('/:id', async (req, res) => {
  try {
    const supabase = createUserClient(req.supabaseToken);
    const userId = req.user.id;
    const { id } = req.params;

    // Verify settlement belongs to user
    const { error: checkError } = await supabase
      .from('settlements')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (checkError) {
      return res.status(404).json({ error: 'Settlement not found' });
    }

    const { notes, due_date, total_amount } = req.body;
    const updates = {};

    if (notes !== undefined) updates.notes = notes;
    if (due_date !== undefined) updates.due_date = due_date || null;
    if (total_amount !== undefined) {
      if (Number(total_amount) <= 0) {
        return res.status(400).json({ error: 'total_amount must be greater than 0' });
      }
      updates.total_amount = Number(total_amount);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const { data, error } = await supabase
      .from('settlements')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Fetch with payments and compute fields
    const { data: settlementWithPayments } = await supabase
      .from('settlements')
      .select(`
        *,
        settlement_payments (*)
      `)
      .eq('id', id)
      .single();

    const payments = settlementWithPayments?.settlement_payments || [];
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const remaining = Number(settlementWithPayments.total_amount) - totalPaid;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let status = 'pending';
    if (remaining === 0) {
      status = 'completed';
    } else if (remaining < Number(settlementWithPayments.total_amount)) {
      status = 'partially_settled';
    } else if (settlementWithPayments.due_date) {
      const dueDate = new Date(settlementWithPayments.due_date);
      dueDate.setHours(0, 0, 0, 0);
      if (dueDate < today && remaining > 0) {
        status = 'overdue';
      }
    }

    res.json({
      ...settlementWithPayments,
      total_paid: totalPaid,
      remaining,
      status,
      payments: payments.sort((a, b) => new Date(b.paid_at) - new Date(a.paid_at))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /settlements/:id
 * Delete settlement (cascades to payments)
 */
router.delete('/:id', async (req, res) => {
  try {
    const supabase = createUserClient(req.supabaseToken);
    const userId = req.user.id;
    const { id } = req.params;

    // Verify settlement belongs to user
    const { error: checkError } = await supabase
      .from('settlements')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (checkError) {
      return res.status(404).json({ error: 'Settlement not found' });
    }

    const { error } = await supabase
      .from('settlements')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
