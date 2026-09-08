type ProductJsonLdProps = {
  name: string;
  description: string;
  image: string;
  price: number;
  currency: string;
  availability: 'InStock' | 'OutOfStock' | 'PreOrder';
  url: string;
  brand?: string;
  rating?: number;
  reviewCount?: number;
  sku?: string;
};

import Script from 'next/script';

export function ProductJsonLd({
  name,
  description,
  image,
  price,
  currency,
  availability,
  url,
  brand,
  rating,
  reviewCount,
  sku,
}: ProductJsonLdProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    image,
    url,
    sku,
    brand: brand ? { '@type': 'Brand', name: brand } : undefined,
    offers: {
      '@type': 'Offer',
      priceCurrency: currency,
      price: price.toFixed(2),
      availability: `https://schema.org/${availability}`,
      url,
    },
    ...(rating && reviewCount
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: rating.toFixed(1),
            reviewCount: reviewCount.toString(),
          },
        }
      : {}),
  };

  return (
    <Script
      id="product-jsonld"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
