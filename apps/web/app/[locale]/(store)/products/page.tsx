import { ProductsPageClient } from '@/components/store/ProductsPageClient';
import { getHomeConfig } from '@/lib/home-config';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'All Products',
  description:
    'Browse our complete collection of premium electronics and gadgets — smartphones, laptops, audio, smartwatches and more at the best prices in Bangladesh.',
  openGraph: {
    title: 'All Products | Tuktak',
    description:
      'Browse premium electronics and gadgets at unbeatable prices. Free delivery on orders over ৳5,000.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'All Products | Tuktak',
    description: 'Browse premium electronics and gadgets at unbeatable prices in Bangladesh.',
  },
};

export default async function ProductsPage() {
  const { productCardStyle } = await getHomeConfig();
  return <ProductsPageClient cardStyle={productCardStyle} />;
}
