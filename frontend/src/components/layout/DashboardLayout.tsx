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
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <Header onOpenMobileMenu={() => setMobileOpen(true)} />
      <div className="flex">
        <Sidebar />
        <main className="flex-1">
          <div className="mx-auto w-full max-w-6xl px-4 md:px-8 pb-8 pt-4">
            {children}
          </div>
        </main>
      </div>
      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </div>
  );
}
