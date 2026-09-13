'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { UserAvatar } from '@/components/ui/UserAvatar';
import { useAuth } from '@/hooks/useAuth';

export default function AdminRolePage() {
  const locale = useLocale();
  const t = useTranslations('admin.profile');
  const tc = useTranslations('admin.common');
  const { user, isLoading } = useAuth();
  const queryClient = useQueryClient();

  // Profile form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Seed the form once per user. Adjusted during render (the React-recommended
  // alternative to a syncing effect) and keyed on the id so a session refetch
  // can't clobber what the admin is typing.
  const [syncedUserId, setSyncedUserId] = useState<string | null>(null);
  if (user && user.id !== syncedUserId) {
    setSyncedUserId(user.id);
    setName(user.name);
    setEmail(user.email);
  }

  const emailChanged = email.trim().toLowerCase() !== (user?.email ?? '').toLowerCase();
  const profileDirty = name.trim() !== user?.name || emailChanged;

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileDirty) return;
    if (emailChanged && !emailPassword) {
      toast.error(t('passwordRequiredForEmail'));
      return;
    }
    setSavingProfile(true);
    try {
      if (name.trim() && name.trim() !== user?.name) {
        const res = await fetch('/api/auth/update-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ name: name.trim() }),
        });
        if (!res.ok) throw new Error('update failed');
      }
      if (emailChanged) {
        const res = await fetch('/api/admin/me/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ newEmail: email.trim(), currentPassword: emailPassword }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? t('profileUpdateFailed'));
        }
        setEmailPassword('');
      }
      await queryClient.invalidateQueries({ queryKey: ['auth', 'session'] });
      toast.success(t('profileUpdated'));
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : t('profileUpdateFailed'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error(t('passwordTooShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('passwordMismatch'));
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword, revokeOtherSessions: true }),
      });
      if (!res.ok) throw new Error('change failed');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success(t('passwordChanged'));
    } catch {
      toast.error(t('passwordChangeFailed'));
    } finally {
      setSavingPassword(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="space-y-6">
        <div className="bg-muted/50 h-7 w-40 animate-pulse rounded" />
        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <div className="bg-muted/50 h-72 animate-pulse rounded-xl" />
          <div className="bg-muted/50 h-72 animate-pulse rounded-xl" />
        </div>
      </div>
    );
  }

  const memberSince = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(user.createdAt));

  const inputClass =
    'w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-300';

  return (
    <div className="space-y-6">
      {/* Header */}
      <h2 className="text-foreground text-xl font-semibold">{t('aboutSection')}</h2>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        {/* Left column */}
        <div className="space-y-6">
          {/* Profile card */}
          <div className="border-border bg-card rounded-xl border p-6 shadow-sm">
            <div className="text-center">
              <UserAvatar image={user.image} name={user.name} size="lg" className="mx-auto mb-3" />
              <h4 className="text-foreground text-base font-semibold">{user.name}</h4>
              <p className="text-muted-foreground/70 mt-1 text-xs">{user.email}</p>
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium capitalize text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5" />
                {user.role}
              </span>
            </div>
            <div className="border-border mt-5 space-y-2 border-t pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('role')}</span>
                <span className="text-foreground font-medium capitalize">{user.role}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('memberSince')}</span>
                <span className="text-foreground font-medium">{memberSince}</span>
              </div>
            </div>
          </div>

          {/* Change Password */}
          <div className="border-border bg-card rounded-xl border p-6 shadow-sm">
            <h3 className="text-foreground mb-4 text-base font-semibold">{t('changePassword')}</h3>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="text-foreground mb-1.5 block text-sm font-medium">
                  {t('currentPassword')}
                </label>
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="text-muted-foreground/70 absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showCurrent ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-foreground mb-1.5 block text-sm font-medium">
                  {t('newPassword')}
                </label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="text-muted-foreground/70 absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showNew ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-foreground mb-1.5 block text-sm font-medium">
                  {t('confirmPassword')}
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="text-muted-foreground/70 absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showConfirm ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={savingPassword}
                className="w-full rounded-lg bg-emerald-500 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-600 disabled:opacity-60"
              >
                {savingPassword ? tc('saving') : t('saveChange')}
              </button>
            </form>
          </div>
        </div>

        {/* Right column - Profile Update */}
        <div className="border-border bg-card h-fit rounded-xl border p-6 shadow-sm">
          <h3 className="text-foreground mb-6 text-base font-semibold">{t('profileUpdate')}</h3>

          <form onSubmit={handleProfileSave} className="space-y-4">
            <div>
              <label className="text-foreground mb-1.5 block text-sm font-medium">
                {t('fullName')}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-foreground mb-1.5 block text-sm font-medium">
                {t('email')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={inputClass}
              />
              <p className="text-muted-foreground/70 mt-1 text-xs">{t('emailNote')}</p>
            </div>
            {emailChanged && (
              <div>
                <label className="text-foreground mb-1.5 block text-sm font-medium">
                  {t('currentPassword')}
                </label>
                <input
                  type="password"
                  value={emailPassword}
                  onChange={(e) => setEmailPassword(e.target.value)}
                  placeholder={t('confirmEmailPassword')}
                  autoComplete="current-password"
                  className={inputClass}
                />
              </div>
            )}
            <div>
              <label className="text-foreground mb-1.5 block text-sm font-medium">
                {t('role')}
              </label>
              <input
                type="text"
                value={user.role}
                disabled
                className={`${inputClass} cursor-not-allowed capitalize opacity-60`}
              />
            </div>
            <button
              type="submit"
              disabled={savingProfile || !profileDirty}
              className="rounded-lg bg-emerald-500 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-600 disabled:opacity-60"
            >
              {savingProfile ? tc('saving') : t('saveChange')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
