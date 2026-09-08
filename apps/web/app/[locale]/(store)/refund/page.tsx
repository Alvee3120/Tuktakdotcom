import { RotateCcw, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Card } from '@/components/ui/card';

import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('pages.refund');
  return { title: t('title'), description: t('windowText') };
}

export default async function RefundPage() {
  const t = await getTranslations('pages.refund');

  const conditions = [t('condition1'), t('condition2'), t('condition3')];

  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-10 text-center">
        <div className="bg-primary/10 mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full">
          <RotateCcw className="text-primary h-7 w-7" />
        </div>
        <h1 className="text-display-3xl text-foreground font-bold">{t('title')}</h1>
        <p className="text-caption text-muted-foreground mt-1">{t('lastUpdated')}</p>
      </div>

      {/* Return Window */}
      <Card className="mb-6 p-6">
        <div className="mb-3 flex items-center gap-2">
          <Clock className="text-primary h-5 w-5" />
          <h2 className="text-body-lg text-foreground font-semibold">{t('window')}</h2>
        </div>
        <p className="text-body text-foreground/80 leading-relaxed">{t('windowText')}</p>
      </Card>

      {/* Return Conditions */}
      <Card className="mb-6 p-6">
        <div className="mb-3 flex items-center gap-2">
          <CheckCircle className="text-primary h-5 w-5" />
          <h2 className="text-body-lg text-foreground font-semibold">{t('conditions')}</h2>
        </div>
        <ul className="space-y-2">
          {conditions.map((condition, i) => (
            <li key={i} className="text-body text-foreground/80 flex items-start gap-2">
              <span className="bg-primary/50 mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" />
              {condition}
            </li>
          ))}
        </ul>
      </Card>

      {/* Refund Process */}
      <Card className="mb-6 p-6">
        <div className="mb-3 flex items-center gap-2">
          <RotateCcw className="text-primary h-5 w-5" />
          <h2 className="text-body-lg text-foreground font-semibold">{t('process')}</h2>
        </div>
        <p className="text-body text-foreground/80 leading-relaxed">{t('processText')}</p>
      </Card>

      {/* Exceptions */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/30 dark:bg-amber-950/20">
        <div className="mb-2 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <h3 className="text-body-sm font-semibold text-amber-800 dark:text-amber-200">
            {t('exceptions')}
          </h3>
        </div>
        <p className="text-body-sm text-amber-700 dark:text-amber-300">{t('exceptionsText')}</p>
      </div>
    </section>
  );
}
