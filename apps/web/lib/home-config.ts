import { cache } from 'react';

import { API_URL } from '@/lib/constants';

/**
 * Admin-configurable home page settings.
 *
 * Fetched server-side from the public /api/home-config endpoint (settings
 * key `homeConfig`, JSON string) with the `home-config` ISR tag — on-demand
 * revalidation triggered by the API when an admin saves, so changes are
 * instant instead of waiting for a TTL window.
 */

export type FeatureItem = {
  title: string;
  titleBn?: string;
  desc: string;
  descBn?: string;
  icon?: string;
};

/** A single brand item in the carousel. */
export type BrandCarouselItem = {
  id: string;
  name: string;
  slug: string;
  /** Brand logo image URL */
  logo: string;
  /** Optional link URL (defaults to /products?brand={slug}) */
  href?: string;
};

/** A single tab inside the Flash Deal section. */
export type FlashDealTab = {
  id: string;
  label: string;
  labelBn?: string;
  /** Hand-picked product IDs for this tab */
  productIds: string[];
};

/** A single tab in the Featured Showcase (carousel mode). */
export type ShowcaseTab = {
  id: string;
  label: string;
  labelBn?: string;
  productIds: string[];
};

/** A single promo banner item. */
export type PromoBannerItem = {
  id: string;
  title: string;
  titleBn?: string;
  desc: string;
  descBn?: string;
  /** Background image URL (full cover) */
  image: string;
  /** Link destination (product URL, category URL, etc.) */
  href: string;
  /** Accent color overlay (hex) */
  accentColor?: string;
};

/** A single tab inside the Tabbed Product Showcase section. */
export type TabbedShowcaseTab = {
  id: string;
  label: string;
  labelBn?: string;
  productIds: string[];
};

/** A single tab inside the Category Tabs Showcase section. */
export type CategoryTabsTab = {
  id: string;
  label: string;
  labelBn?: string;
  /** 'category' = auto-fetch products from a DB category; 'custom' = hand-picked product IDs */
  type: 'category' | 'custom';
  /** Category ID (used when type === 'category') */
  categoryId?: string;
  /** Hand-picked product IDs (used when type === 'custom') */
  productIds?: string[];
};

/** Grid layout configuration for sections that support grid mode. */
export type GridConfig = {
  /** Number of columns on desktop (lg breakpoint). 2–6 */
  columns: number;
  /** Number of rows to display. 1–6 */
  rows: number;
};

/** Storefront branding — brand color + logo/favicon (all admin-managed). */
export type Branding = {
  /** Primary brand color (hex). Empty = keep the built-in theme color. */
  primaryColor: string;
  /** Logo shown in light mode (URL). Empty = default /logo/logo_light_mode.png */
  logoLight: string;
  /** Logo shown in dark mode (URL). Empty = default /logo/logo_dark_mode.png */
  logoDark: string;
  /** Favicon URL. Empty = default app/favicon.ico */
  favicon: string;
};

export type SectionKey =
  | 'categoryCircles'
  | 'flashDeal'
  | 'tabbedShowcase'
  | 'categoryTabsShowcase'
  | 'trending'
  | 'newArrivals'
  | 'showcase'
  | 'bestsellers'
  | 'promoBanners'
  | 'brandCarousel'
  | 'featureBar';

