'use client';

import { motion } from 'framer-motion';
import { Settings, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { UserAvatar } from '@/components/ui/UserAvatar';
import { useAuth } from '@/hooks/useAuth';

export function ProfileHero() {
  const { user } = useAuth();
  const t = useTranslations('account');

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="border-border bg-card relative overflow-hidden rounded-2xl border p-4 sm:p-5"
    >
      <div className="relative flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-foreground text-lg font-bold sm:text-xl">
            {t('welcomeBack', { name: user?.name ?? 'User' })} 👋
          </h1>
          <p className="text-muted-foreground mt-0.5 text-xs">{t('welcomeSubtitle')}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {user?.role === 'admin' && (
            <Link
              href="/admin"
              className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              {t('adminDashboard')}
            </Link>
          )}
          <UserAvatar
            image={user?.image}
            name={user?.name}
            size="sm"
            className="ring-border rounded-lg ring-2"
          />
          <Link
            href="/account/settings"
            className="border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
          >
            <Settings className="h-3.5 w-3.5" />
            {t('editProfile')}
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
