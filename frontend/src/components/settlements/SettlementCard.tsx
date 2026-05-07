'use client';

import { motion } from 'framer-motion';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

export type Settlement = {
  id: string;
  person_name: string;
  type: 'gave' | 'received';
  total_amount: number;
  total_paid: number;
  remaining: number;
  status: 'pending' | 'partially_settled' | 'completed' | 'overdue';
  due_date?: string | null;
  notes?: string | null;
  created_at: string;
  payments: Array<{
    id: string;
    amount: number;
    paid_at: string;
    note?: string | null;
  }>;
};

type SettlementCardProps = {
  settlement: Settlement;
  currency?: string;
  onAddPayment: (settlementId: string) => void;
  onEdit: (settlement: Settlement) => void;
  onDelete: (settlementId: string) => void;
};

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-muted text-muted-foreground' },
  partially_settled: { label: 'Partially Settled', color: 'bg-blue-500/20 text-blue-400' },
  completed: { label: 'Completed', color: 'bg-green-500/20 text-green-400' },
  overdue: { label: 'Overdue', color: 'bg-red-500/20 text-red-400' },
};

export function SettlementCard({
  settlement,
  currency = 'INR',
  onAddPayment,
  onEdit,
  onDelete,
}: SettlementCardProps) {
  const progress = settlement.total_amount > 0 
    ? (settlement.total_paid / settlement.total_amount) * 100 
    : 0;
  const status = statusConfig[settlement.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card/80 p-4 sm:p-6 space-y-4 shadow-sm shadow-black/5 dark:shadow-black/30 transition-colors duration-300"
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <h3 className="text-lg font-semibold text-foreground truncate">
              {settlement.person_name}
            </h3>
            <span className={`px-2 py-1 rounded text-xs font-medium shrink-0 ${status.color}`}>
              {status.label}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {settlement.type === 'gave' 
              ? `You gave ${formatCurrency(settlement.total_amount, currency)}`
              : `You received ${formatCurrency(settlement.total_amount, currency)}`}
          </p>
        </div>
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 mt-1 sm:mt-0 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(settlement)}
            className="text-xs"
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(settlement.id)}
            className="text-xs text-red-400 hover:text-red-300"
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Paid: {formatCurrency(settlement.total_paid, currency)}
          </span>
          <span className="text-muted-foreground">
            Remaining: {formatCurrency(settlement.remaining, currency)}
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
            className={`h-full ${
              settlement.status === 'completed' 
                ? 'bg-green-500' 
                : settlement.status === 'overdue'
                ? 'bg-red-500'
                : 'bg-blue-500'
            }`}
          />
        </div>
      </div>

      {/* Due Date */}
      {settlement.due_date && (
        <div className="text-xs text-muted-foreground">
          Due: {formatDate(settlement.due_date)}
        </div>
      )}

      {/* Notes */}
      {settlement.notes && (
        <p className="text-sm text-muted-foreground line-clamp-2">
          {settlement.notes}
        </p>
      )}

      {/* Payment History Count */}
      {settlement.payments.length > 0 && (
        <div className="text-xs text-muted-foreground">
          {settlement.payments.length} payment{settlement.payments.length !== 1 ? 's' : ''} recorded
        </div>
      )}

      {/* Actions */}
      {settlement.status !== 'completed' && (
        <div className="pt-2 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddPayment(settlement.id)}
            className="w-full"
          >
            Add Payment
          </Button>
        </div>
      )}
    </motion.div>
  );
}
