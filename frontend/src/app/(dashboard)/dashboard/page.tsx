'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { AddExpenseForm } from '@/components/expenses/AddExpenseForm';
import { ExpenseList } from '@/components/expenses/ExpenseList';
import { fetchApi } from '@/lib/api';
import { formatCurrency, percentChange } from '@/lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useTheme } from 'next-themes';
import { usePreferences } from '@/components/providers/PreferencesProvider';

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

const COLORS = ['bg-emerald-500', 'bg-blue-500', 'bg-amber-500', 'bg-red-500', 'bg-violet-500', 'bg-pink-500'];

// Category colors for distinct visualization
const darkColors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];
const lightColors = ['#047857', '#1d4ed8', '#6d28d9', '#b45309', '#b91c1c', '#0e7490'];

const categoryColors: { [key: string]: string } = {
  'food & dining': '#10b981',
  'transport': '#3b82f6', 
  'shopping': '#8b5cf6',
  'entertainment': '#f59e0b',
  'bills & utilities': '#ef4444',
  'healthcare': '#06b6d4',
};

// Fallback colors for unmapped categories
const fallbackColors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];

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
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const { preferences } = usePreferences();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [prevSummary, setPrevSummary] = useState<Summary | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [addExpenseError, setAddExpenseError] = useState<string | null>(null);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const currency = preferences?.currency || user?.currency || 'INR';
  const monthlyBudget = preferences?.monthly_budget ?? user?.monthly_budget ?? 0;

  const prevMonth = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    return d.toISOString().slice(0, 7);
  }, [month]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchApi(`summaries/${month}`),
      fetchApi(`summaries/${prevMonth}`).catch(() => null),
      fetchApi('insights?limit=5'),
      fetchApi('users/me').catch(() => null),
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
      await fetchApi('expenses', {
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
    category_name: c.category_name ?? (c.category_id === 'uncategorized' ? 'Other' : 'Category'),
  }));

  const topCategory = summary?.category_breakdown?.length
    ? summary.category_breakdown.reduce((a, b) => (a.total >= b.total ? a : b))
    : null;

  const categoryTable = (summary?.category_breakdown || []).map((c) => ({
    ...c,
    pct: totalExp > 0 ? Math.round((c.total / totalExp) * 100) : 0,
  }));

  return (
    <div className={`space-y-8 ${isDark ? '' : 'bg-slate-50'}`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl md:text-3xl font-semibold ${isDark ? 'text-foreground' : 'text-slate-900'}`}>Dashboard</h1>
          <p className={`mt-1 ${isDark ? 'text-sm text-muted-foreground md:text-base' : 'text-sm text-slate-500 md:text-base'}`}>
            Overview of your spending — switch month to compare
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            aria-label="Select month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className={`rounded-lg border ${isDark ? 'border-border bg-background text-foreground' : 'border-slate-200 bg-white text-slate-900'} px-3 py-2 text-sm focus:outline-none focus:ring-1 ${isDark ? 'focus:ring-foreground/20' : 'focus:ring-slate-300'}`}
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
        <Card className={`${isDark ? '' : 'bg-white border-slate-200 shadow-sm'}`}>
          <CardHeader>
            <CardTitle className={isDark ? '' : 'text-slate-900'}>Budget progress</CardTitle>
            <CardDescription className={isDark ? '' : 'text-slate-500'}>
              {formatCurrency(total, currency)} of {formatCurrency(monthlyBudget, currency)} this month
            </CardDescription>
          </CardHeader>
          <div className="space-y-2">
            <div className={`h-3 rounded-full ${isDark ? 'bg-muted' : 'bg-slate-100'} overflow-hidden`}>
              <motion.div
                className={`h-full rounded-full ${isOverBudget ? 'bg-red-500' : budgetUsage >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, budgetUsage)}%` }}
                transition={{ duration: 0.6 }}
              />
            </div>
            {isOverBudget && (
              <p className="text-sm text-red-600 dark:text-red-400">
                Over budget by {formatCurrency(total - monthlyBudget, currency)}
              </p>
            )}
            {!isOverBudget && budgetUsage >= 80 && budgetUsage <= 100 && (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Approaching your monthly budget
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Summary + Trend + Quick stats */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5 items-stretch">
        <Card className={`h-full ${isDark ? '' : 'bg-white border-slate-200 shadow-sm'}`}>
          <CardHeader>
            <CardTitle className={isDark ? '' : 'text-slate-900'}>Total expenses</CardTitle>
            <CardDescription className={isDark ? '' : 'text-slate-500'}>This month</CardDescription>
          </CardHeader>
          <p className={`text-3xl font-semibold ${isDark ? 'text-foreground' : 'text-slate-900'}`}>
            {formatCurrency(totalExp, currency)}
          </p>
        </Card>
        <Card className={`h-full ${isDark ? '' : 'bg-white border-slate-200 shadow-sm'}`}>
          <CardHeader>
            <CardTitle className={isDark ? '' : 'text-slate-900'}>Subscriptions</CardTitle>
            <CardDescription className={isDark ? '' : 'text-slate-500'}>Monthly equivalent</CardDescription>
          </CardHeader>
          <p className={`text-3xl font-semibold ${isDark ? 'text-foreground' : 'text-slate-900'}`}>
            {formatCurrency(totalSub, currency)}
          </p>
        </Card>
        <Card className={`h-full ${isDark ? '' : 'bg-white border-slate-200 shadow-sm'}`}>
          <CardHeader>
            <CardTitle className={isDark ? '' : 'text-slate-900'}>Total spend</CardTitle>
            <CardDescription className={isDark ? '' : 'text-slate-500'}>Expenses + subscriptions</CardDescription>
          </CardHeader>
          <p className={`text-3xl font-semibold ${isDark ? 'text-foreground' : 'text-slate-900'}`}>
            {formatCurrency(total, currency)}
          </p>
        </Card>
        <Card className={`h-full ${isDark ? '' : 'bg-white border-slate-200 shadow-sm'}`}>
          <CardHeader>
            <CardTitle className={isDark ? '' : 'text-slate-900'}>Vs last month</CardTitle>
            <CardDescription className={isDark ? '' : 'text-slate-500'}>Expense trend</CardDescription>
          </CardHeader>
          {trend !== null ? (
            <p
              className={`text-2xl font-semibold ${
                trend > 0 ? 'text-amber-600 dark:text-amber-400' : trend < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
              }`}
            >
              {trend > 0 ? '+' : ''}{trend}%
            </p>
          ) : (
            <p className="text-2xl font-semibold text-muted-foreground">—</p>
          )}
        </Card>
        <Card className={`h-full ${isDark ? '' : 'bg-white border-slate-200 shadow-sm'}`}>
          <CardHeader>
            <CardTitle className={isDark ? '' : 'text-slate-900'}>Avg daily</CardTitle>
            <CardDescription className={isDark ? '' : 'text-slate-500'}>Spend per day</CardDescription>
          </CardHeader>
          <p className={`text-2xl font-semibold ${isDark ? 'text-foreground' : 'text-slate-900'}`}>
            {formatCurrency(avgDaily, currency)}/day
          </p>
          {topCategory && (
            <p className={`mt-1 text-xs ${isDark ? 'text-muted-foreground' : 'text-slate-500'}`}>
              Top: {topCategory.category_name ?? 'Other'}
            </p>
          )}
        </Card>
      </div>

      {/* Category table */}
      {categoryTable.length > 0 && (
        <Card className={`${isDark ? '' : 'bg-white border-slate-200 shadow-sm'}`}>
          <CardHeader>
            <CardTitle className={isDark ? '' : 'text-slate-900'}>Category breakdown</CardTitle>
            <CardDescription className={isDark ? '' : 'text-slate-500'}>Spending by category with share of total</CardDescription>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`text-left ${isDark ? 'text-muted-foreground border-b border-border' : 'text-slate-500 border-b border-slate-200'}`}>
                  <th className="pb-2 pr-4">Category</th>
                  <th className="pb-2 pr-4 text-right">Amount</th>
                  <th className="pb-2 text-right">%</th>
                </tr>
              </thead>
              <tbody>
                {categoryTable.map((row, i) => (
                  <tr key={row.category_id} className={`border-b ${isDark ? 'border-border/60' : 'border-slate-200'}`}>
                    <td className={`py-2 pr-4 ${isDark ? 'text-foreground' : 'text-slate-900'}`}>
                      <span
                        className={`inline-block w-2 h-2 rounded-full mr-2 ${COLORS[i % COLORS.length]}`}
                      />
                      {row.category_name ?? (row.category_id === 'uncategorized' ? 'Other' : row.category_id)}
                    </td>
                    <td className={`py-2 pr-4 text-right ${isDark ? 'text-foreground' : 'text-slate-900 font-semibold'}`}>
                      {formatCurrency(row.total, currency)}
                    </td>
                    <td className={`py-2 text-right ${isDark ? 'text-muted-foreground' : 'text-slate-500'}`}>{row.pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Charts + Insights */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className={`h-full ${isDark ? '' : 'bg-white border-slate-200 shadow-sm'}`}>
          <CardHeader>
            <CardTitle className={isDark ? '' : 'text-slate-900'}>Category distribution</CardTitle>
            <CardDescription className={isDark ? '' : 'text-slate-500'}>Where your money goes</CardDescription>
          </CardHeader>
          {pieData.length > 0 ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => {
                      const key = entry.category_name?.toLowerCase() || '';
                      const colors = resolvedTheme === 'light' ? lightColors : darkColors;
                      const color =
                        categoryColors[key] ||
                        colors[index % colors.length];

                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
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

        <Card className={`h-full ${isDark ? '' : 'bg-white border-slate-200 shadow-sm'}`}>
          <CardHeader>
            <CardTitle className={isDark ? '' : 'text-slate-900'}>Smart insights</CardTitle>
            <CardDescription className={isDark ? '' : 'text-slate-500'}>Data-driven observations</CardDescription>
          </CardHeader>
          <div className="space-y-4">
            {insights.length > 0 ? (
              insights.map((insight) => (
                <motion.div
                  key={insight.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`rounded-lg border p-4 ${isDark ? 'border-neutral-800 bg-neutral-800/30' : 'border-slate-200 bg-white'}`}
                >
                  <h4 className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{insight.title}</h4>
                  <p className={`mt-1 text-sm ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>{insight.description}</p>
                </motion.div>
              ))
            ) : (
              <p className={`text-sm ${isDark ? 'text-muted-foreground' : 'text-slate-500'}`}>
                Add expenses to start receiving personalized insights.
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Expense list with Edit/Delete */}
      <Card className={`${isDark ? '' : 'bg-white border-slate-200 shadow-sm'}`}>
        <CardHeader>
          <CardTitle className={isDark ? '' : 'text-slate-900'}>Expenses</CardTitle>
          <CardDescription className={isDark ? '' : 'text-slate-500'}>
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
