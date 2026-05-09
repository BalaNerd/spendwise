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
    <header className="sticky top-0 z-40 w-full border-b border-border/10 glass transition-all duration-300">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <motion.div 
            whileHover={{ rotate: 10, scale: 1.1 }}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-300"
          >
            <span className="font-bold text-xl leading-none tracking-tighter">S</span>
          </motion.div>
          <span className="text-xl font-bold tracking-tight text-foreground/90 group-hover:text-foreground transition-colors">
            SpendWise
          </span>
        </Link>

        <div className="flex items-center gap-4">
          {/* Theme toggle */}
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="sm"
              className="w-10 h-10 px-0 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors"
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              aria-label="Toggle theme"
            >
              <motion.div
                key={isDark ? 'moon' : 'sun'}
                initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                transition={{ type: 'spring', damping: 15 }}
              >
                {isDark ? <Moon className="h-5.5 w-5.5" /> : <Sun className="h-5.5 w-5.5" />}
              </motion.div>
            </Button>
          </motion.div>

          {/* Desktop sign out */}
          <div className="hidden md:block">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSignOut} 
                className="gap-2 font-medium rounded-xl border-border/40 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-all duration-300"
              >
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
              className="w-10 h-10 px-0 rounded-xl hover:bg-primary/10"
              onClick={onOpenMobileMenu}
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </motion.div>
        </div>
      </div>
    </header>
  );
}
