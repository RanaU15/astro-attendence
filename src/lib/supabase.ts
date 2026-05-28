import { createClient } from '@supabase/supabase-js';

// Retrieve environment variables in Astro
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Warning: Supabase environment variables are missing! Make sure to set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY in your env settings.'
  );
}

// Use valid-looking placeholders to prevent createClient from throwing synchronous errors during server-side imports.
// They will be overridden by correct environment variables when defined.
const finalUrl = supabaseUrl || 'https://placeholder-project.supabase.co';
const finalKey = supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder-key';

// Instantiate and export the single shared Supabase client
export const supabase = createClient(finalUrl, finalKey, {
  auth: {
    persistSession: true, // Keep user logged in across page reloads
    autoRefreshToken: true, // Refresh access token automatically
  },
});
