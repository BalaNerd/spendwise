'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { AddExpenseForm } from '@/components/expenses/AddExpenseForm';
import { ExpenseList } from '@/components/expenses/ExpenseList';
import { fetchApi } from '@/lib/api';
import { formatCurrency, percentChange } from '@/lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

type Summary = {
  month: string;
  total_expenses: number;
  total_subscriptions: number;
  category_breakdown: { category_id: string; category_name?: string; total: number }[];
  total: number;
};

type Insight = {
  id: string;
  type: string;
  title: string;
  description: string;
  data: Record<string, unknown>;
};

type User = { currency?: string; monthly_budget?: number };

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

function getMonthOptions() {
  const out: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    out.push({ value, label });
  }
  return out;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [prevSummary, setPrevSummary] = useState<Summary | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [addExpenseError, setAddExpenseError] = useState<string | null>(null);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const currency = user?.currency || 'INR';
  const monthlyBudget = user?.monthly_budget ?? 0;

  const prevMonth = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    return d.toISOString().slice(0, 7);
  }, [month]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchApi(`/api/summaries/${month}`),
      fetchApi(`/api/summaries/${prevMonth}`).catch(() => null),
      fetchApi('/api/insights?limit=5'),
      fetchApi('/api/users/me').catch(() => null),
    ])
      .then(([s, prevS, i, u]) => {
        setSummary(s);
        setPrevSummary(prevS || null);
        setInsights(i);
        setUser(u || null);
      })
      .finally(() => setLoading(false));
  }, [month, prevMonth, refreshKey]);

  const handleAddExpense = async (expenseData: Record<string, unknown>) => {
    setIsAddingExpense(true);
    setAddExpenseError(null);
    try {
      await fetchApi('/api/expenses', {
        method: 'POST',
        body: JSON.stringify(expenseData),
      });
      setRefreshKey((k) => k + 1);
    } catch (error: unknown) {
      setAddExpenseError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsAddingExpense(false);
    }
  };

  const refresh = () => setRefreshKey((k) => k + 1);

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-2 border-neutral-600 border-t-white rounded-full" />
      </div>
    );
  }

  const totalExp = summary?.total_expenses ?? 0;
  const totalSub = summary?.total_subscriptions ?? 0;
  const total = summary?.total ?? 0;
  const prevTotal = prevSummary?.total ?? 0;
  const trend = percentChange(totalExp, prevSummary?.total_expenses ?? 0);
  const daysInMonth = new Date(
    parseInt(month.slice(0, 4), 10),
    parseInt(month.slice(5, 7), 10),
    0
  ).getDate();
  const avgDaily = daysInMonth > 0 ? totalExp / daysInMonth : 0;
  const budgetUsage = monthlyBudget > 0 ? Math.min(100, (total / monthlyBudget) * 100) : 0;
  const isOverBudget = monthlyBudget > 0 && total > monthlyBudget;

  const pieData = (summary?.category_breakdown || []).map((c, i) => ({
    name: c.category_name ?? (c.category_id === 'uncategorized' ? 'Other' : 'Category'),
    value: c.total,
    fill: COLORS[i % COLORS.length],
  }));

  const topCategory = summary?.category_breakdown?.length
    ? summary.category_breakdown.reduce((a, b) => (a.total >= b.total ? a : b))
    : null;

  const categoryTable = (summary?.category_breakdown || []).map((c) => ({
    ...c,
    pct: totalExp > 0 ? Math.round((c.total / totalExp) * 100) : 0,
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
          <p className="mt-1 text-neutral-400">
            Overview of your spending — switch month to compare
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            aria-label="Select month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-white text-sm"
          >
            {getMonthOptions().map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <AddExpenseForm onAddExpense={handleAddExpense} loading={isAddingExpense} />
        </div>
      </div>
      {addExpenseError && (
        <div className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{addExpenseError}</div>
      )}

      {/* Budget progress */}
      {monthlyBudget > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Budget progress</CardTitle>
            <CardDescription>
              {formatCurrency(total, currency)} of {formatCurrency(monthlyBudget, currency)} this month
            </CardDescription>
          </CardHeader>
          <div className="space-y-2">
            <div className="h-3 rounded-full bg-neutral-800 overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${isOverBudget ? 'bg-red-500' : budgetUsage >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, budgetUsage)}%` }}
                transition={{ duration: 0.6 }}
              />
            </div>
            {isOverBudget && (
              <p className="text-sm text-red-400">Over budget by {formatCurrency(total - monthlyBudget, currency)}</p>
            )}
            {!isOverBudget && budgetUsage >= 80 && budgetUsage <= 100 && (
              <p className="text-sm text-amber-400">Approaching your monthly budget</p>
            )}
          </div>
        </Card>
      )}

      {/* Summary + Trend + Quick stats */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader>
            <CardTitle>Total expenses</CardTitle>
            <CardDescription>This month</CardDescription>
          </CardHeader>
          <p className="text-3xl font-semibold text-white">
            {formatCurrency(totalExp, currency)}
          </p>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Subscriptions</CardTitle>
            <CardDescription>Monthly equivalent</CardDescription>
          </CardHeader>
          <p className="text-3xl font-semibold text-white">
            {formatCurrency(totalSub, currency)}
          </p>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total spend</CardTitle>
            <CardDescription>Expenses + subscriptions</CardDescription>
          </CardHeader>
          <p className="text-3xl font-semibold text-white">
            {formatCurrency(total, currency)}
          </p>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Vs last month</CardTitle>
            <CardDescription>Expense trend</CardDescription>
          </CardHeader>
          {trend !== null ? (
            <p
              className={`text-2xl font-semibold ${
                trend > 0 ? 'text-amber-400' : trend < 0 ? 'text-emerald-400' : 'text-neutral-400'
              }`}
            >
              {trend > 0 ? '+' : ''}{trend}%
            </p>
          ) : (
            <p className="text-2xl font-semibold text-neutral-500">—</p>
          )}
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Avg daily</CardTitle>
            <CardDescription>Spend per day</CardDescription>
          </CardHeader>
          <p className="text-2xl font-semibold text-white">
            {formatCurrency(avgDaily, currency)}/day
          </p>
          {topCategory && (
            <p className="mt-1 text-xs text-neutral-500">
              Top: {topCategory.category_name ?? 'Other'}
            </p>
          )}
        </Card>
      </div>

      {/* Category table */}
      {categoryTable.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Category breakdown</CardTitle>
            <CardDescription>Spending by category with share of total</CardDescription>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-neutral-400 border-b border-neutral-800">
                  <th className="pb-2 pr-4">Category</th>
                  <th className="pb-2 pr-4 text-right">Amount</th>
                  <th className="pb-2 text-right">%</th>
                </tr>
              </thead>
              <tbody>
                {categoryTable.map((row, i) => (
                  <tr key={row.category_id} className="border-b border-neutral-800/50">
                    <td className="py-2 pr-4 text-white">
                      <span
                        className="inline-block w-2 h-2 rounded-full mr-2 bg-neutral-500"
                        style={{ backgroundColor: COLORS[i % COLORS.length] } as React.CSSProperties}
                      />
                      {row.category_name ?? (row.category_id === 'uncategorized' ? 'Other' : row.category_id)}
                    </td>
                    <td className="py-2 pr-4 text-right text-white">
                      {formatCurrency(row.total, currency)}
                    </td>
                    <td className="py-2 text-right text-neutral-400">{row.pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Charts + Insights */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Category distribution</CardTitle>
            <CardDescription>Where your money goes</CardDescription>
          </CardHeader>
          {pieData.length > 0 ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={pieData[i].fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v, currency)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-neutral-500">
              No category data yet. Add expenses to see distribution.
            </div>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Smart insights</CardTitle>
            <CardDescription>Data-driven observations</CardDescription>
          </CardHeader>
          <div className="space-y-4">
            {insights.length > 0 ? (
              insights.map((insight) => (
                <motion.div
                  key={insight.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-lg border border-neutral-800 bg-neutral-800/30 p-4"
                >
                  <h4 className="font-medium text-white">{insight.title}</h4>
                  <p className="mt-1 text-sm text-neutral-400">{insight.description}</p>
                </motion.div>
              ))
            ) : (
              <p className="text-neutral-500 text-sm">
                Add expenses to start receiving personalized insights.
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Expense list with Edit/Delete */}
      <Card>
        <CardHeader>
          <CardTitle>Expenses</CardTitle>
          <CardDescription>
            {new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}{' '}
            — edit or delete any entry
          </CardDescription>
        </CardHeader>
        <ExpenseList
          month={month}
          refreshKey={refreshKey}
          onRefresh={refresh}
          currency={currency}
        />
      </Card>
    </div>
  );
}
