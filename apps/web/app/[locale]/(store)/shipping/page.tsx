import { Truck, MapPin, Clock, Package } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Card } from '@/components/ui/card';

import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('pages.shipping');
  return { title: t('title'), description: t('trackingText') };
}

export default async function ShippingPage() {
  const t = await getTranslations('pages.shipping');

  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-10 text-center">
        <div className="bg-primary/10 mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full">
          <Truck className="text-primary h-7 w-7" />
        </div>
        <h1 className="text-display-3xl text-foreground font-bold">{t('title')}</h1>
        <p className="text-caption text-muted-foreground mt-1">{t('lastUpdated')}</p>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-2">
        {/* Inside Dhaka */}
        <Card className="p-6">
          <div className="mb-3 flex items-center gap-2">
            <MapPin className="text-primary h-5 w-5" />
            <h2 className="text-body-lg text-foreground font-semibold">{t('insideDhaka')}</h2>
          </div>
          <div className="space-y-2">
            <div className="text-body text-foreground/80 flex items-center gap-2">
              <Clock className="text-muted-foreground h-4 w-4" />
              {t('insideDhakaTime')}
            </div>
            <p className="text-body text-foreground/80 font-medium">{t('insideDhakaCost')}</p>
          </div>
        </Card>

        {/* Outside Dhaka */}
        <Card className="p-6">
          <div className="mb-3 flex items-center gap-2">
            <Truck className="text-primary h-5 w-5" />
            <h2 className="text-body-lg text-foreground font-semibold">{t('outsideDhaka')}</h2>
          </div>
          <div className="space-y-2">
            <div className="text-body text-foreground/80 flex items-center gap-2">
              <Clock className="text-muted-foreground h-4 w-4" />
              {t('outsideDhakaTime')}
            </div>
            <p className="text-body text-foreground/80 font-medium">{t('outsideDhakaCost')}</p>
          </div>
        </Card>
      </div>

      {/* Tracking */}
      <Card className="mb-6 p-6">
        <div className="mb-3 flex items-center gap-2">
          <Package className="text-primary h-5 w-5" />
          <h2 className="text-body-lg text-foreground font-semibold">{t('tracking')}</h2>
        </div>
        <p className="text-body text-foreground/80 leading-relaxed">{t('trackingText')}</p>
      </Card>

      {/* Note */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/30 dark:bg-amber-950/20">
        <p className="text-body-sm text-amber-800 dark:text-amber-200">{t('note')}</p>
      </div>
    </section>
  );
}
