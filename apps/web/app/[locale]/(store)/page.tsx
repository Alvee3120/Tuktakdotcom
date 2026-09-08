import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { BestSellers } from '@/components/store/BestSellers';
import { BrandCarousel } from '@/components/store/BrandCarousel';
import { CategoryCircles } from '@/components/store/CategoryCircles';
import { CategoryShowcase } from '@/components/store/CategoryShowcase';
import { CategoryTabsShowcase } from '@/components/store/CategoryTabsShowcase';
import { FlashDeal } from '@/components/store/FlashDeal';
import { HeroSection, type HeroSlide } from '@/components/store/HeroSection';
import { PromoBanners } from '@/components/store/PromoBanners';
import { TabbedProductShowcase } from '@/components/store/TabbedProductShowcase';
import { TrendingProducts } from '@/components/store/TrendingProducts';
import { getHomeConfig, type SectionKey } from '@/lib/home-config';

async function getHeroSlides(): Promise<HeroSlide[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';
  try {
    const res = await fetch(`${apiUrl}/api/hero-slides`, {
      next: { tags: ['hero-slides'], revalidate: 0 },
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { success?: boolean; data?: unknown };
    return body.success && Array.isArray(body.data) ? (body.data as HeroSlide[]) : [];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [t, heroSlides, config] = await Promise.all([
    getTranslations('home'),
    getHeroSlides(),
    getHomeConfig(),
  ]);
  const { sections, sectionOrder } = config;

  const renderSection = (key: SectionKey) => {
    switch (key) {
      case 'categoryCircles':
        return sections.categoryCircles.enabled ? (
          <CategoryCircles
            key={key}
            style={sections.categoryCircles.style}
            visibleCount={sections.categoryCircles.visibleCount}
          />
        ) : null;

      case 'flashDeal':
        return sections.flashDeal.enabled &&
          (sections.flashDeal.tabs.length > 0 || sections.flashDeal.productIds.length > 0) ? (
          <FlashDeal
            key={key}
            title={sections.flashDeal.title || undefined}
            titleBn={sections.flashDeal.titleBn || undefined}
            endsAt={sections.flashDeal.endsAt || undefined}
            tabs={sections.flashDeal.tabs}
            productIds={sections.flashDeal.productIds}
            style={sections.flashDeal.style}
            grid={sections.flashDeal.grid}
          />
        ) : null;

      case 'tabbedShowcase':
        return sections.tabbedShowcase?.enabled && sections.tabbedShowcase.tabs.length > 0 ? (
          <TabbedProductShowcase
            key={key}
            title={sections.tabbedShowcase.title || undefined}
            titleBn={sections.tabbedShowcase.titleBn || undefined}
            subtitle={sections.tabbedShowcase.subtitle || undefined}
            subtitleBn={sections.tabbedShowcase.subtitleBn || undefined}
            titleAlign={sections.tabbedShowcase.titleAlign}
            tabs={sections.tabbedShowcase.tabs}
            style={sections.tabbedShowcase.style}
            grid={sections.tabbedShowcase.grid}
            cardVariant={config.productCardStyle}
          />
        ) : null;

      case 'categoryTabsShowcase':
        return sections.categoryTabsShowcase?.enabled &&
          sections.categoryTabsShowcase.tabs.length > 0 ? (
          <CategoryTabsShowcase
            key={key}
            title={sections.categoryTabsShowcase.title || undefined}
            titleBn={sections.categoryTabsShowcase.titleBn || undefined}
            titleAlign={sections.categoryTabsShowcase.titleAlign}
            tabs={sections.categoryTabsShowcase.tabs}
            showAllTab={sections.categoryTabsShowcase.showAllTab}
            style={sections.categoryTabsShowcase.style}
            grid={sections.categoryTabsShowcase.grid}
            cardVariant={config.productCardStyle}
          />
        ) : null;

      case 'trending':
        return sections.trending.enabled ? (
          <TrendingProducts
            key={key}
            title={sections.trending.title || t('trending')}
            titleBn={sections.trending.titleBn || undefined}
            subtitle={sections.trending.subtitle || undefined}
            subtitleBn={sections.trending.subtitleBn || undefined}
            titleAlign={sections.trending.titleAlign}
            sort="rating"
            viewAllHref="/products?sort=rating"
            tabs={sections.trending.tabs}
            showAllTab={sections.trending.showAllTab}
            style={sections.trending.style}
            cardVariant={config.productCardStyle}
            grid={sections.trending.grid}
          />
        ) : null;

      case 'newArrivals':
        return sections.newArrivals.enabled ? (
          <TrendingProducts
            key={key}
            title={sections.newArrivals.title || t('newArrivals')}
            titleBn={sections.newArrivals.titleBn || undefined}
            subtitle={sections.newArrivals.subtitle || undefined}
            subtitleBn={sections.newArrivals.subtitleBn || undefined}
            titleAlign={sections.newArrivals.titleAlign}
            sort="newest"
            viewAllHref="/products?sort=newest"
            tabs={sections.newArrivals.tabs}
            showAllTab={sections.newArrivals.showAllTab}
            style={sections.newArrivals.style}
            cardVariant={config.productCardStyle}
            grid={sections.newArrivals.grid}
          />
        ) : null;

      case 'showcase':
        return sections.showcase.enabled ? (
          <CategoryShowcase
            key={key}
            title={sections.showcase.title || undefined}
            titleBn={sections.showcase.titleBn || undefined}
            subtitle={sections.showcase.subtitle || undefined}
            subtitleBn={sections.showcase.subtitleBn || undefined}
            featureImage={sections.showcase.featureImage || undefined}
            featureTitle={sections.showcase.featureTitle || undefined}
            featureTitleBn={sections.showcase.featureTitleBn || undefined}
            featureDesc={sections.showcase.featureDesc || undefined}
            featureDescBn={sections.showcase.featureDescBn || undefined}
            featureCta={sections.showcase.featureCta || undefined}
            featureCtaBn={sections.showcase.featureCtaBn || undefined}
            featureLink={sections.showcase.featureLink || undefined}
            tabs={sections.showcase.tabs}
            productIds={sections.showcase.productIds}
            style={sections.showcase.style}
          />
        ) : null;

      case 'bestsellers':
        return sections.bestsellers.enabled ? (
          <BestSellers
            key={key}
            title={sections.bestsellers.title || undefined}
            titleBn={sections.bestsellers.titleBn || undefined}
            subtitle={sections.bestsellers.subtitle || undefined}
            subtitleBn={sections.bestsellers.subtitleBn || undefined}
            titleAlign={sections.bestsellers.titleAlign}
            tabs={sections.bestsellers.tabs}
            showAllTab={sections.bestsellers.showAllTab}
            style={sections.bestsellers.style}
            cardVariant={config.productCardStyle}
            grid={sections.bestsellers.grid}
          />
        ) : null;

      case 'promoBanners':
        return sections.promoBanners.enabled ? (
          <PromoBanners
            key={key}
            style={sections.promoBanners.style}
            items={sections.promoBanners.items}
          />
        ) : null;

      case 'brandCarousel':
        return sections.brandCarousel.enabled ? (
          <BrandCarousel
            key={key}
            style={sections.brandCarousel.style}
            adminBrands={sections.brandCarousel.brands}
          />
        ) : null;

      case 'featureBar':
        return null; // FeatureBar is rendered in the layout, not in the section order

      default:
        return null;
    }
  };

  return (
    <>
      <HeroSection slides={heroSlides} variant={config.heroStyle} />

      {sectionOrder.map((key) => renderSection(key))}

      {(sections.trending.enabled || sections.newArrivals.enabled) && (
        <div className="mx-auto max-w-screen-2xl px-2 py-10 sm:px-3 lg:px-4 lg:py-12">
          <div className="relative overflow-hidden rounded-[28px] border border-primary/10 bg-gradient-to-br from-primary/[0.07] via-background to-primary/[0.04] p-[1px]">
            <div className="relative rounded-[27px] bg-gradient-to-br from-background via-background to-muted/30 px-6 py-8 sm:px-10 sm:py-10">
              {/* Decorative blurs */}
              <div className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
              <div className="relative flex flex-col items-center gap-4 text-center">
                <div className="flex items-center gap-3">
                  <span className="h-px w-8 bg-gradient-to-r from-transparent to-primary/30 sm:w-12" />
                  <span className="bg-primary/10 text-primary inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em]">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                    Discover More
                  </span>
                  <span className="h-px w-8 bg-gradient-to-l from-transparent to-primary/30 sm:w-12" />
                </div>
                <h3 className="text-foreground max-w-xl text-xl font-bold tracking-tight sm:text-2xl">
                  Explore the Full Collection
                </h3>
                <p className="text-muted-foreground max-w-md text-sm leading-relaxed">
                  Hand-picked products, trending now and new arrivals — all in one place.
                </p>
                <Link
                  href="/products"
                  className="group bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20 hover:shadow-primary/30 inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
                >
                  {t('showMore')}
                  <span className="bg-primary-foreground/15 group-hover:bg-primary-foreground/20 flex h-6 w-6 items-center justify-center rounded-full transition-colors">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="transition-transform duration-300 group-hover:translate-x-0.5"
                    >
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </span>
                </Link>
                <div className="text-muted-foreground/60 flex items-center gap-2 text-[10px] font-medium uppercase tracking-widest">
                  <span>Trusted by 10k+ shoppers</span>
                  <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                  <span>Free delivery over ৳5,000</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
