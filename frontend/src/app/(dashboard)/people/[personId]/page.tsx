'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Settlement } from '@/components/settlements/SettlementCard';
import { AddPaymentModal } from '@/components/settlements/AddPaymentModal';

type PersonLedgerResponse = {
  person_name: string;
  total_given: number;
  total_received: number;
  net_balance: number;
  overdue_count: number;
  settlements: Settlement[];
  payments: Array<{
    id: string;
    settlement_id: string;
    person_name: string;
    type: 'gave' | 'received';
    amount: number;
    paid_at: string;
    note?: string | null;
  }>;
};

export default function PersonPage() {
  const params = useParams<{ personId: string }>();
  const router = useRouter();
  const [data, setData] = useState<PersonLedgerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState('INR');
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedSettlementId, setSelectedSettlementId] = useState<string | null>(null);
  const [selectedSettlementRemaining, setSelectedSettlementRemaining] = useState(0);

  useEffect(() => {
    api
      .get<{ currency?: string }>('users/me')
      .then((u) => setCurrency(u?.currency || 'INR'))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const id = params.personId;
    if (!id) return;
    setLoading(true);
    api
      .get<PersonLedgerResponse>(`people/${id}`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [params.personId]);

  const { totalGiven, totalReceived, netBalance, statusLabel } = useMemo(() => {
    if (!data) {
      return {
        totalGiven: 0,
        totalReceived: 0,
        netBalance: 0,
        statusLabel: '',
      };
    }
    const net = data.net_balance;
    let status = '';
    if (net > 0) status = 'They owe you';
    else if (net < 0) status = 'You owe them';
    else status = 'All settled';

    return {
      totalGiven: data.total_given,
      totalReceived: data.total_received,
      netBalance: net,
      statusLabel: status,
    };
  }, [data]);

  const handleOpenPayment = (settlement: Settlement) => {
    setSelectedSettlementId(settlement.id);
    setSelectedSettlementRemaining(settlement.remaining);
    setPaymentModalOpen(true);
  };

  const refresh = () => {
    const id = params.personId;
    if (!id) return;
    setLoading(true);
    api
      .get<PersonLedgerResponse>(`people/${id}`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-2 border-neutral-600 border-t-white rounded-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-neutral-400 hover:text-white"
        >
          ← Back to settlements
        </button>
        <Card>
          <div className="p-6">
            <h1 className="text-xl font-semibold text-white">Person not found</h1>
            <p className="mt-2 text-neutral-400">
              We couldn&apos;t find any settlements for this person.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <button
        type="button"
        onClick={() => router.back()}
        className="text-sm text-neutral-400 hover:text-white"
      >
        ← Back to settlements
      </button>

      <div>
        <h1 className="text-2xl font-semibold text-white">{data.person_name}</h1>
        <p className="mt-1 text-neutral-400">Personal ledger of all settlements and payments</p>
      </div>

      {/* Top summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-neutral-400">Total Given</CardTitle>
            <p className="text-2xl font-semibold text-green-400 mt-2">
              {formatCurrency(totalGiven, currency)}
            </p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-neutral-400">Total Received</CardTitle>
            <p className="text-2xl font-semibold text-red-400 mt-2">
              {formatCurrency(totalReceived, currency)}
            </p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-neutral-400">Net balance</CardTitle>
            <p
              className={`text-2xl font-semibold mt-2 ${
                netBalance > 0 ? 'text-green-400' : netBalance < 0 ? 'text-red-400' : 'text-neutral-300'
              }`}
            >
              {formatCurrency(Math.abs(netBalance), currency)}{' '}
              <span className="text-sm text-neutral-400 ml-1">
                {netBalance > 0 ? '(They owe you)' : netBalance < 0 ? '(You owe them)' : '(Settled)'}
              </span>
            </p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-neutral-400">Overdue count</CardTitle>
            <p className="text-2xl font-semibold text-amber-400 mt-2">
              {data.overdue_count}
            </p>
          </CardHeader>
        </Card>
      </div>

      {/* Timeline & settlements */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Timeline view */}
        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
            <CardDescription>Chronological history of all payments</CardDescription>
          </CardHeader>
          <div className="mt-4 space-y-3">
            {data.payments.length === 0 ? (
              <p className="text-sm text-neutral-500 px-6 pb-6">
                No payments recorded yet for this person.
              </p>
            ) : (
              <ul className="px-6 pb-6 space-y-3">
                {data.payments.map((p) => (
                  <li key={p.id} className="flex items-start gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-neutral-500" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-neutral-300">
                          {p.type === 'gave' ? 'You received payment' : 'You paid'}
                        </span>
                        <span className="text-xs text-neutral-500">
                          {formatDate(p.paid_at)}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-white">
                        {formatCurrency(p.amount, currency)}
                      </p>
                      {p.note && (
                        <p className="text-xs text-neutral-500 mt-1">{p.note}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {/* Settlement list with progress */}
        <Card>
          <CardHeader>
            <CardTitle>Settlements with {data.person_name}</CardTitle>
            <CardDescription>Track progress and add payments</CardDescription>
          </CardHeader>
          <div className="px-6 pb-6 space-y-3">
            {data.settlements.length === 0 ? (
              <p className="text-sm text-neutral-500">
                No settlements yet. Add one from the Settlements page.
              </p>
            ) : (
              data.settlements.map((s) => {
                const progress =
                  s.total_amount > 0 ? (s.total_paid / s.total_amount) * 100 : 0;
                return (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-white">
                          {s.type === 'gave'
                            ? 'You gave'
                            : 'You received'}{' '}
                          {formatCurrency(s.total_amount, currency)}
                        </p>
                        {s.due_date && (
                          <p className="text-xs text-neutral-500">
                            Due {formatDate(s.due_date)}
                          </p>
                        )}
                      </div>
                      <div className="text-right text-xs text-neutral-400">
                        <p>Paid: {formatCurrency(s.total_paid, currency)}</p>
                        <p>Remaining: {formatCurrency(s.remaining, currency)}</p>
                      </div>
                    </div>
                    <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.4 }}
                        className={`h-full ${
                          s.status === 'completed'
                            ? 'bg-green-500'
                            : s.status === 'overdue'
                            ? 'bg-red-500'
                            : 'bg-blue-500'
                        }`}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-neutral-500">
                      <span className="capitalize">{s.status.replace('_', ' ')}</span>
                      {s.status !== 'completed' && (
                        <button
                          type="button"
                          onClick={() => handleOpenPayment(s)}
                          className="text-xs text-neutral-300 hover:text-white"
                        >
                          Add payment
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      <AddPaymentModal
        open={paymentModalOpen}
        settlementId={selectedSettlementId}
        settlementRemaining={selectedSettlementRemaining}
        currency={currency}
        onClose={() => {
          setPaymentModalOpen(false);
          setSelectedSettlementId(null);
        }}
        onSuccess={refresh}
      />
    </div>
  );
}

