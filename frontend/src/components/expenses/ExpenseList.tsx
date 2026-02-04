'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { formatCurrency, formatShortDate } from '@/lib/utils';
import { AddExpenseForm, type ExpenseForForm } from './AddExpenseForm';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

type Expense = ExpenseForForm & {
  expense_categories?: { id: string; name: string; color?: string } | null;
};

type ExpenseListProps = {
  month: string;
  refreshKey?: number;
  onRefresh: () => void;
  currency?: string;
};

export function ExpenseList({ month, refreshKey = 0, onRefresh, currency = 'INR' }: ExpenseListProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingExpense, setEditingExpense] = useState<ExpenseForForm | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [search, setSearch] = useState('');

  const loadExpenses = useCallback(() => {
    setLoading(true);
    api
      .get<Expense[]>(`/api/expenses?month=${month}&limit=200`)
      .then(setExpenses)
      .catch(() => setExpenses([]))
      .finally(() => setLoading(false));
  }, [month]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses, refreshKey]);

  const handleUpdateExpense = async (id: string, data: Record<string, unknown>) => {
    await api.put(`/api/expenses/${id}`, data);
    setEditingExpense(null);
    loadExpenses();
    onRefresh();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/api/expenses/${deleteTarget.id}`);
      setDeleteTarget(null);
      loadExpenses();
      onRefresh();
    } finally {
      setDeleteLoading(false);
    }
  };

  const filtered = search.trim()
    ? expenses.filter(
        (e) =>
          (e.description || '').toLowerCase().includes(search.toLowerCase()) ||
          (e.expense_categories?.name || '').toLowerCase().includes(search.toLowerCase())
      )
    : expenses;

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-white">Recent expenses</h3>
          <input
            type="search"
            placeholder="Search by description or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white placeholder-neutral-500 w-56 max-w-full"
          />
        </div>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-neutral-600 border-t-white rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-6 text-center text-neutral-500 text-sm">
            {search ? 'No expenses match your search.' : 'No expenses this month. Add one above.'}
          </p>
        ) : (
          <ul className="space-y-2" role="list">
            {filtered.map((exp, i) => (
              <li
                key={exp.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-800 bg-neutral-800/30 px-4 py-3"
              >
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-center gap-3 min-w-0 flex-1"
                >
                  <span className="text-lg font-semibold text-white shrink-0">
                    {formatCurrency(Number(exp.amount), currency)}
                  </span>
                  <span className="text-neutral-400 text-sm shrink-0">
                    {formatShortDate(exp.date)}
                  </span>
                  <span className="text-neutral-300 truncate">
                    {exp.expense_categories?.name || 'Uncategorized'}
                  </span>
                  {exp.description && (
                    <span className="text-neutral-500 text-sm truncate hidden sm:block">
                      {exp.description}
                    </span>
                  )}
                  {exp.recurring && (
                    <span className="rounded bg-violet-500/20 px-1.5 py-0.5 text-xs text-violet-400 shrink-0">
                      Recurring
                    </span>
                  )}
                </motion.div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditingExpense(exp)}
                    className="rounded px-2 py-1.5 text-sm text-neutral-400 hover:text-white hover:bg-neutral-700"
                    aria-label="Edit"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(exp)}
                    className="rounded px-2 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    aria-label="Delete"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AddExpenseForm
        editingExpense={editingExpense}
        setEditingExpense={setEditingExpense}
        onUpdateExpense={handleUpdateExpense}
        onSuccess={() => {
          loadExpenses();
          onRefresh();
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete expense"
        message={
          deleteTarget
            ? `Remove "${deleteTarget.description || formatCurrency(Number(deleteTarget.amount), currency)}" from ${formatShortDate(deleteTarget.date)}? This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteLoading}
      />
    </>
  );
}
