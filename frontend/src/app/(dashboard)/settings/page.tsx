'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';

type User = {
  id: string;
  email: string;
  full_name?: string;
  currency: string;
  monthly_budget: number;
  insight_level: 'basic' | 'advanced';
};

const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'JPY'];

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportMonth, setExportMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [form, setForm] = useState({
    currency: 'USD',
    monthly_budget: 0,
    insight_level: 'basic' as 'basic' | 'advanced'
  });

  useEffect(() => {
    api
      .get<User>('/api/users/me')
      .then((data) => {
        setUser(data);
        setForm({
          currency: data.currency || 'USD',
          monthly_budget: data.monthly_budget ?? 0,
          insight_level: data.insight_level || 'basic'
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/api/users/me', form);
      setUser((u) => (u ? { ...u, ...form } : null));
    } finally {
      setSaving(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/export/expenses?month=${exportMonth}&limit=5000`;
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `spendwise-expenses-${exportMonth}.csv`;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } finally {
      setExporting(false);
    }
  }

  const exportMonthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const value = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    return { value, label };
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-2 border-neutral-600 border-t-white rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Profile & Settings</h1>
        <p className="mt-1 text-neutral-400">
          Manage your account preferences and data
        </p>
      </div>

      <motion.form
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onSubmit={handleSave}
        className="space-y-6"
      >
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-400">Email</label>
              <p className="mt-1 text-white">{user?.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400">Name</label>
              <p className="mt-1 text-white">{user?.full_name || '—'}</p>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>Currency, budget, and insight level</CardDescription>
          </CardHeader>
          <div className="space-y-6">
            <div>
              <label htmlFor="currency" className="block text-sm font-medium text-neutral-400 mb-2">
                Currency
              </label>
              <select
                id="currency"
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                className="w-full max-w-xs rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-3 text-white focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="budget" className="block text-sm font-medium text-neutral-400 mb-2">
                Monthly budget
              </label>
              <input
                id="budget"
                type="number"
                min="0"
                step="0.01"
                value={form.monthly_budget || ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, monthly_budget: parseFloat(e.target.value) || 0 }))
                }
                placeholder="0"
                className="w-full max-w-xs rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-3 text-white placeholder-neutral-500 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
              />
            </div>
            <div>
              <label htmlFor="insight" className="block text-sm font-medium text-neutral-400 mb-2">
                Insight level
              </label>
              <select
                id="insight"
                value={form.insight_level}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    insight_level: e.target.value as 'basic' | 'advanced'
                  }))
                }
                className="w-full max-w-xs rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-3 text-white focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
              >
                <option value="basic">Basic — Summary and high-level trends</option>
                <option value="advanced">Advanced — Detailed patterns and suggestions</option>
              </select>
            </div>
            <Button type="submit" isLoading={saving}>
              Save changes
            </Button>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data export</CardTitle>
            <CardDescription>Download expenses as CSV — choose a month to export</CardDescription>
          </CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={exportMonth}
              onChange={(e) => setExportMonth(e.target.value)}
              className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-white text-sm"
            >
              {exportMonthOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <Button type="button" variant="outline" onClick={handleExport} isLoading={exporting}>
              Export CSV
            </Button>
          </div>
        </Card>
      </motion.form>
    </div>
  );
}