export type HomeConfig = {
  productCardStyle: 'default' | 'compact';
  /** Header layout: floating rounded pill (default) or full-width solid bar */
  headerStyle: 'floating' | 'full';
  /** Hero layout: boxed (max-width, rounded) or full-bleed edge-to-edge */
  heroStyle: 'boxed' | 'full';
  branding: Branding;
  /** Ordered list of section keys — determines render order on the homepage */
  sectionOrder: SectionKey[];
  sections: {
    categoryCircles: { enabled: boolean; style: 'circle' | 'card'; visibleCount: number };
    flashDeal: {
      enabled: boolean;
      title?: string;
      titleBn?: string;
      endsAt?: string;
      tabs: FlashDealTab[];
      productIds: string[];
      style: 'grid' | 'carousel';
      grid?: GridConfig;
    };
    trending: {
      enabled: boolean;
      title?: string;
      titleBn?: string;
      subtitle?: string;
      subtitleBn?: string;
      titleAlign?: 'left' | 'center' | 'right';
      tabs: CategoryTabsTab[];
      showAllTab?: boolean;
      style: 'carousel' | 'grid';
      grid?: GridConfig;
    };
    newArrivals: {
      enabled: boolean;
      title?: string;
      titleBn?: string;
      subtitle?: string;
      subtitleBn?: string;
      titleAlign?: 'left' | 'center' | 'right';
      tabs: CategoryTabsTab[];
      showAllTab?: boolean;
      style: 'carousel' | 'grid';
      grid?: GridConfig;
    };
    showcase: {
      enabled: boolean;
      title?: string;
      titleBn?: string;
      subtitle?: string;
      subtitleBn?: string;
      featureImage?: string;
      featureTitle?: string;
      featureTitleBn?: string;
      featureDesc?: string;
      featureDescBn?: string;
      featureCta?: string;
      featureCtaBn?: string;
      featureLink?: string;
      tabs: ShowcaseTab[];
      productIds: string[];
      style: 'spotlight' | 'carousel';
      grid?: GridConfig;
    };
    bestsellers: {
      enabled: boolean;
      title?: string;
      titleBn?: string;
      subtitle?: string;
      subtitleBn?: string;
      titleAlign?: 'left' | 'center' | 'right';
      tabs: CategoryTabsTab[];
      showAllTab?: boolean;
      style: 'split' | 'grid';
      grid?: GridConfig;
    };
    tabbedShowcase: {
      enabled: boolean;
      title?: string;
      titleBn?: string;
      subtitle?: string;
      subtitleBn?: string;
      titleAlign?: 'left' | 'center' | 'right';
      tabs: TabbedShowcaseTab[];
      style?: 'grid' | 'carousel';
      grid?: GridConfig;
    };
    categoryTabsShowcase: {
      enabled: boolean;
      title?: string;
      titleBn?: string;
      titleAlign?: 'left' | 'center' | 'right';
      tabs: CategoryTabsTab[];
      showAllTab?: boolean;
      style?: 'grid' | 'carousel';
      grid?: GridConfig;
    };
    promoBanners: { enabled: boolean; style: 'twoCol' | 'stacked'; items: PromoBannerItem[] };
    brandCarousel: { enabled: boolean; style: 'carousel' | 'grid'; brands: BrandCarouselItem[] };
    featureBar: { enabled: boolean; items: FeatureItem[] };
  };
};

export const DEFAULT_GRID_CONFIG: GridConfig = { columns: 4, rows: 2 };

export const DEFAULT_HOME_CONFIG: HomeConfig = {
  productCardStyle: 'default',
  headerStyle: 'floating',
  heroStyle: 'boxed',
  branding: { primaryColor: '', logoLight: '', logoDark: '', favicon: '' },
  sectionOrder: [
    'categoryCircles',
    'flashDeal',
    'tabbedShowcase',
    'categoryTabsShowcase',
    'trending',
    'newArrivals',
    'showcase',
    'bestsellers',
    'promoBanners',
    'brandCarousel',
    'featureBar',
  ],
  sections: {
    categoryCircles: { enabled: true, style: 'circle', visibleCount: 6 },
    flashDeal: {
      enabled: true,
      title: '',
      endsAt: '',
      tabs: [],
      productIds: [],
      style: 'grid',
      grid: { ...DEFAULT_GRID_CONFIG, columns: 6, rows: 1 },
    },
    trending: {
      enabled: true,
      title: '',
      titleAlign: 'left',
      tabs: [],
      showAllTab: false,
      style: 'carousel',
      grid: { ...DEFAULT_GRID_CONFIG },
    },
    newArrivals: {
      enabled: true,
      title: '',
      titleAlign: 'left',
      tabs: [],
      showAllTab: false,
      style: 'carousel',
      grid: { ...DEFAULT_GRID_CONFIG },
    },
    showcase: {
      enabled: true,
      title: '',
      featureImage: '',
      tabs: [],
      productIds: [],
      style: 'spotlight',
      grid: { ...DEFAULT_GRID_CONFIG, columns: 3, rows: 2 },
    },
    tabbedShowcase: {
      enabled: false,
      title: '',
      subtitle: '',
      titleAlign: 'left',
      tabs: [],
      style: 'grid',
      grid: { ...DEFAULT_GRID_CONFIG },
    },
    categoryTabsShowcase: {
      enabled: false,
      title: '',
      titleAlign: 'left',
      tabs: [],
      showAllTab: false,
      style: 'grid',
      grid: { ...DEFAULT_GRID_CONFIG },
    },
    bestsellers: {
      enabled: true,
      title: '',
      titleAlign: 'left',
      tabs: [],
      showAllTab: false,
      style: 'split',
      grid: { ...DEFAULT_GRID_CONFIG },
    },
    promoBanners: { enabled: true, style: 'twoCol', items: [] },
    brandCarousel: { enabled: true, style: 'carousel', brands: [] },
    featureBar: { enabled: true, items: [] },
  },
};

