'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import type { Settlement } from './SettlementCard';

type AddSettlementFormProps = {
  onSuccess?: () => void;
  editingSettlement?: Settlement | null;
  setEditingSettlement?: (s: Settlement | null) => void;
};

const defaultForm = {
  person_name: '',
  type: 'gave' as 'gave' | 'received',
  total_amount: '',
  due_date: '',
  notes: '',
};

export function AddSettlementForm({
  onSuccess,
  editingSettlement,
  setEditingSettlement,
}: AddSettlementFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(defaultForm);

  const isEdit = !!editingSettlement;

  useEffect(() => {
    if (editingSettlement) {
      setOpen(true);
      setForm({
        person_name: editingSettlement.person_name,
        type: editingSettlement.type,
        total_amount: String(editingSettlement.total_amount),
        due_date: editingSettlement.due_date || '',
        notes: editingSettlement.notes || '',
      });
    }
  }, [editingSettlement]);

  function closeModal() {
    setOpen(false);
    setForm(defaultForm);
    setEditingSettlement?.(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.person_name || !form.total_amount) return;

    setLoading(true);
    try {
      if (isEdit && editingSettlement) {
        await api.put(`settlements/${editingSettlement.id}`, {
          notes: form.notes || undefined,
          due_date: form.due_date || undefined,
          total_amount: form.total_amount ? Number(form.total_amount) : undefined,
        });
      } else {
        await api.post('settlements', {
          person_name: form.person_name.trim(),
          type: form.type,
          total_amount: Number(form.total_amount),
          due_date: form.due_date || undefined,
          notes: form.notes || undefined,
        });
      }
      closeModal();
      onSuccess?.();
    } catch (err) {
      console.error('Error saving settlement:', err);
      alert(err instanceof Error ? err.message : 'Failed to save settlement');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {!isEdit && (
        <Button onClick={() => setOpen(true)} size="sm">
          Add Settlement
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
                {isEdit ? 'Edit Settlement' : 'Add Settlement'}
              </h3>
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                {!isEdit && (
                  <>
                    <div>
                      <label htmlFor="settlement-person" className="block text-sm font-medium text-muted-foreground mb-2">
                        Person Name
                      </label>
                      <input
                        id="settlement-person"
                        type="text"
                        required
                        value={form.person_name}
                        onChange={(e) => setForm((f) => ({ ...f, person_name: e.target.value }))}
                        className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-colors duration-300"
                        placeholder="Enter person's name"
                      />
                    </div>
                    <div>
                      <label htmlFor="settlement-type" className="block text-sm font-medium text-muted-foreground mb-2">
                        Type
                      </label>
                      <select
                        id="settlement-type"
                        value={form.type}
                        onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as 'gave' | 'received' }))}
                        className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-colors duration-300"
                      >
                        <option value="gave">I Gave (They owe me)</option>
                        <option value="received">I Received (I owe them)</option>
                      </select>
                    </div>
                  </>
                )}
                <div>
                  <label htmlFor="settlement-amount" className="block text-sm font-medium text-muted-foreground mb-2">
                    Total Amount
                  </label>
                  <input
                    id="settlement-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={form.total_amount}
                    onChange={(e) => setForm((f) => ({ ...f, total_amount: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-colors duration-300"
                    placeholder="Enter amount"
                  />
                </div>
                <div>
                  <label htmlFor="settlement-due-date" className="block text-sm font-medium text-muted-foreground mb-2">
                    Due Date (Optional)
                  </label>
                  <input
                    id="settlement-due-date"
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-colors duration-300"
                  />
                </div>
                <div>
                  <label htmlFor="settlement-notes" className="block text-sm font-medium text-muted-foreground mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    id="settlement-notes"
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    rows={3}
                    placeholder="Add any notes..."
                    className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-colors duration-300 resize-none"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button type="submit" isLoading={loading}>
                    {isEdit ? 'Save Changes' : 'Add'}
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
