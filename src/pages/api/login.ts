import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const { email, password } = body;

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Please enter both email and password.' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();

    // 1. Enforce that only the administrator account can login
    if (trimmedEmail !== 'admin@gmail.com') {
      return new Response(
        JSON.stringify({ error: 'Access denied. Only admin can login.' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 2. Attempt authentication with Supabase
    let { data, error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    // 3. Automatically create the admin user if they do not exist
    if (error && password === '123456') {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
      });

      if (signUpError) {
        return new Response(
          JSON.stringify({ error: signUpError.message }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      if (signUpData?.session) {
        data = signUpData;
        error = null;
      } else {
        // Fallback sign in attempt
        const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

        if (retryError) {
          return new Response(
            JSON.stringify({ error: retryError.message }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
        data = retryData;
        error = null;
      }
    }

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message || 'Invalid credentials.' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const session = data?.session;
    if (session) {
      // 4. Inject secure HTTP-only cookies with JWT token
      cookies.set('sb-access-token', session.access_token, {
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'lax',
        maxAge: session.expires_in,
      });

      cookies.set('sb-refresh-token', session.refresh_token, {
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        session: session,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Internal Server Error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