/** Deep-merge a partial stored config onto the defaults (one level per section). */
export function mergeHomeConfig(raw: unknown): HomeConfig {
  const partial = (raw ?? {}) as Partial<HomeConfig>;
  const sections = (partial.sections ?? {}) as Partial<HomeConfig['sections']>;
  const d = DEFAULT_HOME_CONFIG.sections;

  const mergeGrid = (
    base: GridConfig | undefined,
    override: GridConfig | undefined
  ): GridConfig => ({
    columns: override?.columns ?? base?.columns ?? DEFAULT_GRID_CONFIG.columns,
    rows: override?.rows ?? base?.rows ?? DEFAULT_GRID_CONFIG.rows,
  });

  const allKeys = Object.keys(d) as SectionKey[];
  const storedOrder = partial.sectionOrder;
  const sectionOrder: SectionKey[] = Array.isArray(storedOrder)
    ? [...new Set([...storedOrder.filter((k) => allKeys.includes(k as SectionKey)), ...allKeys])]
    : allKeys;

  return {
    productCardStyle: partial.productCardStyle === 'compact' ? 'compact' : 'default',
    headerStyle: partial.headerStyle === 'full' ? 'full' : 'floating',
    heroStyle: partial.heroStyle === 'full' ? 'full' : 'boxed',
    branding: { ...DEFAULT_HOME_CONFIG.branding, ...(partial.branding ?? {}) },
    sectionOrder,
    sections: {
      categoryCircles: { ...d.categoryCircles, ...sections.categoryCircles },
      flashDeal: {
        ...d.flashDeal,
        ...sections.flashDeal,
        tabs: sections.flashDeal?.tabs ?? [],
        productIds: sections.flashDeal?.productIds ?? [],
        grid: mergeGrid(d.flashDeal.grid, sections.flashDeal?.grid),
      },
      trending: {
        ...d.trending,
        ...sections.trending,
        tabs: sections.trending?.tabs ?? [],
        grid: mergeGrid(d.trending.grid, sections.trending?.grid),
      },
      newArrivals: {
        ...d.newArrivals,
        ...sections.newArrivals,
        tabs: sections.newArrivals?.tabs ?? [],
        grid: mergeGrid(d.newArrivals.grid, sections.newArrivals?.grid),
      },
      showcase: {
        ...d.showcase,
        ...sections.showcase,
        productIds: sections.showcase?.productIds ?? [],
        tabs: sections.showcase?.tabs ?? [],
        grid: mergeGrid(d.showcase.grid, sections.showcase?.grid),
      },
      tabbedShowcase: {
        ...d.tabbedShowcase,
        ...sections.tabbedShowcase,
        tabs: sections.tabbedShowcase?.tabs ?? [],
        grid: mergeGrid(d.tabbedShowcase.grid, sections.tabbedShowcase?.grid),
      },
      categoryTabsShowcase: {
        ...d.categoryTabsShowcase,
        ...sections.categoryTabsShowcase,
        tabs: sections.categoryTabsShowcase?.tabs ?? [],
        grid: mergeGrid(d.categoryTabsShowcase.grid, sections.categoryTabsShowcase?.grid),
      },
      bestsellers: {
        ...d.bestsellers,
        ...sections.bestsellers,
        tabs: sections.bestsellers?.tabs ?? [],
        grid: mergeGrid(d.bestsellers.grid, sections.bestsellers?.grid),
      },
      promoBanners: {
        ...d.promoBanners,
        ...sections.promoBanners,
        items: sections.promoBanners?.items ?? [],
      },
      brandCarousel: {
        ...d.brandCarousel,
        ...sections.brandCarousel,
        brands: sections.brandCarousel?.brands ?? [],
      },
      featureBar: {
        ...d.featureBar,
        ...sections.featureBar,
        items: sections.featureBar?.items ?? [],
      },
    },
  };
}

/** Server-side fetch of the home config; falls back to defaults on any error.
 * Uses the `home-config` ISR tag so the API's on-demand revalidation trigger
 * (POST /revalidate?tag=home-config) invalidates the cache instantly on save.
 * Wrapped in React cache() so concurrent calls (layout + page) share one fetch. */
export const getHomeConfig = cache(async (): Promise<HomeConfig> => {
  try {
    const res = await fetch(`${API_URL}/api/home-config`, {
      next: { tags: ['home-config'], revalidate: 0 },
    });
    if (!res.ok) return DEFAULT_HOME_CONFIG;
    const body = (await res.json()) as { success?: boolean; data?: unknown };
    return body.success ? mergeHomeConfig(body.data) : DEFAULT_HOME_CONFIG;
  } catch {
    return DEFAULT_HOME_CONFIG;
  }
});
