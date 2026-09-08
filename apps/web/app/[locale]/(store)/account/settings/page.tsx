'use client';

import { useQueryClient } from '@tanstack/react-query';
import {
  Camera,
  Loader2,
  Save,
  User,
  Check,
  Shield,
  Bell,
  Lock,
  Download,
  Eye,
  EyeOff,
  AlertTriangle,
  LogOut,
} from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { DashboardErrorBoundary } from '@/components/account/ErrorBoundary';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

function SettingsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-5 w-48" />
      <div className="grid gap-4 lg:grid-cols-[180px_1fr]">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </div>
  );
}

function getPasswordStrength(password: string): { label: string; color: string; width: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { label: 'Weak', color: 'bg-red-500', width: 'w-1/3' };
  if (score <= 3) return { label: 'Medium', color: 'bg-yellow-500', width: 'w-2/3' };
  return { label: 'Strong', color: 'bg-green-500', width: 'w-full' };
}

export default function AccountSettingsPage() {
  const { user, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('profile');
  const t = useTranslations('account');
  const tc = useTranslations('common');

  // Profile state
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [avatarSrc, setAvatarSrc] = useState<string | null>(user?.image ?? null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const blobUrlRef = useRef<string | null>(null);

  // Security state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Notifications state
  const [notifPrefs, setNotifPrefs] = useState<{
    orderUpdates: boolean;
    promotions: boolean;
    newsletter: boolean;
  }>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('notification-preferences');
        return stored
          ? JSON.parse(stored)
          : { orderUpdates: true, promotions: false, newsletter: true };
      } catch {
        return { orderUpdates: true, promotions: false, newsletter: true };
      }
    }
    return { orderUpdates: true, promotions: false, newsletter: true };
  });
  const [notifSaved, setNotifSaved] = useState(false);

  // Privacy state
  const [deleteEmail, setDeleteEmail] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name ?? '');
      setPhone(user.phone ?? '');
      if (!avatarFile) setAvatarSrc(user.image ?? null);
    }
  }, [user, avatarFile]);

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error(t('imageMustBe2MB'));
        return;
      }
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      setAvatarFile(file);
      const url = URL.createObjectURL(file);
      blobUrlRef.current = url;
      setAvatarSrc(url);
    }
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile) return avatarSrc;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', avatarFile);
      const res = await fetch('/api/user/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(err.error || 'Upload failed');
      }
      const data = await res.json();
      return data.data.url as string;
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      let imageUrl = avatarSrc;
      if (avatarFile) imageUrl = await uploadAvatar();
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() || null, image: imageUrl }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Update failed' }));
        throw new Error(err.error || 'Update failed');
      }
      await queryClient.invalidateQueries({ queryKey: ['auth', 'session'] });
      setAvatarFile(null);
      setSaved(true);
      toast.success(t('profileUpdated'));
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      toast.error(t('failedToUpdateProfile'), {
        description: err instanceof Error ? err.message : t('tryAgainLater'),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error(t('passwordMin8Chars'));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('passwordsDoNotMatch'));
      return;
    }
    setChangingPassword(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to change password' }));
        throw new Error(err.error || 'Failed to change password');
      }
      toast.success(t('passwordUpdated'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(t('failedToChangePassword'), {
        description: err instanceof Error ? err.message : t('tryAgainLater'),
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSignOutEverywhere = async () => {
    setSigningOut(true);
    try {
      const res = await fetch('/api/auth/sign-out', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ global: true }),
      });
      if (!res.ok) throw new Error('Failed to sign out');
      toast.success(t('signedOutAllDevices'));
    } catch (err) {
      toast.error(t('failedToSignOut'), {
        description: err instanceof Error ? err.message : t('tryAgainLater'),
      });
    } finally {
      setSigningOut(false);
    }
  };

  const handleSaveNotifPrefs = () => {
    try {
      localStorage.setItem('notification-preferences', JSON.stringify(notifPrefs));
      setNotifSaved(true);
      toast.success(t('notifPrefsSaved'));
      setTimeout(() => setNotifSaved(false), 2000);
    } catch {
      toast.error(t('failedToSavePrefs'));
    }
  };

  const handleDeleteAccount = () => {
    if (deleteEmail !== user?.email) {
      toast.error(t('emailDoesNotMatch'));
      return;
    }
    toast.success(t('accountDeletionSubmitted'));
    setDeleteEmail('');
  };

  const passwordStrength = newPassword ? getPasswordStrength(newPassword) : null;
  const strengthLabel = passwordStrength
    ? t(`strength.${passwordStrength.label.toLowerCase()}`)
    : '';

  const tabTitles: Record<string, string> = {
    profile: t('profileSettings'),
    security: t('securitySettings'),
    notifications: t('notificationSettings'),
    privacy: t('privacySettings'),
  };

  const settingsTabs = [
    { key: 'profile', label: t('profile'), icon: User },
    { key: 'security', label: t('changePassword'), icon: Shield },
    { key: 'notifications', label: t('notificationPreferences'), icon: Bell },
    { key: 'privacy', label: t('dataPrivacy'), icon: Lock },
  ];

  if (isLoading) return <SettingsSkeleton />;

  return (
    <DashboardErrorBoundary>
      <div className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-foreground text-lg font-bold">{tabTitles[activeTab]}</h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-[180px_1fr]">
          <nav className="space-y-0.5">
            {settingsTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                    activeTab === tab.key
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          <div className="border-border bg-card rounded-2xl border p-5">
            {/* ---- PROFILE TAB ---- */}
            {activeTab === 'profile' && (
              <div className="space-y-5">
                <h3 className="text-foreground text-sm font-bold">{t('profileInfo')}</h3>
                <div className="flex items-center gap-4">
                  <div className="group relative shrink-0">
                    <div className="from-primary to-primary/60 ring-background relative h-16 w-16 overflow-hidden rounded-xl bg-gradient-to-br shadow ring-2">
                      {avatarSrc ? (
                        <Image
                          src={avatarSrc}
                          alt="Avatar"
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-white">
                          {user?.name?.charAt(0)?.toUpperCase() ?? '?'}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-xl bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <Camera className="h-5 w-5 text-white" />
                      </button>
                    </div>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                  </div>
                  <div>
                    <p className="text-foreground text-sm font-medium">{user?.name}</p>
                    <p className="text-muted-foreground text-xs">{t('imageFormats')}</p>
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="text-primary mt-0.5 text-xs font-medium"
                    >
                      {t('changePhoto')}
                    </button>
                  </div>
                </div>

                <Separator />

                <form onSubmit={handleSave} className="max-w-lg space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">{t('fullName')}</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">{tc('email')}</Label>
                    <Input
                      value={user?.email ?? ''}
                      disabled
                      className="text-muted-foreground bg-muted/30 h-10"
                    />
                    <p className="text-muted-foreground text-[10px]">{t('emailCannotBeChanged')}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">{t('phoneNumber')}</Label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+8801XXXXXXXXX"
                      className="h-10"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <PremiumButton
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() => {
                        setName(user?.name ?? '');
                        setPhone(user?.phone ?? '');
                        setAvatarSrc(user?.image ?? null);
                        setAvatarFile(null);
                      }}
                    >
                      {t('cancel')}
                    </PremiumButton>
                    <PremiumButton
                      variant="primary"
                      size="sm"
                      type="submit"
                      disabled={saving || uploading}
                      className="gap-1.5"
                    >
                      {saving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : saved ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      {saving ? t('saving') : saved ? t('saved') : t('saveChanges')}
                    </PremiumButton>
                  </div>
                </form>
              </div>
            )}

            {/* ---- SECURITY TAB ---- */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-foreground text-sm font-bold">{t('changePassword')}</h3>
                  <p className="text-muted-foreground mt-1 text-xs">{t('changePasswordDesc')}</p>
                </div>

                <form onSubmit={handleChangePassword} className="max-w-lg space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">{t('currentPassword')}</Label>
                    <div className="relative">
                      <Input
                        type={showCurrent ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="h-10 pr-9"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrent(!showCurrent)}
                        className="text-muted-foreground hover:text-foreground absolute right-2.5 top-1/2 -translate-y-1/2"
                      >
                        {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium">{t('newPassword')}</Label>
                    <div className="relative">
                      <Input
                        type={showNew ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="h-10 pr-9"
                        minLength={8}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew(!showNew)}
                        className="text-muted-foreground hover:text-foreground absolute right-2.5 top-1/2 -translate-y-1/2"
                      >
                        {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {passwordStrength && (
                      <div className="mt-1.5 space-y-1">
                        <div className="bg-muted h-1 w-full rounded-full">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              passwordStrength.color,
                              passwordStrength.width
                            )}
                          />
                        </div>
                        <p
                          className={cn(
                            'text-[10px] font-medium',
                            passwordStrength.label === 'Weak' && 'text-red-500',
                            passwordStrength.label === 'Medium' && 'text-yellow-600',
                            passwordStrength.label === 'Strong' && 'text-green-600'
                          )}
                        >
                          {strengthLabel}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium">{t('confirmNewPassword')}</Label>
                    <div className="relative">
                      <Input
                        type={showConfirm ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="h-10 pr-9"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="text-muted-foreground hover:text-foreground absolute right-2.5 top-1/2 -translate-y-1/2"
                      >
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {confirmPassword && confirmPassword !== newPassword && (
                      <p className="text-[10px] text-red-500">{t('passwordsDoNotMatch')}</p>
                    )}
                  </div>

                  <PremiumButton
                    variant="primary"
                    size="sm"
                    type="submit"
                    disabled={
                      changingPassword || !currentPassword || !newPassword || !confirmPassword
                    }
                    className="mt-2 gap-1.5"
                  >
                    {changingPassword ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Lock className="h-3.5 w-3.5" />
                    )}
                    {changingPassword ? t('updating') : t('updatePassword')}
                  </PremiumButton>
                </form>

                <Separator />

                <div>
                  <h3 className="text-foreground text-sm font-bold">{t('sessionManagement')}</h3>
                  <p className="text-muted-foreground mt-1 text-xs">{t('sessionManagementDesc')}</p>
                  <PremiumButton
                    variant="outline"
                    size="sm"
                    onClick={handleSignOutEverywhere}
                    disabled={signingOut}
                    className="mt-3 gap-1.5"
                  >
                    {signingOut ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <LogOut className="h-3.5 w-3.5" />
                    )}
                    {signingOut ? t('signingOut') : t('signOutEverywhere')}
                  </PremiumButton>
                </div>
              </div>
            )}

            {/* ---- NOTIFICATIONS TAB ---- */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-foreground text-sm font-bold">{t('notifPrefs')}</h3>
                  <p className="text-muted-foreground mt-1 text-xs">{t('notifPrefsDesc')}</p>
                </div>

                <div className="max-w-lg space-y-4">
                  <div className="border-border flex items-center justify-between rounded-xl border p-3.5">
                    <div>
                      <p className="text-foreground text-sm font-medium">{t('orderUpdates')}</p>
                      <p className="text-muted-foreground text-xs">{t('orderUpdatesDesc')}</p>
                    </div>
                    <Switch
                      size="sm"
                      checked={notifPrefs.orderUpdates}
                      onCheckedChange={(checked) =>
                        setNotifPrefs((p) => ({ ...p, orderUpdates: checked }))
                      }
                    />
                  </div>

                  <div className="border-border flex items-center justify-between rounded-xl border p-3.5">
                    <div>
                      <p className="text-foreground text-sm font-medium">{t('promotions')}</p>
                      <p className="text-muted-foreground text-xs">{t('promotionsDesc')}</p>
                    </div>
                    <Switch
                      size="sm"
                      checked={notifPrefs.promotions}
                      onCheckedChange={(checked) =>
                        setNotifPrefs((p) => ({ ...p, promotions: checked }))
                      }
                    />
                  </div>

                  <div className="border-border flex items-center justify-between rounded-xl border p-3.5">
                    <div>
                      <p className="text-foreground text-sm font-medium">{t('newsletter')}</p>
                      <p className="text-muted-foreground text-xs">{t('newsletterDesc')}</p>
                    </div>
                    <Switch
                      size="sm"
                      checked={notifPrefs.newsletter}
                      onCheckedChange={(checked) =>
                        setNotifPrefs((p) => ({ ...p, newsletter: checked }))
                      }
                    />
                  </div>
                </div>

                <PremiumButton
                  variant="primary"
                  size="sm"
                  onClick={handleSaveNotifPrefs}
                  className="gap-1.5"
                >
                  {notifSaved ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  {notifSaved ? t('saved') : t('savePreferences')}
                </PremiumButton>

                <p className="text-muted-foreground text-[10px]">{t('notifPrefsNote')}</p>
              </div>
            )}

            {/* ---- PRIVACY TAB ---- */}
            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-foreground text-sm font-bold">{t('dataPrivacy')}</h3>
                  <p className="text-muted-foreground mt-1 text-xs">{t('dataPrivacyDesc')}</p>
                </div>

                <div className="max-w-lg space-y-4">
                  <div className="border-border rounded-xl border p-3.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-foreground text-sm font-medium">{t('downloadMyData')}</p>
                        <p className="text-muted-foreground text-xs">{t('downloadMyDataDesc')}</p>
                      </div>
                      <PremiumButton
                        variant="outline"
                        size="sm"
                        onClick={() => toast.success(t('dataExportReady'))}
                        className="shrink-0 gap-1.5"
                      >
                        <Download className="h-3.5 w-3.5" />
                        {t('download')}
                      </PremiumButton>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-xl border border-red-500/20 p-3.5">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                      <div>
                        <p className="text-foreground text-sm font-medium">{t('deleteAccount')}</p>
                        <p className="text-muted-foreground text-xs">{t('deleteAccountDesc')}</p>
                      </div>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <PremiumButton
                          variant="outline"
                          size="sm"
                          className="border-red-500/50 text-red-500 hover:bg-red-500/10 hover:text-red-600"
                        >
                          {t('deleteAccount')}
                        </PremiumButton>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('deleteAccountConfirmTitle')}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t('deleteAccountConfirmDesc')}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="space-y-2 py-2">
                          <Label className="text-xs font-medium">{t('typeEmailToConfirm')}</Label>
                          <Input
                            value={deleteEmail}
                            onChange={(e) => setDeleteEmail(e.target.value)}
                            placeholder={user?.email ?? ''}
                            className="h-10"
                          />
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setDeleteEmail('')}>
                            {t('cancel')}
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteAccount}
                            disabled={deleteEmail !== user?.email}
                            className="bg-red-500 text-white hover:bg-red-600"
                          >
                            {t('deleteAccount')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                <p className="text-muted-foreground text-[10px]">
                  {t('lastUpdated')}:{' '}
                  {new Date().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardErrorBoundary>
  );
}
