/**
 * Create Supabase client with user's JWT for RLS-enforced queries
 */

import { createClient } from '@supabase/supabase-js';

export function createUserClient(token) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Backend Supabase environment variables not found');
    console.error('SUPABASE_URL:', supabaseUrl);
    console.error('SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Loaded' : '❌ Missing');
    throw new Error('Supabase environment variables are required');
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: { 
      headers: { 
        Authorization: `Bearer ${token}`,
        'X-Client-Info': 'spendwise-backend/1.0.0'
      } 
    }
  });
}
