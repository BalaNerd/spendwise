'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { SettlementCard, type Settlement } from './SettlementCard';
import { AddPaymentModal } from './AddPaymentModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { formatCurrency } from '@/lib/utils';

type SettlementListProps = {
  filter?: 'all' | 'gave' | 'received' | 'completed' | 'overdue';
  refreshKey?: number;
  onRefresh: () => void;
  currency?: string;
  onEdit: (settlement: Settlement) => void;
};

export function SettlementList({
  filter = 'all',
  refreshKey = 0,
  onRefresh,
  currency = 'INR',
  onEdit,
}: SettlementListProps) {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedSettlementId, setSelectedSettlementId] = useState<string | null>(null);
  const [selectedSettlementRemaining, setSelectedSettlementRemaining] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<Settlement | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadSettlements = useCallback(() => {
    setLoading(true);
    api
      .get<Settlement[]>('settlements')
      .then(setSettlements)
      .catch(() => setSettlements([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadSettlements();
  }, [loadSettlements, refreshKey]);

  const handleAddPayment = (settlementId: string) => {
    const settlement = settlements.find((s) => s.id === settlementId);
    if (settlement) {
      setSelectedSettlementId(settlementId);
      setSelectedSettlementRemaining(settlement.remaining);
      setPaymentModalOpen(true);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api.delete(`settlements/${deleteTarget.id}`);
      setDeleteTarget(null);
      loadSettlements();
      onRefresh();
    } catch (err) {
      console.error('Error deleting settlement:', err);
      alert('Failed to delete settlement');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filtered = settlements.filter((s) => {
    if (filter === 'all') return true;
    if (filter === 'gave') return s.type === 'gave';
    if (filter === 'received') return s.type === 'received';
    if (filter === 'completed') return s.status === 'completed';
    if (filter === 'overdue') return s.status === 'overdue';
    return true;
  });

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-2 border-neutral-600 border-t-white rounded-full" />
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <p className="py-12 text-center text-neutral-500 text-sm">
        {filter === 'all'
          ? 'No settlements yet. Add one to get started.'
          : `No ${filter} settlements.`}
      </p>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((settlement, i) => (
          <SettlementCard
            key={settlement.id}
            settlement={settlement}
            currency={currency}
            onAddPayment={handleAddPayment}
            onEdit={onEdit}
            onDelete={(id) => {
              const s = settlements.find((sett) => sett.id === id);
              if (s) setDeleteTarget(s);
            }}
          />
        ))}
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
        onSuccess={() => {
          loadSettlements();
          onRefresh();
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Settlement"
        message={
          deleteTarget
            ? `Delete settlement with ${deleteTarget.person_name}? This will also delete all associated payments. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteLoading}
      />
    </>
  );
}
