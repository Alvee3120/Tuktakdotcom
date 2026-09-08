import { Container, Section } from '@/components/shared/Layout';
import { ProductDetailClient } from '@/components/store/ProductDetailClient';

import type { Product } from '@/hooks/useProducts';
import type { Metadata } from 'next';

type ProductDetailResponse = {
  success: boolean;
  data: Product;
};

type PageProps = {
  params: Promise<{ slug: string; locale: string }>;
};

async function getProduct(slug: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';
    const res = await fetch(`${baseUrl}/api/products/${slug}`, { next: { revalidate: 300 } });
    if (!res.ok) {
      if (res.status !== 404) {
        console.error(`[ProductDetail] API returned ${res.status} for slug="${slug}"`);
      }
      return null;
    }
    const data: ProductDetailResponse = await res.json();
    return data.data;
  } catch (error) {
    console.error(`[ProductDetail] Fetch failed for slug="${slug}":`, error);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: 'Product Not Found' };
  return {
    title: product.name,
    description: product.description?.slice(0, 160) ?? 'Shop this product at Tuktak.com',
    openGraph: {
      title: `${product.name} | Tuktak`,
      description: product.description?.slice(0, 160) ?? '',
      images: product.image ? [{ url: product.image, width: 1200, height: 630 }] : [],
    },
  };
}

export default function ProductDetailPage({ params }: PageProps) {
  return (
    <Section>
      <Container>
        <ProductDetailClientWrapper params={params} />
      </Container>
    </Section>
  );
}

async function ProductDetailClientWrapper({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h1 className="text-heading-lg font-bold">Product Not Found</h1>
        <p className="text-body-md text-muted-foreground mt-2">
          The product you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
      </div>
    );
  }
  return <ProductDetailClient product={product} />;
}
