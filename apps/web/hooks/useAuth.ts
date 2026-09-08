import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

/** User type matching Better Auth session response */
export type User = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  phone?: string | null;
  role: 'admin' | 'moderator' | 'customer';
  banned: boolean;
  createdAt: string;
  updatedAt: string;
};

type SessionResponse = {
  user: User;
  session: {
    id: string;
    expiresAt: string;
    token: string;
  };
};

/**
 * Hook: Fetch current user session from Better Auth.
 * Uses relative /api/auth path so the cookie is same-origin
 * and the Next.js rewrite proxies it to the actual API.
 */
export function useSession() {
  return useQuery({
    queryKey: ['auth', 'session'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/auth/get-session', {
          credentials: 'include',
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data as SessionResponse | null;
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes — avoid excessive session refetching
    retry: false,
    refetchOnMount: true,
    refetchOnWindowFocus: true, // Revalidate when user returns to tab
  });
}

/**
 * Hook: Check if user is authenticated.
 */
export function useAuth() {
  const { data, isLoading } = useSession();
  return {
    user: data?.user ?? null,
    isAuthenticated: !!data?.user,
    isLoading,
  };
}

/**
 * Hook: Sign out the current user.
 * Clears the Better Auth session cookie AND the cached session query
 * (staleTime is 5 min, so without setQueryData the UI would keep showing
 * the logged-in user), then navigates to `redirectTo`.
 */
export function useSignOut(redirectTo = '/') {
  const queryClient = useQueryClient();

  return useCallback(async () => {
    try {
      // Better Auth rejects non-JSON requests (415 → session never cleared).
      await fetch('/api/auth/sign-out', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
    } catch {
      /* network failure — still clear the local session state */
    }
    // Drop the cached session immediately so Header/account UI update in realtime.
    queryClient.setQueryData(['auth', 'session'], null);
    await queryClient.invalidateQueries({ queryKey: ['auth', 'session'] });
    // Full page reload ensures the server sees the cleared cookie
    window.location.href = redirectTo;
  }, [queryClient, redirectTo]);
}

/**
 * Start Google OAuth via Better Auth's social sign-in.
 * Posts to the social endpoint (through the same-origin Next rewrite),
 * then redirects the browser to the returned Google consent URL.
 * `callbackURL` is where the user lands after auth (relative to the app origin).
 */
export async function signInWithGoogle(callbackURL = '/'): Promise<void> {
  const res = await fetch('/api/auth/sign-in/social', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      provider: 'google',
      callbackURL: `${window.location.origin}${callbackURL}`,
    }),
  });
  const data = (await res.json().catch(() => null)) as { url?: string } | null;
  if (!res.ok || !data?.url) {
    throw new Error('Google sign-in is not available right now.');
  }
  window.location.href = data.url;
}
