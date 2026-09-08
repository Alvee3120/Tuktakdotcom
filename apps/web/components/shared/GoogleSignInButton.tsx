'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { signInWithGoogle } from '@/hooks/useAuth';

/** "Continue with Google" button — starts Better Auth's Google OAuth flow. */
export function GoogleSignInButton({
  callbackURL = '/',
  label = 'Continue with Google',
}: {
  callbackURL?: string;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await signInWithGoogle(callbackURL);
      // On success the browser navigates away; keep the spinner until then.
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Google sign-in failed');
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="border-border bg-card text-foreground hover:bg-muted/50 flex w-full items-center justify-center gap-2.5 rounded-lg border py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60"
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.24 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
        />
      </svg>
      {loading ? 'Redirecting…' : label}
    </button>
  );
}
