'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Header } from './Header';
import { Sidebar, MobileSidebar } from './Sidebar';
import { motion } from 'framer-motion';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace('/login');
    });

    const check = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) router.replace('/login');
    };
    check();

    return () => subscription.unsubscribe();
  }, [router]);

  return (
    <div className="relative min-h-screen bg-background text-foreground transition-all duration-500 overflow-hidden font-sans">
      {/* Dynamic Background Elements */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-[10%] -top-[10%] h-[40%] w-[40%] rounded-full bg-primary/20 blur-[120px] animate-pulse" />
        <div className="absolute -right-[10%] -bottom-[10%] h-[50%] w-[50%] rounded-full bg-primary/10 blur-[150px] animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute left-[30%] top-[40%] h-[20%] w-[20%] rounded-full bg-emerald-500/10 blur-[80px]" />
      </div>
      
      <div className="relative z-10 flex flex-col min-h-screen">
        <Header onOpenMobileMenu={() => setMobileOpen(true)} />
        <div className="flex flex-1 relative">
          <Sidebar className="sticky top-16 h-[calc(100vh-64px)]" />
          <main className="flex-1 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="mx-auto w-full max-w-7xl px-4 md:px-8 pb-12 pt-8"
            >
              {children}
            </motion.div>
          </main>
        </div>
        <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />
      </div>
    </div>
  );
}
