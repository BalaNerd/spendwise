'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Header } from './Header';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) router.replace('/login');
      }
    );

    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) router.replace('/login');
    };
    check();

    return () => subscription.unsubscribe();
  }, [router]);

  return (
    <div className="min-h-screen bg-neutral-950">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
