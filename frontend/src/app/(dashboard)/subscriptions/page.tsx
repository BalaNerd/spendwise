'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { AddSubscriptionForm, type SubscriptionForForm } from '@/components/subscriptions/AddSubscriptionForm';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

type Subscription = SubscriptionForForm & {
  created_at: string;
};

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSubscription, setEditingSubscription] = useState<SubscriptionForForm | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Subscription | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [currency, setCurrency] = useState('INR');

  const refresh = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get<Subscription[]>('/api/subscriptions'),
      api.get<{ currency?: string }>('/api/users/me').catch(() => ({ currency: 'INR' })),
    ])
      .then(([subs, user]) => {
        setSubscriptions(subs);
        setCurrency(user?.currency || 'INR');
      })
      .catch(() => setSubscriptions([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/api/subscriptions/${deleteTarget.id}`);
      setDeleteTarget(null);
      refresh();
    } finally {
      setDeleteLoading(false);
    }
  };

  const monthlyTotal = subscriptions
    .filter((s) => s.is_active)
    .reduce((sum, s) => sum + (s.billing_cycle === 'yearly' ? s.amount / 12 : s.amount), 0);

  const yearlyTotal = subscriptions
    .filter((s) => s.is_active)
    .reduce((sum, s) => sum + (s.billing_cycle === 'monthly' ? s.amount * 12 : s.amount), 0);

  const activeSubs = subscriptions.filter((s) => s.is_active);
  const inactiveSubs = subscriptions.filter((s) => !s.is_active);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-2 border-neutral-600 border-t-white rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Subscription Intelligence</h1>
          <p className="mt-1 text-neutral-400">
            Track recurring services — edit or delete any entry
          </p>
        </div>
        <AddSubscriptionForm
          onSuccess={refresh}
          editingSubscription={editingSubscription}
          setEditingSubscription={setEditingSubscription}
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly cost</CardTitle>
            <CardDescription>All active subscriptions (monthly equivalent)</CardDescription>
          </CardHeader>
          <p className="text-3xl font-semibold text-white">{formatCurrency(monthlyTotal, currency)}</p>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Yearly cost</CardTitle>
            <CardDescription>Annual equivalent</CardDescription>
          </CardHeader>
          <p className="text-3xl font-semibold text-white">{formatCurrency(yearlyTotal, currency)}</p>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active subscriptions</CardTitle>
          <CardDescription>
            {activeSubs.length} subscriptions · Edit or delete to manage
          </CardDescription>
        </CardHeader>
        <div className="space-y-4">
          {activeSubs.length > 0 ? (
            activeSubs.map((sub, i) => {
              const monthlyAmount =
                sub.billing_cycle === 'yearly' ? sub.amount / 12 : sub.amount;
              const daysSinceActivity = sub.last_activity_date
                ? Math.floor(
                    (Date.now() - new Date(sub.last_activity_date).getTime()) /
                      (1000 * 60 * 60 * 24)
                  )
                : null;
              const isLowValue = daysSinceActivity !== null && daysSinceActivity > 30;

              return (
                <motion.div
                  key={sub.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-neutral-800 bg-neutral-800/30 p-4"
                >
                  <div>
                    <h4 className="font-medium text-white">{sub.name}</h4>
                    <p className="text-sm text-neutral-400">
                      {formatCurrency(sub.amount, currency)}/{sub.billing_cycle}
                      {sub.last_activity_date && (
                        <span className="ml-2">
                          · Last activity: {formatDate(sub.last_activity_date)}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-semibold text-white">
                      {formatCurrency(monthlyAmount, currency)}/mo
                    </span>
                    {isLowValue && (
                      <span className="rounded-full bg-amber-500/20 px-2 py-1 text-xs font-medium text-amber-400">
                        Low activity
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setEditingSubscription(sub)}
                      className="rounded px-2 py-1.5 text-sm text-neutral-400 hover:text-white hover:bg-neutral-700"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(sub)}
                      className="rounded px-2 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      Delete
                    </button>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <p className="py-8 text-center text-neutral-500">
              No subscriptions yet. Add your recurring services to track monthly and yearly costs.
            </p>
          )}
        </div>
      </Card>

      {inactiveSubs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Inactive subscriptions</CardTitle>
            <CardDescription>Paused or cancelled — edit to reactivate</CardDescription>
          </CardHeader>
          <div className="space-y-4">
            {inactiveSubs.map((sub) => (
              <div
                key={sub.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-neutral-800 bg-neutral-800/20 p-4 opacity-80"
              >
                <div>
                  <h4 className="font-medium text-neutral-400">{sub.name}</h4>
                  <p className="text-sm text-neutral-500">
                    {formatCurrency(sub.amount, currency)}/{sub.billing_cycle}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingSubscription(sub)}
                    className="rounded px-2 py-1.5 text-sm text-neutral-400 hover:text-white"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(sub)}
                    className="rounded px-2 py-1.5 text-sm text-red-400 hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete subscription"
        message={
          deleteTarget
            ? `Remove "${deleteTarget.name}"? This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteLoading}
      />
    </div>
  );
}
