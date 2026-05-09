import { createClient as createSupabaseClient } from '@supabase/supabase-js';

let clientInstance: ReturnType<typeof createSupabaseClient> | null = null;

export function createClient() {
  // Return existing instance to prevent multiple instances
  if (clientInstance) {
    return clientInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables. Auth will not work.');
    // In production, we don't want to crash the whole app if one component calls this,
    // but auth is core. We'll throw a more descriptive error.
    throw new Error(
      'SpendWise Configuration Error: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined. ' +
      'Please check your .env.local file or Vercel environment variables.'
    );
  }

  clientInstance = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
    global: {
      headers: {
        'X-Client-Info': 'spendwise-frontend/1.0.0',
      },
    },
  });

  return clientInstance;
}
