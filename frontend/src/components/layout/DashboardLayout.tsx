'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Header } from './Header';
import { Sidebar, MobileSidebar } from './Sidebar';

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
    <div className="relative min-h-screen bg-background text-foreground transition-colors duration-300 overflow-hidden">
      {/* Decorative gradient orbs */}
      <div className="pointer-events-none absolute left-0 top-0 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[100px] dark:bg-primary/5" />
      <div className="pointer-events-none absolute right-0 bottom-0 h-[600px] w-[600px] translate-x-1/3 translate-y-1/3 rounded-full bg-primary/10 blur-[120px] dark:bg-primary/5" />
      
      <div className="relative z-10 flex flex-col min-h-screen">
        <Header onOpenMobileMenu={() => setMobileOpen(true)} />
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-7xl px-4 md:px-8 pb-12 pt-8">
              {children}
            </div>
          </main>
        </div>
        <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />
      </div>
    </div>
  );
}
