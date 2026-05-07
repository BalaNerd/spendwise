'use client';

import * as React from 'react';
import { ThemeProvider } from 'next-themes';
import { PreferencesProvider } from '@/components/providers/PreferencesProvider';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { SessionProvider } from '@/components/providers/SessionProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
    >
      <SessionProvider>
        <ToastProvider>
          <PreferencesProvider>{children}</PreferencesProvider>
        </ToastProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}

