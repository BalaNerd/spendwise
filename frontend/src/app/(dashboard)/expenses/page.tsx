'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { ExpenseList } from '@/components/expenses/ExpenseList';
import { AddExpenseForm } from '@/components/expenses/AddExpenseForm';
import { api } from '@/lib/api';

export default function ExpensesPage() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [refreshKey, setRefreshKey] = useState(0);
  const [currency, setCurrency] = useState('INR');

  useEffect(() => {
    api.get<{ currency?: string }>('/api/users/me').then((u) => setCurrency(u?.currency || 'INR')).catch(() => {});
  }, []);

  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return { value: d.toISOString().slice(0, 7), label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) };
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Expenses</h1>
          <p className="mt-1 text-neutral-400">
            View, edit, or delete any expense — filter by month and search
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            aria-label="Select month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-white text-sm"
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <AddExpenseForm
            onSuccess={() => setRefreshKey((k) => k + 1)}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All expenses</CardTitle>
          <CardDescription>
            {new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </CardDescription>
        </CardHeader>
        <ExpenseList
          month={month}
          refreshKey={refreshKey}
          onRefresh={() => setRefreshKey((k) => k + 1)}
          currency={currency}
        />
      </Card>
    </div>
  );
}
