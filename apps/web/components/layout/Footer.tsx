import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { Logo } from '@/components/shared/Logo';
import { SocialIcon } from '@/components/shared/SocialIcon';
import { NewsletterForm } from '@/components/store/NewsletterForm';
import { SOCIAL_PLATFORMS } from '@/lib/menu-config';
import { cn } from '@/lib/utils';

import type { MenuConfig } from '@/lib/menu-config';

type FooterProps = {
  logoLight?: string;
  logoDark?: string;
  menuConfig?: MenuConfig;
  className?: string;
};

export async function Footer({ logoLight, logoDark, menuConfig, className }: FooterProps) {
  const t = await getTranslations('footer');
  const columns = menuConfig?.footerMenu ?? [];
  const socials = menuConfig?.footerSocial ?? [];
  const payments = menuConfig?.footerPayments ?? [];

  return (
    <footer
      className={cn(
        'relative border-t border-emerald-100/60 bg-gradient-to-br from-emerald-50/80 via-white/70 to-emerald-100/50 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 dark:border-white/10 dark:from-emerald-950/60 dark:via-zinc-900/50 dark:to-emerald-900/30',
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-100/30 via-transparent to-white/20 dark:from-emerald-900/20 dark:via-transparent" />

      <div className="relative mx-auto max-w-screen-2xl px-4 pb-8 pt-12 sm:px-6 lg:px-8">
        {/* ── Desktop: 4-col / Mobile: 2-col ── */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 text-center sm:text-left lg:grid-cols-[1.2fr_1fr_1fr_1.4fr] lg:gap-8 lg:text-left">
          {/* Col 1 — Brand */}
          <div className="col-span-2 flex flex-col items-center sm:col-span-2 sm:items-center lg:col-span-1 lg:items-start">
            <Logo size="sm" lightSrc={logoLight} darkSrc={logoDark} />
            <p className="mt-4 max-w-[220px] text-sm leading-relaxed text-emerald-700/60 dark:text-white/50">
              {t('newsletterDesc')}
            </p>
            {socials.length > 0 && (
              <div className="mt-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-900/80 dark:text-white/80">
                  {t('followUs')}
                </h3>
                <div className="mt-3 flex items-center gap-2">
                  {socials.map((s) => {
                    const platform = SOCIAL_PLATFORMS.find((p) => p.id === s.platform);
                    if (!platform || !s.url) return null;
                    return (
                      <a
                        key={s.platform}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={platform.label}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-200/50 bg-white/60 text-emerald-700 shadow-sm backdrop-blur-md transition-all duration-200 hover:border-emerald-400/60 hover:bg-emerald-50 hover:text-emerald-800 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
                      >
                        <SocialIcon platform={s.platform} className="h-3.5 w-3.5" />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Col 2–N — Dynamic link columns */}
          {columns.map((col) => (
            <div key={col.id}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-900/80 dark:text-white/80">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {col.items.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.href ?? '#'}
                      className="text-sm text-emerald-700/70 transition-colors duration-200 hover:text-emerald-900 dark:text-emerald-200 dark:hover:text-white"
                      {...(item.openInNewTab
                        ? { target: '_blank', rel: 'noopener noreferrer' }
                        : {})}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Last col — Newsletter */}
          <div className="col-span-2 sm:col-span-2 lg:col-span-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-900/80 dark:text-white/80">
              {t('newsletter') ?? 'Stay Updated'}
            </h3>
            <div className="mt-4">
              <NewsletterForm />
            </div>
          </div>
        </div>

        {/* ── Separator ── */}
        <div className="my-8 h-px bg-gradient-to-r from-transparent via-emerald-200/60 to-transparent dark:via-white/10" />

        {/* ── Bottom Bar ── */}
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <span className="text-xs text-emerald-700/50 dark:text-white/50">
            &copy; {new Date().getFullYear()} {t('allRightsReserved')}
          </span>

          {payments.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2.5 sm:justify-end">
              {payments.map((pm) => (
                <div key={pm.id} className="flex items-center">
                  {pm.image ? (
                    <img
                      src={pm.image}
                      alt={pm.name}
                      className="h-6 w-auto object-contain opacity-80 transition-opacity hover:opacity-100"
                    />
                  ) : (
                    <span className="rounded-md border border-emerald-200/40 bg-white/50 px-2.5 py-1 text-[11px] font-medium text-emerald-700/80 backdrop-blur-sm dark:border-white/10 dark:bg-white/5 dark:text-white/80">
                      {pm.name}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
