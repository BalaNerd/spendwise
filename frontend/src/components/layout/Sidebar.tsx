'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Receipt, CreditCard, Users, LineChart, Settings, X } from 'lucide-react';
import { motion } from 'framer-motion';

export const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/expenses', label: 'Expenses', icon: Receipt },
  { href: '/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { href: '/settlements', label: 'Settlements', icon: Users },
  { href: '/insights', label: 'Insights', icon: LineChart },
  { href: '/settings', label: 'Settings', icon: Settings },
];

type SidebarProps = {
  className?: string;
};

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'hidden md:flex md:w-64 md:flex-col md:border-r md:border-border/10 md:bg-card/30 md:py-8 md:px-4 backdrop-blur-3xl',
        className
      )}
    >
      <nav className="flex flex-1 flex-col gap-2 text-sm">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-xl px-4 py-3 font-medium transition-all duration-500 relative overflow-hidden',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                  : 'text-muted-foreground hover:bg-primary/5 hover:text-primary'
              )}
            >
              <Icon className={cn('h-5 w-5 transition-transform duration-300 group-hover:scale-110', isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-primary')} />
              {item.label}
              {isActive && (
                <motion.div 
                  layoutId="active-pill"
                  className="absolute right-2 h-1.5 w-1.5 rounded-full bg-primary-foreground"
                />
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

type MobileSidebarProps = {
  open: boolean;
  onClose: () => void;
};

export function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  const pathname = usePathname();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex md:hidden">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background/60 backdrop-blur-md z-40"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={cn(
          'fixed left-0 top-0 z-50 h-full w-[280px] bg-card/90 backdrop-blur-3xl border-r border-border/10 shadow-2xl flex flex-col'
        )}
      >
        <div className="flex h-16 items-center justify-between px-6 border-b border-border/10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <span className="font-bold text-xl leading-none tracking-tighter">S</span>
            </div>
            <span className="font-bold text-foreground text-lg">Menu</span>
          </div>
          <button
            type="button"
            aria-label="Close menu"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            onClick={onClose}
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <nav className="flex flex-col gap-2 px-4 py-8 text-base">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'group flex items-center gap-4 rounded-2xl px-5 py-4 font-semibold transition-all duration-500',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-xl shadow-primary/20'
                    : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'
                )}
              >
                <Icon className={cn('h-6 w-6', isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-primary')} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto p-6">
          <div className="rounded-2xl bg-primary/10 p-6 border border-primary/20">
            <p className="text-sm font-bold text-primary">SpendWise Premium</p>
            <p className="mt-1 text-xs text-muted-foreground">Managing your wealth with style.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

