'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';

type AddPaymentModalProps = {
  open: boolean;
  settlementId: string | null;
  settlementRemaining: number;
  currency?: string;
  onClose: () => void;
  onSuccess: () => void;
};

export function AddPaymentModal({
  open,
  settlementId,
  settlementRemaining,
  currency = 'INR',
  onClose,
  onSuccess,
}: AddPaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    amount: '',
    paid_at: new Date().toISOString().slice(0, 10),
    note: '',
  });

  useEffect(() => {
    if (open) {
      setForm({
        amount: '',
        paid_at: new Date().toISOString().slice(0, 10),
        note: '',
      });
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!settlementId || !form.amount) return;

    const amount = Number(form.amount);
    if (amount <= 0) {
      alert('Amount must be greater than 0');
      return;
    }

    if (amount > settlementRemaining) {
      alert(`Amount cannot exceed remaining balance of ${settlementRemaining}`);
      return;
    }

    setLoading(true);
    try {
      await api.post(`settlements/${settlementId}/payments`, {
        amount,
        paid_at: form.paid_at,
        note: form.note || undefined,
      });
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error adding payment:', err);
      alert(err instanceof Error ? err.message : 'Failed to add payment');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-card-foreground shadow-lg shadow-black/10 dark:shadow-black/40 transition-colors duration-300"
          >
            <h3 className="text-lg font-semibold text-foreground">Add Payment</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Remaining: {settlementRemaining.toFixed(2)}
            </p>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="payment-amount" className="block text-sm font-medium text-muted-foreground mb-2">
                  Amount
                </label>
                <input
                  id="payment-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  max={settlementRemaining}
                  required
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-colors duration-300"
                  placeholder="Enter payment amount"
                />
              </div>
              <div>
                <label htmlFor="payment-date" className="block text-sm font-medium text-muted-foreground mb-2">
                  Payment Date
                </label>
                <input
                  id="payment-date"
                  type="date"
                  required
                  value={form.paid_at}
                  onChange={(e) => setForm((f) => ({ ...f, paid_at: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-colors duration-300"
                />
              </div>
              <div>
                <label htmlFor="payment-note" className="block text-sm font-medium text-muted-foreground mb-2">
                  Note (Optional)
                </label>
                <textarea
                  id="payment-note"
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  rows={2}
                  placeholder="Add a note about this payment..."
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-colors duration-300 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" isLoading={loading}>
                  Add Payment
                </Button>
                <Button type="button" variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
