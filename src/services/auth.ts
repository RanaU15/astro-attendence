import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

/**
 * Signs up a new administrator/user with email and password (DISABLED).
 */
export async function signUpUser(email: string, password: string) {
  throw new Error('Public registration is disabled.');
}

/**
 * Authenticates an existing user/administrator.
 * Enforces admin-only access and auto-creates the admin account if it doesn't exist.
 */
export async function signInUser(email: string, password: string) {
  if (email.trim().toLowerCase() !== 'admin@gmail.com') {
    throw new Error('Access denied. Only admin can login.');
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Auto-create the admin user if they don't exist yet and password is correct
      if (password === '123456') {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) {
          throw signUpError;
        }

        if (signUpData?.session) {
          return signUpData;
        }

        // Try signing in again now that the account has been created
        const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (retryError) throw retryError;
        return retryData;
      }
      throw error;
    }
    return data;
  } catch (err: any) {
    throw err;
  }
}

/**
 * Terminates the current active session.
 */
export async function signOutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Retrieves the current active user session, if any.
 */
export async function getActiveSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session;
}

/**
 * Retrieves the currently authenticated user's profile metadata.
 */
export async function getCurrentUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}

/**
 * Listens to authentication state transitions (e.g., Login, Logout).
 * Returns an unsubscribe function.
 */
export function subscribeToAuthChanges(
  callback: (event: string, session: Session | null) => void
) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
  return data.subscription;
}
