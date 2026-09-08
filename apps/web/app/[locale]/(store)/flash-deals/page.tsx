import { getTranslations } from 'next-intl/server';

import { getHomeConfig } from '@/lib/home-config';

import { FlashDealsPageClient } from './FlashDealsPageClient';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Flash Deals',
  description:
    'Grab limited-time flash deals on premium electronics and gadgets. Hurry — while stocks last!',
  openGraph: {
    title: 'Flash Deals | Tuktak',
    description:
      'Limited-time flash deals on smartphones, laptops, audio gear and more. Best prices in Bangladesh.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Flash Deals | Tuktak',
    description: 'Limited-time flash deals on premium electronics. Grab them before they are gone!',
  },
};

export default async function FlashDealsPage() {
  const [t, config] = await Promise.all([getTranslations('home'), getHomeConfig()]);

  const flash = config.sections.flashDeal;

  return (
    <FlashDealsPageClient
      title={flash.title || t('flashDeal')}
      titleBn={flash.titleBn || ''}
      endsAt={flash.endsAt || ''}
      tabs={flash.tabs}
      productIds={flash.productIds}
    />
  );
}
