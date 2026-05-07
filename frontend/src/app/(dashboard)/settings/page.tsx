'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api, fetchApi } from '@/lib/api';
import { usePreferences } from '@/components/providers/PreferencesProvider';
import { useToast } from '@/components/providers/ToastProvider';

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
  const { preferences, loading: prefsLoading, setPreferences } = usePreferences();
  const { toast } = useToast();
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
    if (preferences) {
      setUser((u) =>
        u
          ? { ...u, ...preferences }
          : ({
              id: '',
              email: preferences.email || '',
              full_name: preferences.full_name,
              currency: preferences.currency,
              monthly_budget: preferences.monthly_budget,
              insight_level: preferences.insight_level,
            } as User)
      );
      setForm({
        currency: preferences.currency || 'USD',
        monthly_budget: preferences.monthly_budget ?? 0,
        insight_level: preferences.insight_level || 'basic',
      });
      setLoading(false);
    } else if (!prefsLoading) {
      setLoading(false);
    }
  }, [preferences, prefsLoading]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      await api.patch('users/me', form);
      setUser((u) => (u ? { ...u, ...form } : null));
      if (preferences) {
        setPreferences({
          ...preferences,
          currency: form.currency,
          monthly_budget: form.monthly_budget,
          insight_level: form.insight_level,
        });
      }
      toast({ kind: 'success', title: 'Saved', message: 'Your preferences were updated.' });
    } catch (error: any) {
      toast({ 
        kind: 'error', 
        title: 'Save failed', 
        message: error.message || 'Failed to update preferences' 
      });
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

      // Fetch expenses data for the report using API client
      const expensesData = await api.get(`expenses?month=${exportMonth}&limit=5000`);
      const expenses = Array.isArray(expensesData) ? expensesData : [];

      // Transform expenses data to match backend format
      const transactions = expenses.map((expense: any) => ({
        date: expense.date,
        amount: Number(expense.amount) || 0,
        category: expense.expense_categories?.name || 'Uncategorized',
        type: expense.recurring ? 'subscription' : 'expense',
        recurring: expense.recurring || false
      }));

      // Calculate previous month for growth comparison
      const currentDate = new Date(exportMonth + '-01');
      const previousMonth = new Date(currentDate);
      previousMonth.setMonth(previousMonth.getMonth() - 1);
      const previousMonthStr = previousMonth.toISOString().slice(0, 7);

      // Prepare export options
      const exportOptions = {
        monthlyBudget: user?.monthly_budget || 0,
        netSettlementPosition: 0, // You can calculate this if needed
        currentMonth: exportMonth,
        previousMonth: previousMonthStr
      };

      const exportRes = (await fetchApi('export/enhanced', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: JSON.stringify({ transactions, options: exportOptions }),
      })) as Response;
      
      if (!exportRes.ok) {
        const errorText = await exportRes.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        throw new Error(errorData.error || 'Failed to generate Excel report');
      }

      // Generate filename
      const date = new Date(exportMonth + '-01');
      const monthName = date.toLocaleDateString('en-US', { month: 'long' });
      const year = date.getFullYear();
      const filename = `SpendWise_Report_${monthName}_${year}.xlsx`;
      
      // Download the file
      try {
        const blob = await exportRes.blob();
        
        // Validate blob
        if (!blob || blob.size === 0) {
          throw new Error('Received empty Excel file from server');
        }
        
        const blobUrl = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        
        // Trigger download
        a.click();
        
        // Cleanup after a short delay
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(blobUrl);
        }, 100);
      } catch (blobError: any) {
        throw new Error('Failed to create or download Excel file: ' + blobError.message);
      }

      toast({
        kind: 'success',
        title: 'Export successful',
        message: `Financial report for ${monthName} ${year} has been downloaded`
      });

    } catch (error: any) {
      toast({
        kind: 'error',
        title: 'Export failed',
        message: error.message || 'Failed to generate financial report'
      });
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
        <div className="animate-spin h-8 w-8 border-2 border-border border-t-foreground rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold text-foreground">Profile & Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground md:text-base">
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
              <label className="block text-sm font-medium text-muted-foreground">Email</label>
              <p className="mt-1 text-foreground">{user?.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground">Name</label>
              <p className="mt-1 text-foreground">{user?.full_name || '—'}</p>
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
              <label htmlFor="currency" className="block text-sm font-medium text-muted-foreground mb-2">
                Currency
              </label>
              <select
                id="currency"
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                className="w-full max-w-xs rounded-lg border border-border bg-background px-4 py-3 text-foreground focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="budget" className="block text-sm font-medium text-muted-foreground mb-2">
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
                className="w-full max-w-xs rounded-lg border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20"
              />
            </div>
            <div>
              <label htmlFor="insight" className="block text-sm font-medium text-muted-foreground mb-2">
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
                className="w-full max-w-xs rounded-lg border border-border bg-background px-4 py-3 text-foreground focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20"
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
            <CardDescription>Download financial report as XLSX — choose a month to export</CardDescription>
          </CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <select
              aria-label="Select export month"
              value={exportMonth}
              onChange={(e) => setExportMonth(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-foreground/20"
            >
              {exportMonthOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <Button type="button" variant="outline" onClick={handleExport} isLoading={exporting}>
              Export XLSX Report
            </Button>
          </div>
        </Card>
      </motion.form>
    </div>
  );
}
