'use client';

import { Loader2, ArrowLeft, Mail } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PremiumButton } from '@/components/ui/PremiumButton';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // TODO: Replace with actual Better Auth forgot-password API call
    await new Promise((r) => setTimeout(r, 1000));
    setSent(true);
    setIsLoading(false);
  };

  if (sent) {
    return (
      <div className="space-y-6 text-center">
        <div className="bg-success/10 mx-auto flex h-16 w-16 items-center justify-center rounded-full">
          <Mail className="text-success h-8 w-8" />
        </div>
        <div>
          <h1 className="text-heading-lg font-bold">Check Your Email</h1>
          <p className="text-body-sm text-muted-foreground mt-2">
            We&apos;ve sent a password reset link to <strong>{email}</strong>. Please check your
            inbox and follow the instructions.
          </p>
        </div>
        <div className="space-y-3">
          <p className="text-body-xs text-muted-foreground">
            Didn&apos;t receive the email? Check your spam folder or try again.
          </p>
          <PremiumButton variant="outline" size="sm" onClick={() => setSent(false)}>
            Try Again
          </PremiumButton>
        </div>
        <Link
          href="/login"
          className="text-body-sm text-primary hover:text-primary/80 inline-flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-heading-lg font-bold">Forgot Password?</h1>
        <p className="text-body-sm text-muted-foreground mt-1">
          Enter your email and we&apos;ll send you a reset link
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-destructive/10 text-body-xs text-destructive rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>

        <PremiumButton variant="primary" size="lg" fullWidth type="submit" disabled={isLoading}>
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending...
            </span>
          ) : (
            'Send Reset Link'
          )}
        </PremiumButton>
      </form>

      <div className="text-center">
        <Link
          href="/login"
          className="text-body-sm text-primary hover:text-primary/80 inline-flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}
