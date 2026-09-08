import { Store, Shield, DollarSign, Truck } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('pages.about');
  return { title: t('title'), description: t('subtitle') };
}

export default async function AboutPage() {
  const t = await getTranslations('pages.about');

  const values = [
    { icon: Shield, title: t('value1Title'), text: t('value1Text') },
    { icon: DollarSign, title: t('value2Title'), text: t('value2Text') },
    { icon: Truck, title: t('value3Title'), text: t('value3Text') },
  ];

  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      {/* Hero */}
      <div className="mb-12 text-center">
        <div className="bg-primary/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
          <Store className="text-primary h-8 w-8" />
        </div>
        <h1 className="text-display-3xl text-foreground font-bold">{t('title')}</h1>
        <p className="text-body text-muted-foreground mt-2">{t('subtitle')}</p>
      </div>

      {/* Mission */}
      <Card className="mb-8 p-6">
        <Badge variant="secondary" className="mb-3">
          {t('mission')}
        </Badge>
        <p className="text-body text-foreground/80 leading-relaxed">{t('missionText')}</p>
      </Card>

      {/* Story */}
      <div className="mb-12">
        <h2 className="text-display-2xl text-foreground mb-3 font-bold">{t('story')}</h2>
        <p className="text-body text-foreground/80 leading-relaxed">{t('storyText')}</p>
      </div>

      {/* Values */}
      <div>
        <h2 className="text-display-2xl text-foreground mb-6 font-bold">{t('values')}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {values.map((v) => (
            <Card key={v.title} className="p-5 text-center">
              <div className="bg-primary/10 mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full">
                <v.icon className="text-primary h-5 w-5" />
              </div>
              <h3 className="text-body-sm text-foreground font-semibold">{v.title}</h3>
              <p className="text-caption text-muted-foreground mt-2">{v.text}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
