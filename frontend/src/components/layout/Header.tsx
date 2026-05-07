'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Menu, LogOut } from 'lucide-react';

type HeaderProps = {
  onOpenMobileMenu: () => void;
};

export function Header({ onOpenMobileMenu }: HeaderProps) {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  const isDark = mounted ? resolvedTheme === 'dark' : true;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 glass transition-colors duration-300">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <span className="font-bold text-lg leading-none tracking-tighter">S</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground">SpendWise</span>
        </Link>

        <div className="flex items-center gap-3">
          {/* Theme toggle */}
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="sm"
              className="w-9 px-0"
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              aria-label="Toggle theme"
            >
              <motion.div
                key={isDark ? 'moon' : 'sun'}
                initial={{ opacity: 0, rotate: -45 }}
                animate={{ opacity: 1, rotate: 0 }}
                transition={{ duration: 0.2 }}
              >
                {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              </motion.div>
            </Button>
          </motion.div>

          {/* Desktop sign out */}
          <div className="hidden md:block">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button variant="outline" size="sm" onClick={handleSignOut} className="gap-2 font-medium">
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </motion.div>
          </div>

          {/* Mobile menu button */}
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              className="w-9 px-0"
              onClick={onOpenMobileMenu}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </motion.div>
        </div>
      </div>
    </header>
  );
}
