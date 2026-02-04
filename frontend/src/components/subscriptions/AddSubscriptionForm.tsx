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
        await api.put(`/api/subscriptions/${editingSubscription.id}`, {
          name: form.name,
          amount: parseFloat(form.amount),
          billing_cycle: form.billing_cycle,
          last_activity_date: form.last_activity_date || undefined,
          is_active: form.is_active,
        });
      } else {
        await api.post('/api/subscriptions', {
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
        <Button onClick={() => setOpen(true)} size="sm">
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
              className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-900 p-6"
            >
              <h3 className="text-lg font-semibold text-white">
                {isEdit ? 'Edit subscription' : 'Add subscription'}
              </h3>
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">Name</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Netflix, Spotify..."
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-3 text-white placeholder-neutral-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-3 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">Billing cycle</label>
                  <select
                    value={form.billing_cycle}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        billing_cycle: e.target.value as 'monthly' | 'yearly',
                      }))
                    }
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-3 text-white"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">Last activity</label>
                  <input
                    type="date"
                    value={form.last_activity_date}
                    onChange={(e) => setForm((f) => ({ ...f, last_activity_date: e.target.value }))}
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-3 text-white"
                  />
                </div>
                {isEdit && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                      className="rounded border-neutral-600"
                    />
                    <span className="text-sm text-neutral-400">Active</span>
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
