import { Router } from 'express';
import { requireAuth, createUserClient } from '../middleware/auth.js';

const router = Router();

// All routes protected
router.use(requireAuth);

/**
 * GET /people/:id
 * Person-level ledger view: aggregates all settlements and payments
 * for a given person (per authenticated user).
 *
 * :id is a URL-encoded person_name.
 */
router.get('/:id', async (req, res) => {
  try {
    const supabase = createUserClient(req.supabaseToken);
    const userId = req.user.id;
    const rawId = req.params.id;
    const personName = decodeURIComponent(rawId);

    // Fetch all settlements for this person & user with payments
    const { data: settlements, error } = await supabase
      .from('settlements')
      .select(
        `
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
      `
      )
      .eq('user_id', userId)
      .eq('person_name', personName)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const enrichedSettlements = (settlements || []).map((settlement) => {
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
        payments: payments
          .map((p) => ({
            ...p,
            amount: Number(p.amount),
          }))
          .sort((a, b) => new Date(a.paid_at) - new Date(b.paid_at)),
      };
    });

    // Aggregates
    const totalGiven = enrichedSettlements
      .filter((s) => s.type === 'gave')
      .reduce((sum, s) => sum + Number(s.total_amount), 0);

    const totalReceived = enrichedSettlements
      .filter((s) => s.type === 'received')
      .reduce((sum, s) => sum + Number(s.total_amount), 0);

    const netBalance = totalGiven - totalReceived;
    const overdueCount = enrichedSettlements.filter((s) => s.status === 'overdue').length;

    // Flattened payments timeline for this person
    const paymentsTimeline = enrichedSettlements
      .flatMap((s) =>
        (s.payments || []).map((p) => ({
          id: p.id,
          settlement_id: s.id,
          person_name: s.person_name,
          type: s.type,
          amount: p.amount,
          paid_at: p.paid_at,
          note: p.note,
          created_at: p.created_at,
        }))
      )
      .sort((a, b) => new Date(a.paid_at) - new Date(b.paid_at));

    res.json({
      person_name: personName,
      total_given: totalGiven,
      total_received: totalReceived,
      net_balance: netBalance,
      overdue_count: overdueCount,
      settlements: enrichedSettlements,
      payments: paymentsTimeline,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

