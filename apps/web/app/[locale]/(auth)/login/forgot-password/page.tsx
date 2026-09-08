'use client';

import { Eye, EyeOff, Loader2, ArrowLeft, CheckCircle2, Mail, KeyRound, Lock } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PremiumButton } from '@/components/ui/PremiumButton';

type Step = 'request' | 'verify' | 'reset' | 'success';

export default function ForgotPasswordPage() {
  const t = useTranslations('auth');

  // Step management
  const [step, setStep] = useState<Step>('request');

  // Request form
  const [email, setEmail] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);

  // Verify form
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [resetToken, setResetToken] = useState('');

  // Reset form
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const [error, setError] = useState('');

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsRequesting(true);

    try {
      const res = await fetch('/api/password/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send reset code');
      }

      toast.success('Reset code sent! Check your email.');
      setStep('verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset code');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsVerifying(true);

    try {
      const res = await fetch('/api/password/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Invalid code');
      }

      setResetToken(data.data.resetToken);
      toast.success('Code verified! Set your new password.');
      setStep('reset');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsResetting(true);

    try {
      const res = await fetch('/api/password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      toast.success('Password reset successfully!');
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back to login link */}
      <Link
        href="/login"
        className="text-body-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to login
      </Link>

      {/* Step 1: Request reset code */}
      {step === 'request' && (
        <>
          <div className="text-center">
            <div className="bg-primary/10 mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full">
              <Mail className="text-primary h-6 w-6" />
            </div>
            <h1 className="text-heading-lg font-bold">Forgot Password?</h1>
            <p className="text-body-sm text-muted-foreground mt-1">
              Enter your email address and we&apos;ll send you a reset code.
            </p>
          </div>

          <form onSubmit={handleRequestReset} className="space-y-4">
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

            <PremiumButton
              variant="primary"
              size="lg"
              fullWidth
              type="submit"
              disabled={isRequesting}
            >
              {isRequesting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </span>
              ) : (
                'Send Reset Code'
              )}
            </PremiumButton>
          </form>
        </>
      )}

      {/* Step 2: Verify OTP */}
      {step === 'verify' && (
        <>
          <div className="text-center">
            <div className="bg-primary/10 mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full">
              <KeyRound className="text-primary h-6 w-6" />
            </div>
            <h1 className="text-heading-lg font-bold">Enter Reset Code</h1>
            <p className="text-body-sm text-muted-foreground mt-1">
              We sent a 6-digit code to <span className="text-foreground font-medium">{email}</span>
            </p>
          </div>

          <form onSubmit={handleVerifyOtp} className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-body-xs text-destructive rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="otp">Reset Code</Label>
              <Input
                id="otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                pattern="[0-9]*"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="text-center font-mono text-lg tracking-[0.5em]"
                required
              />
            </div>

            <PremiumButton
              variant="primary"
              size="lg"
              fullWidth
              type="submit"
              disabled={isVerifying || otp.length !== 6}
            >
              {isVerifying ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying...
                </span>
              ) : (
                'Verify Code'
              )}
            </PremiumButton>

            <button
              type="button"
              onClick={() => {
                setStep('request');
                setOtp('');
                setError('');
              }}
              className="text-body-xs text-muted-foreground hover:text-foreground w-full text-center transition-colors"
            >
              Use a different email
            </button>
          </form>
        </>
      )}

      {/* Step 3: Reset password */}
      {step === 'reset' && (
        <>
          <div className="text-center">
            <div className="bg-primary/10 mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full">
              <Lock className="text-primary h-6 w-6" />
            </div>
            <h1 className="text-heading-lg font-bold">Set New Password</h1>
            <p className="text-body-sm text-muted-foreground mt-1">
              Create a new password for your account.
            </p>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-body-xs text-destructive rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="text-muted-foreground hover:text-foreground absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md"
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="text-muted-foreground hover:text-foreground absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <p className="text-body-xs text-destructive">Passwords do not match</p>
            )}

            <PremiumButton
              variant="primary"
              size="lg"
              fullWidth
              type="submit"
              disabled={
                isResetting || !newPassword || !confirmPassword || newPassword !== confirmPassword
              }
            >
              {isResetting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Resetting...
                </span>
              ) : (
                'Reset Password'
              )}
            </PremiumButton>
          </form>
        </>
      )}

      {/* Step 4: Success */}
      {step === 'success' && (
        <>
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            </div>
            <h1 className="text-heading-lg font-bold">Password Reset!</h1>
            <p className="text-body-sm text-muted-foreground mt-1">
              Your password has been reset successfully. You can now sign in with your new password.
            </p>
          </div>

          <PremiumButton
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => (window.location.href = '/login')}
          >
            Sign In
          </PremiumButton>
        </>
      )}
    </div>
  );
}
