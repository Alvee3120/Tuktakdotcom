'use client';

import { Globe } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { usePathname, useRouter } from '@/i18n/navigation';
import { LOCALES, type Locale } from '@/lib/constants';

const localeLabels: Record<string, string> = {
  en: 'EN',
  bn: 'বাং',
};

export function LanguageSwitcher() {
  const locale = useLocale();
  // Locale-aware router/pathname (next-intl): pathname comes WITHOUT the
  // locale prefix, and replace() applies the right prefix + NEXT_LOCALE
  // cookie for the target locale — no manual string surgery needed.
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const switchLocale = () => {
    const nextLocale = (LOCALES.find((l) => l !== locale) ?? LOCALES[0]) as Locale;
    const query = searchParams.toString();
    const target = query ? `${pathname}?${query}` : pathname;
    startTransition(() => {
      router.replace(target, { locale: nextLocale });
    });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={switchLocale}
      disabled={isPending}
      className="flex items-center gap-1.5 px-2"
      aria-label="Switch language"
    >
      <Globe className="h-3.5 w-3.5" />
      <span className="text-xs font-medium">{localeLabels[locale] ?? locale}</span>
    </Button>
  );
}
