'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar, Cell } from 'recharts';
import { useTheme } from 'next-themes';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { usePreferences } from '@/components/providers/PreferencesProvider';
import { formatCurrency } from '@/lib/utils';
import { SkeletonCard, SkeletonChart } from '@/components/ui/Skeleton';

type InsightsV2 = {
  level: 'basic' | 'advanced';
  currency: string;
  current_month: string;
  previous_month: string;
  current_spend: number;
  previous_spend: number;
  growth_pct: number | null;
  budget: {
    monthly_budget: number;
    usage_pct: number | null;
  };
  trend: Array<{ month: string; total_expenses: number; total: number }>;
  categories: Array<{ category_id: string; category_name: string; total: number; share_pct: number }>;
  top_category: { category_id: string; category_name: string; total: number; share_pct: number } | null;
  settlement_impact: { total_to_receive: number; total_to_pay: number; net_position: number };
  behavioral: Array<{ id: string; title: string; description: string }>;
};

export default function InsightsPage() {
  const { preferences, loading: prefsLoading } = usePreferences();
  const { resolvedTheme } = useTheme();
  const [data, setData] = useState<InsightsV2 | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const level = (preferences?.insight_level || 'basic') as 'basic' | 'advanced';
    setLoading(true);
    api
      .get<InsightsV2>(`insights?level=${level}`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [preferences?.insight_level]);

  const currency = preferences?.currency || data?.currency || 'USD';
  const level = (preferences?.insight_level || data?.level || 'basic') as 'basic' | 'advanced';
  const isDark = resolvedTheme === 'dark';

  const budgetUsage = data?.budget?.usage_pct ?? null;
  const budgetColor =
    budgetUsage === null
      ? 'bg-muted'
      : budgetUsage < 60
      ? 'bg-emerald-500'
      : budgetUsage <= 90
      ? 'bg-amber-500'
      : 'bg-red-500';

  const palette = useMemo(
    () => (isDark ? ['#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#ef4444', '#14b8a6'] : ['#16a34a', '#2563eb', '#7c3aed', '#d97706', '#dc2626', '#0d9488']),
    [isDark]
  );

  // Fixed vibrant colors (work in both themes)
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

  const chartAxis = 'hsl(var(--muted-foreground))';
  const chartGrid = 'hsl(var(--border))';
  const chartLine = 'hsl(var(--foreground))';

  if (loading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted animate-pulse rounded-md"></div>
            <div className="h-4 w-64 bg-muted animate-pulse rounded-md"></div>
          </div>
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

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
      <div>
        <h1 className={`text-2xl md:text-3xl font-semibold ${isDark ? 'text-foreground' : 'text-slate-900'}`}>Insights</h1>
        <p className={`mt-1 ${isDark ? 'text-sm text-muted-foreground md:text-base' : 'text-sm text-slate-500 md:text-base'}`}>
          Your financial intelligence dashboard — trends, categories, budget, and settlements
        </p>
        <div className={`mt-3 inline-flex items-center gap-2 rounded-full border ${isDark ? 'border-border bg-card/70 text-muted-foreground' : 'border-slate-200 bg-white text-slate-600'} px-3 py-1 text-xs`}>
          Viewing: <span className={`font-medium ${isDark ? 'text-foreground' : 'text-slate-800'}`}>{level === 'advanced' ? 'Advanced Intelligence' : 'Basic Mode'}</span>
        </div>
      </div>

      {!data ? (
        <Card className={`${isDark ? 'border-dashed' : 'border-dashed border-slate-300 bg-white shadow-sm'} ${!isDark ? 'hover:shadow-md transition-shadow duration-200' : ''}`}>
          <div className="py-14 px-6 text-center">
            <div className={`mx-auto w-14 h-14 rounded-full ${isDark ? 'bg-accent' : 'bg-slate-100'} flex items-center justify-center ${isDark ? 'text-muted-foreground' : 'text-slate-500'} mb-4`}>
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className={`text-lg font-medium ${isDark ? 'text-foreground' : 'text-slate-800'}`}>No insights yet</h3>
            <p className={`mt-2 ${isDark ? 'text-muted-foreground' : 'text-slate-500'} max-w-sm mx-auto`}>
              Add expenses to see monthly trends, category intelligence, budget usage, and settlement impact.
            </p>
          </div>
        </Card>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5 items-stretch">
            <Card className={`h-full ${isDark ? '' : 'bg-white border-slate-200 shadow-sm'}`}>
              <CardHeader>
                <CardTitle className={isDark ? '' : 'text-slate-900'}>Current month spend</CardTitle>
                <CardDescription className={isDark ? '' : 'text-slate-500'}>{new Date(data.current_month + '-01').toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</CardDescription>
              </CardHeader>
              <p className={`text-3xl font-semibold ${isDark ? 'text-foreground' : 'text-slate-900'}`}>
                {formatCurrency(data.current_spend, currency)}
              </p>
            </Card>
            <Card className={`h-full ${isDark ? '' : 'bg-white border-slate-200 shadow-sm'}`}>
              <CardHeader>
                <CardTitle className={isDark ? '' : 'text-slate-900'}>Previous month</CardTitle>
                <CardDescription className={isDark ? '' : 'text-slate-500'}>{new Date(data.previous_month + '-01').toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</CardDescription>
              </CardHeader>
              <p className={`text-3xl font-semibold ${isDark ? 'text-foreground' : 'text-slate-900'}`}>
                {formatCurrency(data.previous_spend, currency)}
              </p>
            </Card>
            <Card className={`h-full ${isDark ? '' : 'bg-white border-slate-200 shadow-sm'}`}>
              <CardHeader>
                <CardTitle className={isDark ? '' : 'text-slate-900'}>Growth %</CardTitle>
                <CardDescription className={isDark ? '' : 'text-slate-500'}>Vs previous month</CardDescription>
              </CardHeader>
              <p className={`text-3xl font-semibold ${data.growth_pct === null ? 'text-muted-foreground' : data.growth_pct > 0 ? 'text-amber-400' : data.growth_pct < 0 ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                {data.growth_pct === null ? '—' : `${data.growth_pct > 0 ? '+' : ''}${data.growth_pct}%`}
              </p>
            </Card>
            <Card className={`h-full ${isDark ? '' : 'bg-white border-slate-200 shadow-sm'}`}>
              <CardHeader>
                <CardTitle className={isDark ? '' : 'text-slate-900'}>Net settlement position</CardTitle>
                <CardDescription className={isDark ? '' : 'text-slate-500'}>
                  {data.settlement_impact.net_position >= 0 ? 'You are net owed' : 'You net owe'}
                </CardDescription>
              </CardHeader>
              <p className={`text-3xl font-semibold ${isDark ? 'text-foreground' : 'text-slate-900'} ${data.settlement_impact.net_position >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(Math.abs(data.settlement_impact.net_position), currency)}
              </p>
            </Card>
            <Card className={`h-full ${isDark ? '' : 'bg-white border-slate-200 shadow-sm'}`}>
              <CardHeader>
                <CardTitle className={isDark ? '' : 'text-slate-900'}>Budget usage</CardTitle>
                <CardDescription className={isDark ? '' : 'text-slate-500'}>
                  {data.budget.monthly_budget > 0 ? 'of monthly budget' : 'No budget set'}
                </CardDescription>
              </CardHeader>
              <p className={`text-3xl font-semibold ${budgetUsage === null ? 'text-muted-foreground' : budgetUsage < 60 ? 'text-emerald-400' : budgetUsage <= 90 ? 'text-amber-400' : 'text-red-400'}`}>
                {budgetUsage === null ? '—' : `${Math.round(budgetUsage)}%`}
              </p>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className={`h-full ${isDark ? '' : 'bg-white border-slate-200 shadow-sm'}`}>
              <CardHeader>
                <CardTitle className={isDark ? '' : 'text-slate-900'}>Monthly spend trend</CardTitle>
                <CardDescription className={isDark ? '' : 'text-slate-500'}>Last 6 months (expenses + subscriptions)</CardDescription>
              </CardHeader>
              <div className="h-[280px] sm:h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.trend} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                    <XAxis
                      dataKey="month"
                      tick={{ fill: chartAxis, fontSize: 12 }}
                      tickFormatter={(m: string) => new Date(m + '-01').toLocaleDateString(undefined, { month: 'short' })}
                      axisLine={{ stroke: chartGrid }}
                      tickLine={{ stroke: chartGrid }}
                    />
                    <YAxis
                      tick={{ fill: chartAxis, fontSize: 12 }}
                      axisLine={{ stroke: chartGrid }}
                      tickLine={{ stroke: chartGrid }}
                      width={52}
                      tickFormatter={(v: number) => `${Math.round(v)}`}
                    />
                    <Tooltip
                      formatter={(v: number) => formatCurrency(Number(v), currency)}
                      labelFormatter={(l: string) => new Date(l + '-01').toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                      contentStyle={{
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 12,
                        color: 'hsl(var(--foreground))',
                      }}
                    />
                    <Line type="monotone" dataKey="total" stroke={chartLine} strokeWidth={2.2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className={`h-full flex flex-col ${isDark ? '' : 'bg-white border-slate-200 shadow-sm'}`}>
              <CardHeader className="pb-4">
                <CardTitle className={isDark ? '' : 'text-slate-900'}>Category distribution</CardTitle>
                <CardDescription className={isDark ? '' : 'text-slate-500'}>Share of expense spend this month</CardDescription>
              </CardHeader>
              <div className={`flex-1 flex flex-col items-center justify-center p-6 ${isDark ? '' : 'bg-white'}`}>
                {data.categories.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                    Not enough data yet.
                  </div>
                ) : (
                  <>
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.categories.slice(0, 6)} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                          <XAxis
                            dataKey="category_name"
                            tick={{ fill: chartAxis, fontSize: 11 }}
                            angle={-45}
                            textAnchor="end"
                            height={60}
                            axisLine={{ stroke: chartGrid }}
                            tickLine={{ stroke: chartGrid }}
                          />
                          <YAxis
                            tick={{ fill: chartAxis, fontSize: 12 }}
                            axisLine={{ stroke: chartGrid }}
                            tickLine={{ stroke: chartGrid }}
                            width={40}
                            tickFormatter={(v: number) => `${Math.round(v)}%`}
                          />
                          <Tooltip
                            formatter={(v: number, name: string) => [`${Math.round(v)}%`, name]}
                            contentStyle={{
                              background: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: 8,
                              color: 'hsl(var(--foreground))',
                            }}
                          />
                          <Bar dataKey="share_pct" radius={[4, 4, 0, 0]}>
                            {data.categories.slice(0, 6).map((entry, index) => {
                              const key = entry.category_name.toLowerCase();
                              const color =
                                categoryColors[key] ||
                                fallbackColors[index % fallbackColors.length];

                              return <Cell key={`cell-${index}`} fill={color} />;
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-6 w-full">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        {data.categories.slice(0, 6).map((category, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full flex-shrink-0" 
                              style={{ 
                                backgroundColor:
                                  categoryColors[category.category_name.toLowerCase()] ||
                                  fallbackColors[i % fallbackColors.length]
                              }}
                            />
                            <span className="text-muted-foreground truncate">
                              {category.category_name}
                            </span>
                            <span className="text-foreground font-medium ml-auto">
                              {Math.round(category.share_pct)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </Card>
          </div>

          {/* Budget usage */}
          <Card className={`${isDark ? '' : 'bg-white border-slate-200 shadow-sm'}`}>
            <CardHeader>
              <CardTitle className={isDark ? '' : 'text-slate-900'}>Budget usage</CardTitle>
              <CardDescription className={isDark ? '' : 'text-slate-500'}>
                {data.budget.monthly_budget > 0
                  ? `${formatCurrency(data.current_spend, currency)} of ${formatCurrency(data.budget.monthly_budget, currency)}`
                  : 'Set a monthly budget in Settings to track usage.'}
              </CardDescription>
            </CardHeader>
            {data.budget.monthly_budget > 0 && (
              <div className="space-y-2">
                <div className={`h-3 rounded-full ${isDark ? 'bg-muted' : 'bg-slate-100'} overflow-hidden`}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, data.budget.usage_pct || 0)}%` }}
                    transition={{ duration: 0.5 }}
                    className={`h-full rounded-full ${budgetColor}`}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  {data.budget.usage_pct === null ? '—' : `${Math.round(data.budget.usage_pct)}% used`}
                </p>
              </div>
            )}
          </Card>

          {/* Settlement impact */}
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-3">
            <Card className={`${isDark ? '' : 'bg-white border-slate-200 shadow-sm'}`}>
              <CardHeader>
                <CardTitle className={`text-sm font-medium ${isDark ? 'text-muted-foreground' : 'text-slate-700'}`}>Total to receive</CardTitle>
                <p className="text-2xl font-semibold text-emerald-500 mt-2">
                  {formatCurrency(data.settlement_impact.total_to_receive, currency)}
                </p>
              </CardHeader>
            </Card>
            <Card className={`${isDark ? '' : 'bg-white border-slate-200 shadow-sm'}`}>
              <CardHeader>
                <CardTitle className={`text-sm font-medium ${isDark ? 'text-muted-foreground' : 'text-slate-700'}`}>Total to pay</CardTitle>
                <p className="text-2xl font-semibold text-red-500 mt-2">
                  {formatCurrency(data.settlement_impact.total_to_pay, currency)}
                </p>
              </CardHeader>
            </Card>
            <Card className={`${isDark ? '' : 'bg-white border-slate-200 shadow-sm'}`}>
              <CardHeader>
                <CardTitle className={`text-sm font-medium ${isDark ? 'text-muted-foreground' : 'text-slate-700'}`}>Net cashflow impact</CardTitle>
                <p className={`text-2xl font-semibold mt-2 ${data.settlement_impact.net_position >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {formatCurrency(Math.abs(data.settlement_impact.net_position), currency)}
                </p>
              </CardHeader>
            </Card>
          </div>

          {/* Behavioral insights (advanced only) */}
          {level === 'advanced' && data.behavioral.length > 0 && (
            <Card className={`${isDark ? '' : 'bg-white border-slate-200 shadow-sm'}`}>
              <CardHeader>
                <CardTitle className={isDark ? '' : 'text-slate-900'}>Behavioral statements</CardTitle>
                <CardDescription className={isDark ? '' : 'text-slate-500'}>Rule-based insights based on your recent patterns</CardDescription>
              </CardHeader>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {data.behavioral.map((b, i) => (
                  <motion.div
                    key={b.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`rounded-lg border ${isDark ? 'border-border bg-card/60' : 'border-slate-300 bg-slate-100'} p-4 transition-all duration-300 ${isDark ? '' : 'hover:bg-accent/40'}`}
                  >
                    <p className="font-medium text-foreground">{b.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{b.description}</p>
                  </motion.div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </motion.div>
  );
}
