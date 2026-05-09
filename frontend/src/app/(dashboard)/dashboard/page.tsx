'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { AddExpenseForm } from '@/components/expenses/AddExpenseForm';
import { ExpenseList } from '@/components/expenses/ExpenseList';
import { SkeletonCard, SkeletonChart } from '@/components/ui/Skeleton';
import { fetchApi } from '@/lib/api';
import { formatCurrency, percentChange, cn } from '@/lib/utils';
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
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted animate-pulse rounded-md"></div>
            <div className="h-4 w-64 bg-muted animate-pulse rounded-md"></div>
          </div>
          <div className="h-10 w-32 bg-muted animate-pulse rounded-md"></div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <SkeletonChart height={280} />
          <SkeletonChart height={280} />
        </div>
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
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
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
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-xl font-bold tracking-tight">Budget Progress</CardTitle>
            <CardDescription>
              {formatCurrency(total, currency)} of {formatCurrency(monthlyBudget, currency)} this month
            </CardDescription>
          </CardHeader>
          <div className="space-y-3">
            <div className={`h-4 rounded-full ${isDark ? 'bg-muted/30' : 'bg-slate-200/50'} overflow-hidden p-0.5 border border-border/10`}>
              <motion.div
                className={`h-full rounded-full ${isOverBudget ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : budgetUsage >= 80 ? 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)]' : 'bg-primary shadow-[0_0_15px_rgba(16,185,129,0.4)]'}`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, budgetUsage)}%` }}
                transition={{ duration: 1, ease: "circOut" }}
              />
            </div>
            <div className="flex justify-between items-center">
              {isOverBudget ? (
                <p className="text-sm font-semibold text-red-500 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  Over budget by {formatCurrency(total - monthlyBudget, currency)}
                </p>
              ) : budgetUsage >= 80 ? (
                <p className="text-sm font-semibold text-amber-500 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  Approaching budget limit
                </p>
              ) : (
                <p className="text-sm font-medium text-muted-foreground italic">
                  Keep it up! You are within your budget.
                </p>
              )}
              <span className="text-xs font-bold px-2 py-1 rounded-md bg-primary/10 text-primary">
                {Math.round(budgetUsage)}%
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Summary Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { title: 'Total Expenses', value: formatCurrency(totalExp, currency), desc: 'Direct spending', delay: 0.1 },
          { title: 'Subscriptions', value: formatCurrency(totalSub, currency), desc: 'Fixed monthly', delay: 0.2 },
          { title: 'Total Outflow', value: formatCurrency(total, currency), desc: 'Combined total', delay: 0.3, highlight: true },
          { title: 'Trend', value: trend !== null ? `${trend > 0 ? '+' : ''}${trend}%` : '—', desc: 'Vs last month', delay: 0.4, trend: true },
          { title: 'Daily Average', value: formatCurrency(avgDaily, currency), desc: 'Burn rate', delay: 0.5 },
        ].map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: stat.delay, duration: 0.4 }}
          >
            <Card className={cn("glass-card h-full flex flex-col justify-between", stat.highlight && "border-primary/30 bg-primary/5")}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{stat.title}</CardTitle>
              </CardHeader>
              <div className="px-6 pb-6">
                <p className={cn(
                  "text-2xl font-black tracking-tight",
                  stat.trend && trend !== null && (trend > 0 ? 'text-amber-500' : 'text-primary'),
                  stat.highlight && "text-primary"
                )}>
                  {stat.value}
                </p>
                <p className="text-[10px] mt-1 font-medium text-muted-foreground/70">{stat.desc}</p>
              </div>
            </Card>
          </motion.div>
        ))}
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
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}>
          <Card className="glass-card h-full">
            <CardHeader>
              <CardTitle className="text-xl font-bold">Category Distribution</CardTitle>
              <CardDescription>Where your money goes</CardDescription>
            </CardHeader>
            {pieData.length > 0 ? (
              <div className="h-[300px] mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={110}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => {
                        const key = entry.category_name?.toLowerCase() || '';
                        const color = categoryColors[key] || fallbackColors[index % fallbackColors.length];
                        return <Cell key={`cell-${index}`} fill={color} className="hover:opacity-80 transition-opacity cursor-pointer" />;
                      })}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(v: number) => [formatCurrency(v, currency), 'Total']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground italic">
                No category data yet.
              </div>
            )}
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 }}>
          <Card className="glass-card h-full">
            <CardHeader>
              <CardTitle className="text-xl font-bold">Smart Insights</CardTitle>
              <CardDescription>Data-driven observations</CardDescription>
            </CardHeader>
            <div className="space-y-4 mt-4">
              {insights.length > 0 ? (
                insights.map((insight, idx) => (
                  <motion.div
                    key={insight.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 + idx * 0.1 }}
                    className="group rounded-xl border border-border/10 bg-primary/5 p-4 hover:bg-primary/10 transition-all duration-300"
                  >
                    <h4 className="font-bold text-foreground group-hover:text-primary transition-colors">{insight.title}</h4>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{insight.description}</p>
                  </motion.div>
                ))
              ) : (
                <div className="py-12 text-center">
                  <p className="text-sm text-muted-foreground italic">
                    Add expenses to unlock personalized insights.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </motion.div>
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
    </motion.div>
  );
}
