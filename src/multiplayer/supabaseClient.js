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
// Checks for real Supabase project URL pattern (not placeholder values)
export const isSupabaseConfigured = () => {
  // Must have a valid Supabase URL pattern: https://*.supabase.co or custom domain
  const hasValidUrl = SUPABASE_URL && 
    SUPABASE_URL !== 'https://your-project.supabase.co' &&
    /^(https?:\/\/)?[\w-]+\.[\w.-]+/.test(SUPABASE_URL);
  
  // Must have a non-empty anon key that's not the placeholder
  const hasValidKey = SUPABASE_ANON_KEY && 
    SUPABASE_ANON_KEY !== 'your-anon-key' &&
    SUPABASE_ANON_KEY.length > 20;
  
  return hasValidUrl && hasValidKey;
};

// Debug function to check configuration status
export const getConfigStatus = () => {
  const urlConfigured = SUPABASE_URL && SUPABASE_URL !== 'https://your-project.supabase.co';
  const keyConfigured = SUPABASE_ANON_KEY && SUPABASE_ANON_KEY !== 'your-anon-key';
  return {
    urlConfigured,
    keyConfigured,
    url: urlConfigured ? 'Configured' : 'Missing',
    key: keyConfigured ? 'Configured' : 'Missing',
    ready: isSupabaseConfigured(),
  };
};

export default supabase;
