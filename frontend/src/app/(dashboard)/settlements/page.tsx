'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { SettlementList } from '@/components/settlements/SettlementList';
import { AddSettlementForm } from '@/components/settlements/AddSettlementForm';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { Settlement } from '@/components/settlements/SettlementCard';
import { motion } from 'framer-motion';

type Filter = 'all' | 'gave' | 'received' | 'completed' | 'overdue';

export default function SettlementsPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const [refreshKey, setRefreshKey] = useState(0);
  const [currency, setCurrency] = useState('INR');
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [editingSettlement, setEditingSettlement] = useState<Settlement | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    api.get<{ currency?: string }>('users/me').then((u) => setCurrency(u?.currency || 'INR')).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .get<Settlement[]>('settlements')
      .then(setSettlements)
      .catch(() => setSettlements([]))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  // Calculate summary metrics
  const summary = useMemo(() => {
    const gave = settlements.filter((s) => s.type === 'gave');
    const received = settlements.filter((s) => s.type === 'received');

    const totalToReceive = gave.reduce((sum, s) => sum + s.remaining, 0);
    const totalToPay = received.reduce((sum, s) => sum + s.remaining, 0);
    const netPosition = totalToReceive - totalToPay;

    return {
      totalToReceive,
      totalToPay,
      netPosition,
    };
  }, [settlements]);

  // Calculate person-level net balances
  const personBalances = useMemo(() => {
    const balances: Record<string, { gave: number; received: number; net: number }> = {};

    settlements.forEach((s) => {
      if (!balances[s.person_name]) {
        balances[s.person_name] = { gave: 0, received: 0, net: 0 };
      }
      if (s.type === 'gave') {
        balances[s.person_name].gave += s.remaining;
      } else {
        balances[s.person_name].received += s.remaining;
      }
    });

    Object.keys(balances).forEach((person) => {
      balances[person].net = balances[person].gave - balances[person].received;
    });

    return balances;
  }, [settlements]);

  const tabs: Array<{ value: Filter; label: string; count?: number }> = [
    { value: 'all', label: 'All', count: settlements.length },
    { value: 'gave', label: 'I Gave', count: settlements.filter((s) => s.type === 'gave').length },
    { value: 'received', label: 'I Received', count: settlements.filter((s) => s.type === 'received').length },
    { value: 'completed', label: 'Completed', count: settlements.filter((s) => s.status === 'completed').length },
    { value: 'overdue', label: 'Overdue', count: settlements.filter((s) => s.status === 'overdue').length },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground">Settlements</h1>
          <p className="mt-1 text-sm text-muted-foreground md:text-base">
            Track money you gave to someone or received from someone
          </p>
        </div>
        <AddSettlementForm
          editingSettlement={editingSettlement}
          setEditingSettlement={setEditingSettlement}
          onSuccess={() => {
            setRefreshKey((k) => k + 1);
            setEditingSettlement(null);
          }}
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Total To Receive</CardTitle>
              <p className="text-2xl font-semibold text-green-400 mt-2">
                {formatCurrency(summary.totalToReceive, currency)}
              </p>
            </CardHeader>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Total To Pay</CardTitle>
              <p className="text-2xl font-semibold text-red-400 mt-2">
                {formatCurrency(summary.totalToPay, currency)}
              </p>
            </CardHeader>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Net Position</CardTitle>
              <p
                className={`text-2xl font-semibold mt-2 ${
                  summary.netPosition >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {formatCurrency(Math.abs(summary.netPosition), currency)}
                {summary.netPosition >= 0 ? ' (You are owed)' : ' (You owe)'}
              </p>
            </CardHeader>
          </Card>
        </motion.div>
      </div>

      {/* Person-level Net Balances */}
      {Object.keys(personBalances).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Person Balances</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Net balance per person (mutual settlements netted)
            </p>
          </CardHeader>
          <div className="mt-4 space-y-2">
            {Object.entries(personBalances)
              .filter(([, balance]) => balance.net !== 0)
              .sort((a, b) => Math.abs(b[1].net) - Math.abs(a[1].net))
              .map(([person, balance]) => {
                const personId = encodeURIComponent(person);
                return (
                  <button
                    key={person}
                    type="button"
                    onClick={() => router.push(`/people/${personId}`)}
                    className="flex w-full items-center justify-between rounded-lg border border-border bg-card/70 px-4 py-3 hover:border-border/80 hover:bg-accent/60 transition-colors text-left"
                  >
                    <span className="font-medium text-foreground underline-offset-2 hover:underline">
                      {person}
                    </span>
                    <span
                      className={`font-semibold ${
                        balance.net >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {balance.net >= 0 ? '+' : '-'}
                      {formatCurrency(Math.abs(balance.net), currency)}
                    </span>
                  </button>
                );
              })}
            {Object.values(personBalances).every((b) => b.net === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">
                All balances are settled
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap border-b-2 ${
                filter === tab.value
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-2 px-1.5 py-0.5 rounded text-xs bg-muted">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Settlement List */}
      <Card>
        <SettlementList
          filter={filter}
          refreshKey={refreshKey}
          onRefresh={() => setRefreshKey((k) => k + 1)}
          currency={currency}
          onEdit={setEditingSettlement}
        />
      </Card>
    </div>
  );
}
