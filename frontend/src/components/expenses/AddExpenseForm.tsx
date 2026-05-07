'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';

type Category = { id: string; name: string };

export type ExpenseForForm = {
  id: string;
  amount: number;
  description: string | null;
  date: string;
  category_id: string | null;
  recurring: boolean;
  expense_categories?: { id: string; name: string } | null;
};

type AddExpenseFormProps = {
  onSuccess?: () => void;
  onAddExpense?: (expenseData: Record<string, unknown>) => Promise<void>;
  onUpdateExpense?: (id: string, expenseData: Record<string, unknown>) => Promise<void>;
  loading?: boolean;
  /** When set, form opens in edit mode with this expense */
  editingExpense?: ExpenseForForm | null;
  setEditingExpense?: (e: ExpenseForForm | null) => void;
};

const defaultForm = {
  amount: '',
  description: '',
  date: new Date().toISOString().slice(0, 10),
  category_id: '',
  recurring: false,
};

export function AddExpenseForm({
  onSuccess,
  onAddExpense,
  onUpdateExpense,
  loading,
  editingExpense,
  setEditingExpense,
}: AddExpenseFormProps) {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [internalLoading, setInternalLoading] = useState(false);
  const [form, setForm] = useState(defaultForm);

  const isEdit = !!editingExpense;

  useEffect(() => {
    api.get<Category[]>('categories').then(setCategories).catch(() => []);
  }, []);

  useEffect(() => {
    if (editingExpense) {
      setOpen(true);
      setForm({
        amount: String(editingExpense.amount),
        description: editingExpense.description || '',
        date: editingExpense.date,
        category_id: editingExpense.category_id || '',
        recurring: editingExpense.recurring ?? false,
      });
    }
  }, [editingExpense]);

  function closeModal() {
    setOpen(false);
    setForm(defaultForm);
    setEditingExpense?.(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.amount || !form.date) return;
    const payload = {
      amount: parseFloat(form.amount),
      description: form.description || undefined,
      date: form.date,
      category_id: form.category_id || undefined,
      recurring: form.recurring,
    };

    if (isEdit && editingExpense) {
      if (onUpdateExpense) {
        await onUpdateExpense(editingExpense.id, payload);
      } else {
        setInternalLoading(true);
        try {
          await api.put(`expenses/${editingExpense.id}`, payload);
        } finally {
          setInternalLoading(false);
        }
      }
      closeModal();
      onSuccess?.();
      return;
    }

    if (onAddExpense) {
      await onAddExpense(payload);
      setForm(defaultForm);
      setOpen(false);
      onSuccess?.();
    } else {
      setInternalLoading(true);
      try {
        await api.post('expenses', payload);
        setForm(defaultForm);
        setOpen(false);
        onSuccess?.();
      } finally {
        setInternalLoading(false);
      }
    }
  }

  return (
    <>
      {!isEdit && (
        <Button onClick={() => setOpen(true)} size="sm">
          Add expense
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
                {isEdit ? 'Edit expense' : 'Add expense'}
              </h3>
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="expense-amount" className="block text-sm font-medium text-muted-foreground mb-2">Amount</label>
                  <input
                    id="expense-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-colors duration-300"
                    placeholder="Enter amount"
                  />
                </div>
                <div>
                  <label htmlFor="expense-date" className="block text-sm font-medium text-muted-foreground mb-2">Date</label>
                  <input
                    id="expense-date"
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-colors duration-300"
                  />
                </div>
                <div>
                  <label htmlFor="expense-category" className="block text-sm font-medium text-muted-foreground mb-2">Category</label>
                  <select
                    id="expense-category"
                    value={form.category_id}
                    onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-colors duration-300"
                  >
                    <option value="">— Select —</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="expense-description" className="block text-sm font-medium text-muted-foreground mb-2">Description</label>
                  <input
                    id="expense-description"
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Optional"
                    className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-colors duration-300"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    id="expense-recurring"
                    type="checkbox"
                    checked={form.recurring}
                    onChange={(e) => setForm((f) => ({ ...f, recurring: e.target.checked }))}
                    className="rounded border-border bg-background"
                  />
                  <span className="text-sm text-muted-foreground">Recurring expense</span>
                </label>
                <div className="flex gap-3 pt-2">
                  <Button
                    type="submit"
                    isLoading={typeof loading === 'boolean' ? loading : internalLoading}
                  >
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
