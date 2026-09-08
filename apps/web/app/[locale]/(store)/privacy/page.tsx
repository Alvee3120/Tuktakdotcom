import { Shield } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Card } from '@/components/ui/card';

import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('pages.privacy');
  return { title: t('title'), description: t('intro') };
}

export default async function PrivacyPage() {
  const t = await getTranslations('pages.privacy');

  const sections = [
    { title: t('collectionTitle'), text: t('collectionText') },
    { title: t('usageTitle'), text: t('usageText') },
    { title: t('protectionTitle'), text: t('protectionText') },
    { title: t('rightsTitle'), text: t('rightsText') },
  ];

  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-10 text-center">
        <div className="bg-primary/10 mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full">
          <Shield className="text-primary h-7 w-7" />
        </div>
        <h1 className="text-display-3xl text-foreground font-bold">{t('title')}</h1>
        <p className="text-caption text-muted-foreground mt-1">{t('lastUpdated')}</p>
      </div>

      <p className="text-body text-foreground/80 mb-8 leading-relaxed">{t('intro')}</p>

      <div className="space-y-6">
        {sections.map((section) => (
          <Card key={section.title} className="p-6">
            <h2 className="text-body-lg text-foreground mb-2 font-semibold">{section.title}</h2>
            <p className="text-body text-foreground/80 leading-relaxed">{section.text}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
