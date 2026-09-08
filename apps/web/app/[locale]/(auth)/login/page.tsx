'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { GoogleSignInButton } from '@/components/shared/GoogleSignInButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PremiumButton } from '@/components/ui/PremiumButton';

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations('auth');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      const text = await res.text();
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(text);
      } catch {
        /* empty/non-JSON response */
      }

      if (!res.ok) {
        throw new Error(
          (data.error as string) ?? (data.message as string) ?? 'Invalid email or password'
        );
      }

      toast.success('Welcome back!');
      const params = new URLSearchParams(window.location.search);
      const redirectTo = params.get('redirect');
      const target = redirectTo && redirectTo.startsWith('/') ? redirectTo : '/';
      window.location.href = target;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-heading-lg font-bold">Welcome Back</h1>
        <p className="text-body-sm text-muted-foreground mt-1">{t('signIn')}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-destructive/10 text-body-xs text-destructive rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <Label htmlFor="email">{t('email')}</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="password">{t('password')}</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-muted-foreground hover:text-foreground absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Link
            href="/login/forgot-password"
            className="text-body-xs text-primary hover:text-primary/80 transition-colors"
          >
            {t('forgotPassword')}
          </Link>
        </div>

        <PremiumButton variant="primary" size="lg" fullWidth type="submit" disabled={isLoading}>
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('signIn')}...
            </span>
          ) : (
            t('signIn')
          )}
        </PremiumButton>
      </form>

      <div className="flex items-center gap-3">
        <div className="bg-border h-px flex-1" />
        <span className="text-body-xs text-muted-foreground">or</span>
        <div className="bg-border h-px flex-1" />
      </div>

      <GoogleSignInButton />

      <div className="text-body-sm text-muted-foreground text-center">
        {t('noAccount')}{' '}
        <Link href="/register" className="text-primary hover:text-primary/80 font-medium">
          {t('signUp')}
        </Link>
      </div>
    </div>
  );
}
