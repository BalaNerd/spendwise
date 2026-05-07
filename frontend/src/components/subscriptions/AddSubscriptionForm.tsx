'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';

export type SubscriptionForForm = {
  id: string;
  name: string;
  amount: number;
  billing_cycle: 'monthly' | 'yearly';
  last_activity_date: string | null;
  is_active: boolean;
};

const defaultForm = {
  name: '',
  amount: '',
  billing_cycle: 'monthly' as 'monthly' | 'yearly',
  last_activity_date: new Date().toISOString().slice(0, 10),
  is_active: true,
};

type AddSubscriptionFormProps = {
  onSuccess?: () => void;
  editingSubscription?: SubscriptionForForm | null;
  setEditingSubscription?: (s: SubscriptionForForm | null) => void;
};

export function AddSubscriptionForm({
  onSuccess,
  editingSubscription,
  setEditingSubscription,
}: AddSubscriptionFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(defaultForm);

  const isEdit = !!editingSubscription;

  useEffect(() => {
    if (editingSubscription) {
      setOpen(true);
      setForm({
        name: editingSubscription.name,
        amount: String(editingSubscription.amount),
        billing_cycle: editingSubscription.billing_cycle,
        last_activity_date: editingSubscription.last_activity_date || new Date().toISOString().slice(0, 10),
        is_active: editingSubscription.is_active,
      });
    }
  }, [editingSubscription]);

  function closeModal() {
    setOpen(false);
    setForm(defaultForm);
    setEditingSubscription?.(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.amount) return;
    setLoading(true);
    try {
      if (isEdit && editingSubscription) {
        await api.put(`subscriptions/${editingSubscription.id}`, {
          name: form.name,
          amount: parseFloat(form.amount),
          billing_cycle: form.billing_cycle,
          last_activity_date: form.last_activity_date || undefined,
          is_active: form.is_active,
        });
      } else {
        await api.post('subscriptions', {
          name: form.name,
          amount: parseFloat(form.amount),
          billing_cycle: form.billing_cycle,
          last_activity_date: form.last_activity_date || undefined,
          is_active: form.is_active,
        });
      }
      closeModal();
      onSuccess?.();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {!isEdit && (
        <Button onClick={() => setOpen(true)} size="sm" className="w-full sm:w-auto">
          Add subscription
        </Button>
      )}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={closeModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-card-foreground shadow-lg shadow-black/10 dark:shadow-black/40 transition-colors duration-300"
            >
              <h3 className="text-lg font-semibold text-foreground">
                {isEdit ? 'Edit subscription' : 'Add subscription'}
              </h3>
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="sub-name" className="block text-sm font-medium text-muted-foreground mb-2">Name</label>
                  <input
                    id="sub-name"
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Netflix, Spotify..."
                    className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-colors duration-300"
                  />
                </div>
                <div>
                  <label htmlFor="sub-amount" className="block text-sm font-medium text-muted-foreground mb-2">Amount</label>
                  <input
                    id="sub-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-colors duration-300"
                  />
                </div>
                <div>
                  <label htmlFor="sub-cycle" className="block text-sm font-medium text-muted-foreground mb-2">Billing cycle</label>
                  <select
                    id="sub-cycle"
                    value={form.billing_cycle}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        billing_cycle: e.target.value as 'monthly' | 'yearly',
                      }))
                    }
                    className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-colors duration-300"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="sub-last-activity" className="block text-sm font-medium text-muted-foreground mb-2">Last activity</label>
                  <input
                    id="sub-last-activity"
                    type="date"
                    value={form.last_activity_date}
                    onChange={(e) => setForm((f) => ({ ...f, last_activity_date: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-colors duration-300"
                  />
                </div>
                {isEdit && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                      className="rounded border-border bg-background"
                    />
                    <span className="text-sm text-muted-foreground">Active</span>
                  </label>
                )}
                <div className="flex gap-3 pt-2">
                  <Button type="submit" isLoading={loading}>
                    {isEdit ? 'Save changes' : 'Add'}
                  </Button>
                  <Button type="button" variant="ghost" onClick={closeModal}>
                    Cancel
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
