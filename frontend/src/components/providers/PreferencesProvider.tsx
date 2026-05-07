'use client';

import * as React from 'react';
import { api } from '@/lib/api';

export type Preferences = {
  currency: string;
  monthly_budget: number;
  insight_level: 'basic' | 'advanced';
  full_name?: string;
  email?: string;
};

type PreferencesContextValue = {
  preferences: Preferences | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setPreferences: (prefs: Preferences) => void;
};

const PreferencesContext = React.createContext<PreferencesContextValue | undefined>(undefined);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferencesState] = React.useState<Preferences | null>(null);
  const [loading, setLoading] = React.useState(true);
  const refreshRef = React.useRef<() => Promise<void>>(async () => {});

  refreshRef.current = React.useCallback(async () => {
    setLoading(true);
    try {
      const u = await api.get<any>('users/me');
      setPreferencesState({
        currency: u?.currency || 'USD',
        monthly_budget: Number(u?.monthly_budget) || 0,
        insight_level: (u?.insight_level || 'basic') as 'basic' | 'advanced',
        full_name: u?.full_name,
        email: u?.email,
      });
    } catch (error) {
      console.error('Failed to refresh preferences:', error);
      setPreferencesState(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refreshRef.current();
  }, []);

  const setPreferences = React.useCallback((prefs: Preferences) => {
    setPreferencesState(prefs);
  }, []);

  const value = React.useMemo(
    () => ({ 
      preferences, 
      loading, 
      refresh: refreshRef.current, 
      setPreferences 
    }),
    [preferences, loading, setPreferences]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const ctx = React.useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider');
  return ctx;
}

