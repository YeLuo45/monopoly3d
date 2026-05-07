/**
 * Supabase Client Configuration
 * 
 * To set up your own Supabase project:
 * 1. Go to https://supabase.com and create a new project
 * 2. Run the SQL from supabase.sql in the SQL Editor
 * 3. Copy your project URL and anonymous key below
 */

import { createClient } from '@supabase/supabase-js';

// These should be environment variables in production
// For development, you can use placeholder values
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    // Enable anonymous sign-in for multiplayer
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Helper to check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return SUPABASE_URL !== 'https://your-project.supabase.co' && 
         SUPABASE_ANON_KEY !== 'your-anon-key';
};

export default supabase;
