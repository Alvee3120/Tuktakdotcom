'use client';

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  CircleDashed,
  Zap,
  Layers,
  Grid3x3,
  TrendingUp,
  Sparkles,
  LayoutGrid,
  Award,
  Megaphone,
  Gem,
  ShieldCheck,
  GripVertical,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useState } from 'react';

import { SingleImageUploader } from '@/components/dashboard/ImageUploader';
import { ProductPicker } from '@/components/dashboard/ProductPicker';
import { FEATURE_BAR_ICONS } from '@/components/store/FeatureBar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCategories } from '@/hooks/useCatalog';
import { cn } from '@/lib/utils';

import type {
  SectionKey,
  HomeConfig,
  GridConfig,
  TabbedShowcaseTab,
  CategoryTabsTab,
  PromoBannerItem,
  BrandCarouselItem,
  ShowcaseTab,
  FeatureItem,
  FlashDealTab,
} from '@/lib/home-config';

/* ─── Section metadata ─── */
const SECTION_META: Record<
  SectionKey,
  {
    icon: React.ElementType;
    label: string;
    desc: string;
    color: string;
    bgColor: string;
  }
> = {
  categoryCircles: {
    icon: CircleDashed,
    label: 'Category Circles',
    desc: 'Horizontal scrollable category pills',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  flashDeal: {
    icon: Zap,
    label: 'Flash Deal',
    desc: 'Countdown timer + hand-picked products',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
  tabbedShowcase: {
    icon: Layers,
    label: 'Tabbed Showcase',
    desc: 'Collection tabs with curated products',
    color: 'text-violet-500',
    bgColor: 'bg-violet-500/10',
  },
  categoryTabsShowcase: {
    icon: Grid3x3,
    label: 'Category Tabs',
    desc: 'Auto-fetch from categories or hand-picked',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
  },
  trending: {
    icon: TrendingUp,
    label: 'Trending Products',
    desc: 'Top-rated products carousel or grid',
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10',
  },
  newArrivals: {
    icon: Sparkles,
    label: 'New Arrivals',
    desc: 'Latest products showcase',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
  },
  showcase: {
    icon: LayoutGrid,
    label: 'Featured Showcase',
    desc: 'Big feature image + product grid',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  bestsellers: {
    icon: Award,
    label: 'Bestsellers',
    desc: 'Top sellers with ratings',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
  },
  promoBanners: {
    icon: Megaphone,
    label: 'Promo Banners',
    desc: 'Marketing banners in two-column or stacked',
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
  },
  brandCarousel: {
    icon: Gem,
    label: 'Brand Carousel',
    desc: 'Featured brand logos carousel',
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10',
  },
  featureBar: {
    icon: ShieldCheck,
    label: 'Feature Bar',
    desc: 'Trust badges above the footer',
    color: 'text-teal-500',
    bgColor: 'bg-teal-500/10',
  },
};

const inputCls =
  'w-full rounded-lg border border-border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground/70 focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-300';

/* ─── Toggle ─── */
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="relative inline-flex cursor-pointer items-center">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <div className="bg-muted peer-checked:bg-primary h-5 w-9 rounded-full transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-full" />
    </label>
  );
}

/* ─── Grid config inline editor ─── */
function GridConfigEditor({
  grid,
  onChange,
}: {
  grid: GridConfig;
  onChange: (g: GridConfig) => void;
}) {
  return (
    <div className="bg-muted/40 flex flex-wrap items-center gap-3 rounded-lg px-3 py-2">
      <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
        Grid
      </span>
      <div className="flex items-center gap-1.5">
        <Label className="text-muted-foreground text-[10px]">Cols</Label>
        <select
          value={grid.columns}
          onChange={(e) => onChange({ ...grid, columns: Number(e.target.value) })}
          className="border-border bg-card h-7 rounded-md border px-1.5 text-xs focus:outline-none"
        >
          {[2, 3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-1.5">
        <Label className="text-muted-foreground text-[10px]">Rows</Label>
        <select
          value={grid.rows}
          onChange={(e) => onChange({ ...grid, rows: Number(e.target.value) })}
          className="border-border bg-card h-7 rounded-md border px-1.5 text-xs focus:outline-none"
        >
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <span className="text-muted-foreground text-[10px]">
        {grid.columns}×{grid.rows} = {grid.columns * grid.rows}
      </span>
    </div>
  );
}

/* ─── Sortable section card ─── */
function SortableSectionCard({
  id,
  sectionKey,
  config,
  expanded,
  onToggleExpand,
  onToggleEnabled,
  onUpdate,
  children,
}: {
  id: string;
  sectionKey: SectionKey;
  config: { enabled: boolean; [k: string]: unknown };
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleEnabled: (v: boolean) => void;
  onUpdate?: (patch: Record<string, unknown>) => void;
  children?: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const meta = SECTION_META[sectionKey];
  const Icon = meta.icon;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'bg-card rounded-xl border transition-shadow',
        isDragging ? 'border-primary/30 shadow-xl' : 'border-border hover:border-border/80'
      )}
    >
      {/* Header row — larger touch targets on mobile */}
      <div className="flex items-center gap-2 px-3 py-3 sm:gap-3 sm:py-2.5">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="text-muted-foreground/50 hover:text-muted-foreground shrink-0 cursor-grab rounded-md p-1 active:cursor-grabbing"
          tabIndex={-1}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Icon */}
        <div
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
            meta.bgColor
          )}
        >
          <Icon className={cn('h-4 w-4', meta.color)} />
        </div>

        {/* Label + desc */}
        <div className="min-w-0 flex-1">
          <p className="text-foreground truncate text-sm font-semibold">{meta.label}</p>
          <p className="text-muted-foreground hidden truncate text-[10px] sm:block">{meta.desc}</p>
        </div>

        {/* Toggle */}
        <Toggle checked={config.enabled} onChange={onToggleEnabled} />

        {/* Expand — larger tap target on mobile */}
        <button
          onClick={onToggleExpand}
          className="border-border text-muted-foreground hover:bg-muted hover:text-foreground shrink-0 rounded-lg border p-2 transition-colors sm:p-1.5"
        >
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* Expanded config — tighter on mobile */}
      {expanded && <div className="border-border space-y-3 border-t p-3 sm:px-4 sm:py-4">{children}</div>}
    </div>
  );
}

/* ─── Section-specific config panels ─── */
function SectionConfig({
  sectionKey,
  sections,
  setSection,
}: {
  sectionKey: SectionKey;
  sections: HomeConfig['sections'];
  setSection: <K extends keyof HomeConfig['sections']>(
    key: K,
    patch: Partial<HomeConfig['sections'][K]>
  ) => void;
}) {
  const s = sections;

  switch (sectionKey) {
    /* ── Category Circles ── */
    case 'categoryCircles':
      return (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Style</Label>
              <select
                value={s.categoryCircles.style}
                onChange={(e) =>
                  setSection('categoryCircles', { style: e.target.value as 'circle' | 'card' })
                }
                className={inputCls}
              >
                <option value="circle">Circles</option>
                <option value="card">Cards</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Visible per view</Label>
              <select
                value={s.categoryCircles.visibleCount}
                onChange={(e) =>
                  setSection('categoryCircles', { visibleCount: Number(e.target.value) })
                }
                className={inputCls}
              >
                {[3, 4, 5, 6, 7, 8].map((n) => (
                  <option key={n} value={n}>
                    {n} items
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-muted-foreground text-[10px]">
            Categories are fetched automatically from your database. Shows top-level categories
            only.
          </p>
        </div>
      );

    /* ── Flash Deal ── */
    case 'flashDeal':
      return (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Title (EN)</Label>
              <Input
                value={s.flashDeal.title ?? ''}
                onChange={(e) => setSection('flashDeal', { title: e.target.value })}
                placeholder="Flash Deal"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Title (BN)</Label>
              <Input
                value={s.flashDeal.titleBn ?? ''}
                onChange={(e) => setSection('flashDeal', { titleBn: e.target.value })}
                placeholder="ফ্ল্যাশ ডিল"
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Ends at</Label>
              <input
                type="datetime-local"
                value={(() => {
                  const v = s.flashDeal.endsAt;
                  if (!v) return '';
                  const d = new Date(v);
                  return Number.isNaN(d.getTime())
                    ? ''
                    : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                })()}
                onChange={(e) => {
                  const v = e.target.value;
                  setSection('flashDeal', { endsAt: v ? new Date(v).toISOString() : '' });
                }}
                className={inputCls}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Layout</Label>
              <select
                value={s.flashDeal.style}
                onChange={(e) =>
                  setSection('flashDeal', { style: e.target.value as 'grid' | 'carousel' })
                }
                className={inputCls}
              >
                <option value="grid">Grid</option>
                <option value="carousel">Carousel</option>
              </select>
            </div>
          </div>
          {s.flashDeal.style === 'grid' && (
            <GridConfigEditor
              grid={s.flashDeal.grid ?? { columns: 6, rows: 1 }}
              onChange={(g) => setSection('flashDeal', { grid: g })}
            />
          )}

          {/* Tabs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Tabs</Label>
              <button
                onClick={() => {
                  const newTab: FlashDealTab = {
                    id: `fd-tab-${Date.now()}`,
                    label: '',
                    productIds: [],
                  };
                  setSection('flashDeal', { tabs: [...(s.flashDeal.tabs ?? []), newTab] });
                }}
                className="bg-primary/10 text-primary hover:bg-primary/20 rounded-md px-2 py-0.5 text-[10px] font-medium"
              >
                + Add Tab
              </button>
            </div>
            {(s.flashDeal.tabs ?? []).length === 0 && (
              <p className="text-muted-foreground text-[10px]">
                No tabs — all products show in a flat list. Add tabs to organize products by
                category.
              </p>
            )}
            {(s.flashDeal.tabs ?? []).map((tab, tabIdx) => (
              <div key={tab.id} className="border-border space-y-2 rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <GripVertical className="text-muted-foreground h-3.5 w-3.5" />
                  <Input
                    value={tab.label}
                    onChange={(e) => {
                      const updated = [...(s.flashDeal.tabs ?? [])];
                      updated[tabIdx] = { ...tab, label: e.target.value };
                      setSection('flashDeal', { tabs: updated });
                    }}
                    placeholder="Tab label (e.g. Electronics)"
                    className="h-7 flex-1 text-xs"
                  />
                  <Input
                    value={tab.labelBn ?? ''}
                    onChange={(e) => {
                      const updated = [...(s.flashDeal.tabs ?? [])];
                      updated[tabIdx] = { ...tab, labelBn: e.target.value };
                      setSection('flashDeal', { tabs: updated });
                    }}
                    placeholder="বাংলা"
                    className="h-7 w-24 text-xs"
                  />
                  <button
                    onClick={() => {
                      const updated = (s.flashDeal.tabs ?? []).filter((_, i) => i !== tabIdx);
                      setSection('flashDeal', { tabs: updated });
                    }}
                    className="text-destructive text-[10px] hover:underline"
                  >
                    Remove
                  </button>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-[10px]">Products in this tab</Label>
                  <ProductPicker
                    value={tab.productIds}
                    onChange={(ids) => {
                      const updated = [...(s.flashDeal.tabs ?? [])];
                      updated[tabIdx] = { ...tab, productIds: ids };
                      setSection('flashDeal', { tabs: updated });
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Fallback flat products (used when no tabs) */}
          {(s.flashDeal.tabs ?? []).length === 0 && (
            <div className="space-y-1">
              <Label className="text-xs">Products (flat list)</Label>
              <ProductPicker
                value={s.flashDeal.productIds}
                onChange={(ids) => setSection('flashDeal', { productIds: ids })}
              />
            </div>
          )}
        </div>
      );

    /* ── Tabbed Showcase ── */
    case 'tabbedShowcase':
      return (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Title (EN)</Label>
              <Input
                value={s.tabbedShowcase.title ?? ''}
                onChange={(e) => setSection('tabbedShowcase', { title: e.target.value })}
                placeholder="Shop by Collection"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Title (BN)</Label>
              <Input
                value={s.tabbedShowcase.titleBn ?? ''}
                onChange={(e) => setSection('tabbedShowcase', { titleBn: e.target.value })}
                placeholder="কালেকশন অনুযায়ী কিনুন"
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Subtitle (EN)</Label>
              <Input
                value={s.tabbedShowcase.subtitle ?? ''}
                onChange={(e) => setSection('tabbedShowcase', { subtitle: e.target.value })}
                placeholder="Browse our curated collections"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Subtitle (BN)</Label>
              <Input
                value={s.tabbedShowcase.subtitleBn ?? ''}
                onChange={(e) => setSection('tabbedShowcase', { subtitleBn: e.target.value })}
                placeholder="আমাদের সংগ্রহ দেখুন"
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs">Layout</Label>
              <select
                value={s.tabbedShowcase.style ?? 'grid'}
                onChange={(e) =>
                  setSection('tabbedShowcase', { style: e.target.value as 'grid' | 'carousel' })
                }
                className={inputCls}
              >
                <option value="grid">Grid</option>
                <option value="carousel">Carousel</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Title Align</Label>
              <select
                value={s.tabbedShowcase.titleAlign ?? 'left'}
                onChange={(e) =>
                  setSection('tabbedShowcase', {
                    titleAlign: e.target.value as 'left' | 'center' | 'right',
                  })
                }
                className={inputCls}
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>
          </div>
          {s.tabbedShowcase.style !== 'carousel' && (
            <GridConfigEditor
              grid={s.tabbedShowcase.grid ?? { columns: 4, rows: 2 }}
              onChange={(g) => setSection('tabbedShowcase', { grid: g })}
            />
          )}
          <TabsEditor
            tabs={s.tabbedShowcase.tabs}
            type="tabbed"
            onAdd={() => {
              const newTab: TabbedShowcaseTab = {
                id: `tab_${Date.now()}`,
                label: '',
                productIds: [],
              };
              setSection('tabbedShowcase', { tabs: [...s.tabbedShowcase.tabs, newTab] });
            }}
            onUpdate={(idx, patch) => {
              const updated = s.tabbedShowcase.tabs.map((t, i) =>
                i === idx ? { ...t, ...patch } : t
              );
              setSection('tabbedShowcase', { tabs: updated });
            }}
            onRemove={(idx) => {
              setSection('tabbedShowcase', {
                tabs: s.tabbedShowcase.tabs.filter((_, i) => i !== idx),
              });
            }}
          />
        </div>
      );

    /* ── Category Tabs Showcase ── */
    case 'categoryTabsShowcase':
      return (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Title (EN)</Label>
              <Input
                value={s.categoryTabsShowcase.title ?? ''}
                onChange={(e) => setSection('categoryTabsShowcase', { title: e.target.value })}
                placeholder="Our Products"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Title (BN)</Label>
              <Input
                value={s.categoryTabsShowcase.titleBn ?? ''}
                onChange={(e) => setSection('categoryTabsShowcase', { titleBn: e.target.value })}
                placeholder="আমাদের পণ্য"
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs">Layout</Label>
              <select
                value={s.categoryTabsShowcase.style ?? 'grid'}
                onChange={(e) =>
                  setSection('categoryTabsShowcase', {
                    style: e.target.value as 'grid' | 'carousel',
                  })
                }
                className={inputCls}
              >
                <option value="grid">Grid</option>
                <option value="carousel">Carousel</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Title Align</Label>
              <select
                value={s.categoryTabsShowcase.titleAlign ?? 'left'}
                onChange={(e) =>
                  setSection('categoryTabsShowcase', {
                    titleAlign: e.target.value as 'left' | 'center' | 'right',
                  })
                }
                className={inputCls}
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={s.categoryTabsShowcase.showAllTab ?? false}
                  onChange={(e) =>
                    setSection('categoryTabsShowcase', { showAllTab: e.target.checked })
                  }
                  className="border-border h-4 w-4 rounded accent-emerald-500"
                />
                <span className="text-muted-foreground text-xs">Show &quot;All&quot; tab</span>
              </label>
            </div>
          </div>
          {s.categoryTabsShowcase.style !== 'carousel' && (
            <GridConfigEditor
              grid={s.categoryTabsShowcase.grid ?? { columns: 4, rows: 2 }}
              onChange={(g) => setSection('categoryTabsShowcase', { grid: g })}
            />
          )}
          <TabsEditor
            tabs={s.categoryTabsShowcase.tabs}
            type="category"
            onAdd={() => {
              const newTab: CategoryTabsTab = {
                id: `ctab_${Date.now()}`,
                label: '',
                type: 'category',
                categoryId: '',
              };
              setSection('categoryTabsShowcase', {
                tabs: [...s.categoryTabsShowcase.tabs, newTab],
              });
            }}
            onUpdate={(idx, patch) => {
              const updated = s.categoryTabsShowcase.tabs.map((t, i) =>
                i === idx ? { ...t, ...patch } : t
              );
              setSection('categoryTabsShowcase', { tabs: updated });
            }}
            onRemove={(idx) => {
              setSection('categoryTabsShowcase', {
                tabs: s.categoryTabsShowcase.tabs.filter((_, i) => i !== idx),
              });
            }}
          />
        </div>
      );

    /* ── Trending ── */
    case 'trending':
      return (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Title (EN)</Label>
              <Input
                value={s.trending.title ?? ''}
                onChange={(e) => setSection('trending', { title: e.target.value })}
                placeholder="Trending Products"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Title (BN)</Label>
              <Input
                value={s.trending.titleBn ?? ''}
                onChange={(e) => setSection('trending', { titleBn: e.target.value })}
                placeholder="ট্রেন্ডিং প্রোডাক্ট"
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Subtitle (EN)</Label>
              <Input
                value={s.trending.subtitle ?? ''}
                onChange={(e) => setSection('trending', { subtitle: e.target.value })}
                placeholder="Top-rated products"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Subtitle (BN)</Label>
              <Input
                value={s.trending.subtitleBn ?? ''}
                onChange={(e) => setSection('trending', { subtitleBn: e.target.value })}
                placeholder="শীর্ষ রেটিং পণ্য"
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs">Layout</Label>
              <select
                value={s.trending.style}
                onChange={(e) =>
                  setSection('trending', { style: e.target.value as 'carousel' | 'grid' })
                }
                className={inputCls}
              >
                <option value="carousel">Carousel</option>
                <option value="grid">Grid</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Title Align</Label>
              <select
                value={s.trending.titleAlign ?? 'left'}
                onChange={(e) =>
                  setSection('trending', {
                    titleAlign: e.target.value as 'left' | 'center' | 'right',
                  })
                }
                className={inputCls}
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={s.trending.showAllTab ?? false}
                  onChange={(e) => setSection('trending', { showAllTab: e.target.checked })}
                  className="border-border h-4 w-4 rounded accent-emerald-500"
                />
                <span className="text-muted-foreground text-xs">Show &quot;All&quot; tab</span>
              </label>
            </div>
          </div>
          {s.trending.style !== 'carousel' && (
            <GridConfigEditor
              grid={s.trending.grid ?? { columns: 4, rows: 2 }}
              onChange={(g) => setSection('trending', { grid: g })}
            />
          )}
          <TabsEditor
            tabs={s.trending.tabs}
            type="category"
            onAdd={() => {
              const newTab: CategoryTabsTab = {
                id: `ttab_${Date.now()}`,
                label: '',
                type: 'category',
                categoryId: '',
              };
              setSection('trending', { tabs: [...s.trending.tabs, newTab] });
            }}
            onUpdate={(idx, patch) => {
              const updated = s.trending.tabs.map((t, i) => (i === idx ? { ...t, ...patch } : t));
              setSection('trending', { tabs: updated });
            }}
            onRemove={(idx) => {
              setSection('trending', { tabs: s.trending.tabs.filter((_, i) => i !== idx) });
            }}
          />
        </div>
      );

    /* ── New Arrivals ── */
    case 'newArrivals':
      return (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Title (EN)</Label>
              <Input
                value={s.newArrivals.title ?? ''}
                onChange={(e) => setSection('newArrivals', { title: e.target.value })}
                placeholder="New Arrivals"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Title (BN)</Label>
              <Input
                value={s.newArrivals.titleBn ?? ''}
                onChange={(e) => setSection('newArrivals', { titleBn: e.target.value })}
                placeholder="নতুন আগমন"
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Subtitle (EN)</Label>
              <Input
                value={s.newArrivals.subtitle ?? ''}
                onChange={(e) => setSection('newArrivals', { subtitle: e.target.value })}
                placeholder="Latest products"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Subtitle (BN)</Label>
              <Input
                value={s.newArrivals.subtitleBn ?? ''}
                onChange={(e) => setSection('newArrivals', { subtitleBn: e.target.value })}
                placeholder="সর্বশেষ পণ্য"
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs">Layout</Label>
              <select
                value={s.newArrivals.style}
                onChange={(e) =>
                  setSection('newArrivals', { style: e.target.value as 'carousel' | 'grid' })
                }
                className={inputCls}
              >
                <option value="carousel">Carousel</option>
                <option value="grid">Grid</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Title Align</Label>
              <select
                value={s.newArrivals.titleAlign ?? 'left'}
                onChange={(e) =>
                  setSection('newArrivals', {
                    titleAlign: e.target.value as 'left' | 'center' | 'right',
                  })
                }
                className={inputCls}
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={s.newArrivals.showAllTab ?? false}
                  onChange={(e) => setSection('newArrivals', { showAllTab: e.target.checked })}
                  className="border-border h-4 w-4 rounded accent-emerald-500"
                />
                <span className="text-muted-foreground text-xs">Show &quot;All&quot; tab</span>
              </label>
            </div>
          </div>
          {s.newArrivals.style !== 'carousel' && (
            <GridConfigEditor
              grid={s.newArrivals.grid ?? { columns: 4, rows: 2 }}
              onChange={(g) => setSection('newArrivals', { grid: g })}
            />
          )}
          <TabsEditor
            tabs={s.newArrivals.tabs}
            type="category"
            onAdd={() => {
              const newTab: CategoryTabsTab = {
                id: `atab_${Date.now()}`,
                label: '',
                type: 'category',
                categoryId: '',
              };
              setSection('newArrivals', { tabs: [...s.newArrivals.tabs, newTab] });
            }}
            onUpdate={(idx, patch) => {
              const updated = s.newArrivals.tabs.map((t, i) =>
                i === idx ? { ...t, ...patch } : t
              );
              setSection('newArrivals', { tabs: updated });
            }}
            onRemove={(idx) => {
              setSection('newArrivals', { tabs: s.newArrivals.tabs.filter((_, i) => i !== idx) });
            }}
          />
        </div>
      );

    /* ── Showcase ── */
    case 'showcase':
      return (
        <ShowcaseConfig config={s.showcase} onUpdate={(patch) => setSection('showcase', patch)} />
      );

    /* ── Bestsellers ── */
    case 'bestsellers':
      return (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Title (EN)</Label>
              <Input
                value={s.bestsellers.title ?? ''}
                onChange={(e) => setSection('bestsellers', { title: e.target.value })}
                placeholder="Bestsellers"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Title (BN)</Label>
              <Input
                value={s.bestsellers.titleBn ?? ''}
                onChange={(e) => setSection('bestsellers', { titleBn: e.target.value })}
                placeholder="সর্বাধিক বিক্রি"
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Subtitle (EN)</Label>
              <Input
                value={s.bestsellers.subtitle ?? ''}
                onChange={(e) => setSection('bestsellers', { subtitle: e.target.value })}
                placeholder="Top sellers with ratings"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Subtitle (BN)</Label>
              <Input
                value={s.bestsellers.subtitleBn ?? ''}
                onChange={(e) => setSection('bestsellers', { subtitleBn: e.target.value })}
                placeholder="শীর্ষ বিক্রেতা"
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs">Layout</Label>
              <select
                value={s.bestsellers.style}
                onChange={(e) =>
                  setSection('bestsellers', { style: e.target.value as 'split' | 'grid' })
                }
                className={inputCls}
              >
                <option value="split">Split</option>
                <option value="grid">Grid</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Title Align</Label>
              <select
                value={s.bestsellers.titleAlign ?? 'left'}
                onChange={(e) =>
                  setSection('bestsellers', {
                    titleAlign: e.target.value as 'left' | 'center' | 'right',
                  })
                }
                className={inputCls}
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={s.bestsellers.showAllTab ?? false}
                  onChange={(e) => setSection('bestsellers', { showAllTab: e.target.checked })}
                  className="border-border h-4 w-4 rounded accent-emerald-500"
                />
                <span className="text-muted-foreground text-xs">Show &quot;All&quot; tab</span>
              </label>
            </div>
          </div>
          {s.bestsellers.style === 'grid' && (
            <GridConfigEditor
              grid={s.bestsellers.grid ?? { columns: 4, rows: 2 }}
              onChange={(g) => setSection('bestsellers', { grid: g })}
            />
          )}
          <TabsEditor
            tabs={s.bestsellers.tabs}
            type="category"
            onAdd={() => {
              const newTab: CategoryTabsTab = {
                id: `btab_${Date.now()}`,
                label: '',
                type: 'category',
                categoryId: '',
              };
              setSection('bestsellers', { tabs: [...s.bestsellers.tabs, newTab] });
            }}
            onUpdate={(idx, patch) => {
              const updated = s.bestsellers.tabs.map((t, i) =>
                i === idx ? { ...t, ...patch } : t
              );
              setSection('bestsellers', { tabs: updated });
            }}
            onRemove={(idx) => {
              setSection('bestsellers', { tabs: s.bestsellers.tabs.filter((_, i) => i !== idx) });
            }}
          />
        </div>
      );

    /* ── Promo Banners ── */
    case 'promoBanners':
      return (
        <PromoBannersConfig
          style={s.promoBanners.style}
          items={s.promoBanners.items}
          onStyleChange={(v) => setSection('promoBanners', { style: v })}
          onItemsChange={(items) => setSection('promoBanners', { items })}
        />
      );

    /* ── Brand Carousel ── */
    case 'brandCarousel':
      return (
        <BrandCarouselConfig
          style={s.brandCarousel.style}
          brands={s.brandCarousel.brands}
          onStyleChange={(v) => setSection('brandCarousel', { style: v })}
          onBrandsChange={(brands) => setSection('brandCarousel', { brands })}
        />
      );

    /* ── Feature Bar ── */
    case 'featureBar':
      return (
        <FeatureBarConfig
          items={s.featureBar.items}
          onItemsChange={(items) => setSection('featureBar', { items })}
        />
      );

    default:
      return <p className="text-muted-foreground text-xs">No configuration available.</p>;
  }
}

/* ─── Reusable layout config ─── */
function SectionLayoutConfig({
  title,
  titleBn,
  style,
  grid,
  styles,
  onTitleChange,
  onTitleBnChange,
  onStyleChange,
  onGridChange,
}: {
  title?: string;
  titleBn?: string;
  style: string;
  grid?: GridConfig;
  styles: { value: string; label: string }[];
  onTitleChange: (v: string) => void;
  onTitleBnChange: (v: string) => void;
  onStyleChange: (v: string) => void;
  onGridChange: (g: GridConfig) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Title (EN)</Label>
          <Input
            value={title ?? ''}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Custom title"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Title (BN)</Label>
          <Input
            value={titleBn ?? ''}
            onChange={(e) => onTitleBnChange(e.target.value)}
            placeholder="কাস্টম শিরোনাম"
            className="h-8 text-sm"
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Layout</Label>
        <select value={style} onChange={(e) => onStyleChange(e.target.value)} className={inputCls}>
          {styles.map((st) => (
            <option key={st.value} value={st.value}>
              {st.label}
            </option>
          ))}
        </select>
      </div>
      {style === 'grid' && grid && <GridConfigEditor grid={grid} onChange={onGridChange} />}
    </div>
  );
}

/* ─── Promo Banners config ─── */
function PromoBannersConfig({
  style,
  items,
  onStyleChange,
  onItemsChange,
}: {
  style: 'twoCol' | 'stacked';
  items: PromoBannerItem[];
  onStyleChange: (v: 'twoCol' | 'stacked') => void;
  onItemsChange: (items: PromoBannerItem[]) => void;
}) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const addItem = () => {
    const newItem: PromoBannerItem = {
      id: `promo_${Date.now()}`,
      title: '',
      titleBn: '',
      desc: '',
      descBn: '',
      image: '',
      href: '/products',
      accentColor: '',
    };
    onItemsChange([...items, newItem]);
    setExpandedIdx(items.length);
  };

  const updateItem = (idx: number, patch: Partial<PromoBannerItem>) => {
    onItemsChange(items.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  };

  const removeItem = (idx: number) => {
    onItemsChange(items.filter((_, i) => i !== idx));
    setExpandedIdx(null);
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Layout</Label>
          <select
            value={style}
            onChange={(e) => onStyleChange(e.target.value as 'twoCol' | 'stacked')}
            className={inputCls}
          >
            <option value="twoCol">Two columns</option>
            <option value="stacked">Stacked</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Label className="text-xs">Banners ({items.length})</Label>
        <button
          type="button"
          onClick={addItem}
          className="bg-primary/10 text-primary hover:bg-primary/20 rounded-md px-2.5 py-1 text-[10px] font-medium transition-colors"
        >
          + Add Banner
        </button>
      </div>

      {items.length === 0 && (
        <p className="border-border text-muted-foreground rounded-lg border border-dashed py-6 text-center text-[10px]">
          No banners configured. Uses i18n defaults when empty.
        </p>
      )}

      {items.map((item, idx) => {
        const isExpanded = expandedIdx === idx;
        return (
          <div key={item.id} className="border-border overflow-hidden rounded-xl border">
            {/* Banner header */}
            <div className="bg-muted/30 flex items-center gap-2 px-3 py-2.5">
              <span className="bg-muted text-muted-foreground flex h-5 w-5 shrink-0 items-center justify-center rounded text-[9px] font-semibold">
                {idx + 1}
              </span>

              {/* Thumbnail preview */}
              {item.image ? (
                <div className="border-border h-8 w-12 shrink-0 overflow-hidden rounded-md border">
                  <img src={item.image} alt="" className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="border-border bg-muted/50 h-8 w-12 shrink-0 rounded-md border border-dashed" />
              )}

              <Input
                value={item.title}
                onChange={(e) => updateItem(idx, { title: e.target.value })}
                placeholder="Banner title (EN)"
                className="h-7 min-w-0 flex-1 text-xs"
              />
              <Input
                value={item.titleBn ?? ''}
                onChange={(e) => updateItem(idx, { titleBn: e.target.value })}
                placeholder="Title (BN)"
                className="h-7 min-w-0 flex-1 text-xs"
              />

              <button
                type="button"
                onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                className="text-muted-foreground hover:bg-muted hover:text-foreground shrink-0 rounded p-1"
              >
                {isExpanded ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>
              <button
                type="button"
                onClick={() => removeItem(idx)}
                className="bg-destructive/10 text-destructive hover:bg-destructive/20 shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-medium"
              >
                ✕
              </button>
            </div>

            {/* Expanded config */}
            {isExpanded && (
              <div className="border-border space-y-3 border-t px-4 py-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Description (EN)</Label>
                    <textarea
                      value={item.desc}
                      onChange={(e) => updateItem(idx, { desc: e.target.value })}
                      placeholder="Banner description"
                      rows={2}
                      className="border-border bg-card placeholder:text-muted-foreground/70 w-full resize-none rounded-lg border px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-300"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Description (BN)</Label>
                    <textarea
                      value={item.descBn ?? ''}
                      onChange={(e) => updateItem(idx, { descBn: e.target.value })}
                      placeholder="ব্যানার বিবরণ"
                      rows={2}
                      className="border-border bg-card placeholder:text-muted-foreground/70 w-full resize-none rounded-lg border px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-300"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Link URL</Label>
                    <Input
                      value={item.href}
                      onChange={(e) => updateItem(idx, { href: e.target.value })}
                      placeholder="/products?category=laptops"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Accent Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={item.accentColor || '#000000'}
                        onChange={(e) => updateItem(idx, { accentColor: e.target.value })}
                        className="border-input h-8 w-8 cursor-pointer rounded border"
                      />
                      <Input
                        value={item.accentColor ?? ''}
                        onChange={(e) => updateItem(idx, { accentColor: e.target.value })}
                        placeholder="#ff6b00 (optional)"
                        className="h-8 flex-1 font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Background Image</Label>
                  <SingleImageUploader
                    value={item.image}
                    onChange={(url) => updateItem(idx, { image: url })}
                    heightClass="h-32"
                  />
                  <p className="text-muted-foreground text-[10px]">
                    Full-width background image. Recommended: 1200×400px.
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Brand Carousel config ─── */
function BrandCarouselConfig({
  style,
  brands,
  onStyleChange,
  onBrandsChange,
}: {
  style: 'carousel' | 'grid';
  brands: BrandCarouselItem[];
  onStyleChange: (v: 'carousel' | 'grid') => void;
  onBrandsChange: (brands: BrandCarouselItem[]) => void;
}) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const addBrand = () => {
    const newBrand: BrandCarouselItem = {
      id: `brand_${Date.now()}`,
      name: '',
      slug: '',
      logo: '',
      href: '',
    };
    onBrandsChange([...brands, newBrand]);
    setExpandedIdx(brands.length);
  };

  const updateBrand = (idx: number, patch: Partial<BrandCarouselItem>) => {
    onBrandsChange(brands.map((b, i) => (i === idx ? { ...b, ...patch } : b)));
  };

  const removeBrand = (idx: number) => {
    onBrandsChange(brands.filter((_, i) => i !== idx));
    setExpandedIdx(null);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">Layout</Label>
        <select
          value={style}
          onChange={(e) => onStyleChange(e.target.value as 'carousel' | 'grid')}
          className={inputCls}
        >
          <option value="carousel">Carousel</option>
          <option value="grid">Grid</option>
        </select>
      </div>

      <div className="flex items-center justify-between">
        <Label className="text-xs">Brands ({brands.length})</Label>
        <button
          type="button"
          onClick={addBrand}
          className="bg-primary/10 text-primary hover:bg-primary/20 rounded-md px-2.5 py-1 text-[10px] font-medium transition-colors"
        >
          + Add Brand
        </button>
      </div>

      {brands.length === 0 && (
        <p className="border-border text-muted-foreground rounded-lg border border-dashed py-6 text-center text-[10px]">
          No brands configured. Uses DB brands or hardcoded fallback when empty.
        </p>
      )}

      {brands.map((brand, idx) => {
        const isExpanded = expandedIdx === idx;
        return (
          <div key={brand.id} className="border-border overflow-hidden rounded-xl border">
            <div className="bg-muted/30 flex items-center gap-2 px-3 py-2.5">
              <span className="bg-muted text-muted-foreground flex h-5 w-5 shrink-0 items-center justify-center rounded text-[9px] font-semibold">
                {idx + 1}
              </span>

              {brand.logo ? (
                <div className="border-border h-8 w-12 shrink-0 overflow-hidden rounded-md border">
                  <img src={brand.logo} alt="" className="h-full w-full object-contain" />
                </div>
              ) : (
                <div className="border-border bg-muted/50 h-8 w-12 shrink-0 rounded-md border border-dashed" />
              )}

              <Input
                value={brand.name}
                onChange={(e) => updateBrand(idx, { name: e.target.value })}
                placeholder="Brand name"
                className="h-7 min-w-0 flex-1 text-xs"
              />

              <button
                type="button"
                onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                className="text-muted-foreground hover:bg-muted hover:text-foreground shrink-0 rounded p-1"
              >
                {isExpanded ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>
              <button
                type="button"
                onClick={() => removeBrand(idx)}
                className="bg-destructive/10 text-destructive hover:bg-destructive/20 shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-medium"
              >
                ✕
              </button>
            </div>

            {isExpanded && (
              <div className="border-border space-y-3 border-t px-4 py-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Slug (URL identifier)</Label>
                    <Input
                      value={brand.slug}
                      onChange={(e) => updateBrand(idx, { slug: e.target.value })}
                      placeholder="apple"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Link URL (optional)</Label>
                    <Input
                      value={brand.href ?? ''}
                      onChange={(e) => updateBrand(idx, { href: e.target.value })}
                      placeholder="/products?brand=apple"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Logo Image</Label>
                  <SingleImageUploader
                    value={brand.logo}
                    onChange={(url) => updateBrand(idx, { logo: url })}
                    heightClass="h-20"
                  />
                  <p className="text-muted-foreground text-[10px]">
                    Brand logo. Recommended: 280×80px with transparent background.
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Feature Bar config (trust badges with icon picker) ─── */
const ICON_OPTIONS = Object.keys(FEATURE_BAR_ICONS).map((key) => ({
  value: key,
  label: key
    .replace(/-/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^\w/, (c) => c.toUpperCase()),
}));

function FeatureBarConfig({
  items,
  onItemsChange,
}: {
  items: FeatureItem[];
  onItemsChange: (items: FeatureItem[]) => void;
}) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const addItem = () => {
    const newItem: FeatureItem = { title: '', titleBn: '', desc: '', descBn: '', icon: 'truck' };
    onItemsChange([...items, newItem]);
    setExpandedIdx(items.length);
  };

  const updateItem = (idx: number, patch: Partial<FeatureItem>) => {
    onItemsChange(items.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  };

  const removeItem = (idx: number) => {
    onItemsChange(items.filter((_, i) => i !== idx));
    setExpandedIdx(null);
  };

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-[10px]">
        Trust badges shown above the footer. Supports up to 4 items.
      </p>

      <div className="flex items-center justify-between">
        <Label className="text-xs">Items ({items.length}/4)</Label>
        <button
          type="button"
          onClick={addItem}
          disabled={items.length >= 4}
          className="bg-primary/10 text-primary hover:bg-primary/20 rounded-md px-2.5 py-1 text-[10px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40"
        >
          + Add Item
        </button>
      </div>

      {items.length === 0 && (
        <p className="border-border text-muted-foreground rounded-lg border border-dashed py-6 text-center text-[10px]">
          No items configured. Uses i18n defaults when empty.
        </p>
      )}

      {items.map((item, idx) => {
        const isExpanded = expandedIdx === idx;
        const IconComp = item.icon ? FEATURE_BAR_ICONS[item.icon] : null;
        return (
          <div key={idx} className="border-border overflow-hidden rounded-xl border">
            <div className="bg-muted/30 flex items-center gap-2 px-3 py-2.5">
              <span className="bg-muted text-muted-foreground flex h-5 w-5 shrink-0 items-center justify-center rounded text-[9px] font-semibold">
                {idx + 1}
              </span>

              {/* Icon preview */}
              <div className="border-border bg-background flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border">
                {IconComp ? (
                  <IconComp className="text-foreground h-4 w-4" />
                ) : (
                  <span className="text-muted-foreground text-[9px]">?</span>
                )}
              </div>

              <Input
                value={item.title}
                onChange={(e) => updateItem(idx, { title: e.target.value })}
                placeholder="Title (EN)"
                className="h-7 min-w-0 flex-1 text-xs"
              />
              <Input
                value={item.titleBn ?? ''}
                onChange={(e) => updateItem(idx, { titleBn: e.target.value })}
                placeholder="শিরোনাম"
                className="h-7 min-w-0 flex-1 text-xs"
              />
              <button
                type="button"
                onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                className="text-muted-foreground hover:bg-muted hover:text-foreground shrink-0 rounded p-1"
              >
                {isExpanded ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>
              <button
                type="button"
                onClick={() => removeItem(idx)}
                className="bg-destructive/10 text-destructive hover:bg-destructive/20 shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-medium"
              >
                ✕
              </button>
            </div>

            {isExpanded && (
              <div className="border-border space-y-3 border-t px-4 py-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Icon</Label>
                  <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-10">
                    {ICON_OPTIONS.map((opt) => {
                      const Ic = FEATURE_BAR_ICONS[opt.value];
                      const isActive = (item.icon ?? 'truck') === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => updateItem(idx, { icon: opt.value })}
                          title={opt.label}
                          className={cn(
                            'flex h-9 w-9 items-center justify-center rounded-lg border transition-all',
                            isActive
                              ? 'border-primary bg-primary/10 text-primary shadow-sm'
                              : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground'
                          )}
                        >
                          {Ic && <Ic className="h-4 w-4" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Description (EN)</Label>
                    <textarea
                      value={item.desc}
                      onChange={(e) => updateItem(idx, { desc: e.target.value })}
                      placeholder="Free shipping on orders over $50"
                      rows={2}
                      className="border-border bg-card placeholder:text-muted-foreground/70 w-full resize-none rounded-lg border px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-300"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Description (BN)</Label>
                    <textarea
                      value={item.descBn ?? ''}
                      onChange={(e) => updateItem(idx, { descBn: e.target.value })}
                      placeholder="$৫০ এর বেশি অর্ডারে বিনামূল্যে ডেলিভারি"
                      rows={2}
                      className="border-border bg-card placeholder:text-muted-foreground/70 w-full resize-none rounded-lg border px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-300"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Showcase config (with custom tabs for carousel mode) ─── */
function ShowcaseConfig({
  config,
  onUpdate,
}: {
  config: HomeConfig['sections']['showcase'];
  onUpdate: (patch: Partial<HomeConfig['sections']['showcase']>) => void;
}) {
  const [expandedTab, setExpandedTab] = useState<number | null>(null);

  const addTab = () => {
    const newTab: ShowcaseTab = {
      id: `showcase_tab_${Date.now()}`,
      label: '',
      labelBn: '',
      productIds: [],
    };
    onUpdate({ tabs: [...(config.tabs ?? []), newTab] });
    setExpandedTab((config.tabs ?? []).length);
  };

  const updateTab = (idx: number, patch: Partial<ShowcaseTab>) => {
    const tabs = (config.tabs ?? []).map((tab, i) => (i === idx ? { ...tab, ...patch } : tab));
    onUpdate({ tabs });
  };

  const removeTab = (idx: number) => {
    onUpdate({ tabs: (config.tabs ?? []).filter((_, i) => i !== idx) });
    setExpandedTab(null);
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Title (EN)</Label>
          <Input
            value={config.title ?? ''}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Featured Picks"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Title (BN)</Label>
          <Input
            value={config.titleBn ?? ''}
            onChange={(e) => onUpdate({ titleBn: e.target.value })}
            placeholder="বিশেষ পণ্য"
            className="h-8 text-sm"
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Subtitle (EN)</Label>
          <Input
            value={config.subtitle ?? ''}
            onChange={(e) => onUpdate({ subtitle: e.target.value })}
            placeholder="Up to 69% discount"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Subtitle (BN)</Label>
          <Input
            value={config.subtitleBn ?? ''}
            onChange={(e) => onUpdate({ subtitleBn: e.target.value })}
            placeholder="৬৯% পর্যন্ত ছাড়"
            className="h-8 text-sm"
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Layout</Label>
        <select
          value={config.style}
          onChange={(e) => onUpdate({ style: e.target.value as 'spotlight' | 'carousel' })}
          className={inputCls}
        >
          <option value="spotlight">Spotlight</option>
          <option value="carousel">Carousel (Feature + Lists)</option>
        </select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Feature Image</Label>
        <SingleImageUploader
          value={config.featureImage ?? ''}
          onChange={(url) => onUpdate({ featureImage: url })}
          heightClass="h-32"
        />
        <p className="text-muted-foreground text-[10px]">
          Background image for the hero card in carousel mode.
        </p>
      </div>

      {config.style === 'carousel' && (
        <div className="border-border bg-muted/30 space-y-3 rounded-xl border p-3">
          <Label className="text-xs font-semibold">Hero Card Content</Label>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Card Title (EN)</Label>
              <Input
                value={config.featureTitle ?? ''}
                onChange={(e) => onUpdate({ featureTitle: e.target.value })}
                placeholder="Stay Fit. Stay Healthy."
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Card Title (BN)</Label>
              <Input
                value={config.featureTitleBn ?? ''}
                onChange={(e) => onUpdate({ featureTitleBn: e.target.value })}
                placeholder="স্বাস্থ্যবিধি মেনে চলুন"
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Description (EN)</Label>
              <Input
                value={config.featureDesc ?? ''}
                onChange={(e) => onUpdate({ featureDesc: e.target.value })}
                placeholder="Discover Vitamins & Supplements..."
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description (BN)</Label>
              <Input
                value={config.featureDescBn ?? ''}
                onChange={(e) => onUpdate({ featureDescBn: e.target.value })}
                placeholder="ভিটামিন ও সাপ্লিমেন্ট আবিষ্কার করুন..."
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">CTA Button (EN)</Label>
              <Input
                value={config.featureCta ?? ''}
                onChange={(e) => onUpdate({ featureCta: e.target.value })}
                placeholder="Explore Now"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">CTA Button (BN)</Label>
              <Input
                value={config.featureCtaBn ?? ''}
                onChange={(e) => onUpdate({ featureCtaBn: e.target.value })}
                placeholder="এখনই কিনুন"
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">CTA Link</Label>
            <Input
              value={config.featureLink ?? ''}
              onChange={(e) => onUpdate({ featureLink: e.target.value })}
              placeholder="/products?category=wellness"
              className="h-8 text-sm"
            />
          </div>
        </div>
      )}

      {/* Tabs management (carousel mode only) */}
      {config.style === 'carousel' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Product Columns ({(config.tabs ?? []).length})</Label>
            <button
              type="button"
              onClick={addTab}
              className="bg-primary/10 text-primary hover:bg-primary/20 rounded-md px-2.5 py-1 text-[10px] font-medium transition-colors"
            >
              + Add Column
            </button>
          </div>

          {(config.tabs ?? []).length === 0 && (
            <p className="border-border text-muted-foreground rounded-lg border border-dashed py-4 text-center text-[10px]">
              No columns configured. Products will be auto-split into two default columns.
            </p>
          )}

          {(config.tabs ?? []).map((tab, idx) => {
            const isExpanded = expandedTab === idx;
            return (
              <div key={tab.id} className="border-border overflow-hidden rounded-xl border">
                <div className="bg-muted/30 flex items-center gap-2 px-3 py-2.5">
                  <span className="bg-muted text-muted-foreground flex h-5 w-5 shrink-0 items-center justify-center rounded text-[9px] font-semibold">
                    {idx + 1}
                  </span>
                  <Input
                    value={tab.label}
                    onChange={(e) => updateTab(idx, { label: e.target.value })}
                    placeholder="Column title (EN)"
                    className="h-7 min-w-0 flex-1 text-xs"
                  />
                  <Input
                    value={tab.labelBn ?? ''}
                    onChange={(e) => updateTab(idx, { labelBn: e.target.value })}
                    placeholder="কলামের শিরোনাম"
                    className="h-7 min-w-0 flex-1 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setExpandedTab(isExpanded ? null : idx)}
                    className="text-muted-foreground hover:bg-muted hover:text-foreground shrink-0 rounded p-1"
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeTab(idx)}
                    className="bg-destructive/10 text-destructive hover:bg-destructive/20 shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-medium"
                  >
                    ✕
                  </button>
                </div>

                {isExpanded && (
                  <div className="border-border border-t px-4 py-4">
                    <Label className="text-xs">Products for this column</Label>
                    <ProductPicker
                      value={tab.productIds}
                      onChange={(ids) => updateTab(idx, { productIds: ids })}
                      max={8}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Fallback products (spotlight mode) */}
      {config.style === 'spotlight' && (
        <div className="space-y-1">
          <Label className="text-xs">Products</Label>
          <ProductPicker
            value={config.productIds}
            onChange={(ids) => onUpdate({ productIds: ids })}
            max={12}
          />
        </div>
      )}
    </div>
  );
}

/* ─── Tabs editor (for tabbed/category tabs sections) ─── */
function TabsEditor({
  tabs,
  type,
  onAdd,
  onUpdate,
  onRemove,
}: {
  tabs: (TabbedShowcaseTab | CategoryTabsTab)[];
  type: 'tabbed' | 'category';
  onAdd: () => void;
  onUpdate: (idx: number, patch: Record<string, unknown>) => void;
  onRemove: (idx: number) => void;
}) {
  const [expandedTab, setExpandedTab] = useState<number | null>(null);
  const { data: catData } = useCategories();
  const categories = catData?.data ?? [];
  const isCategoryType = type === 'category';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs">Tabs ({tabs.length})</Label>
        <div className="flex gap-1.5">
          {isCategoryType && (
            <>
              <button
                type="button"
                onClick={() => onAdd()}
                className="bg-primary/10 text-primary hover:bg-primary/20 rounded-md px-2.5 py-1 text-[10px] font-medium transition-colors"
              >
                + Category
              </button>
              <button
                type="button"
                onClick={() => {
                  onAdd();
                  // The caller sets type='category' by default, we patch it to 'custom' after
                  setTimeout(() => {
                    const lastIdx = tabs.length;
                    onUpdate(lastIdx, { type: 'custom', productIds: [], categoryId: '' });
                  }, 0);
                }}
                className="rounded-md bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-600 transition-colors hover:bg-emerald-500/20"
              >
                + Custom
              </button>
            </>
          )}
          {!isCategoryType && (
            <button
              type="button"
              onClick={() => onAdd()}
              className="bg-primary/10 text-primary hover:bg-primary/20 rounded-md px-2.5 py-1 text-[10px] font-medium transition-colors"
            >
              + Add Tab
            </button>
          )}
        </div>
      </div>
      {tabs.length === 0 && (
        <p className="border-border text-muted-foreground rounded-lg border border-dashed py-4 text-center text-[10px]">
          No tabs yet. Click &quot;Add&quot; to create a tab.
        </p>
      )}
      {tabs.map((tab, idx) => {
        const isExpanded = expandedTab === idx;
        const productCount = ('productIds' in tab ? tab.productIds?.length : 0) ?? 0;
        const tabType = isCategoryType && 'type' in tab ? (tab as CategoryTabsTab).type : 'custom';

        return (
          <div key={tab.id} className="border-border overflow-hidden rounded-lg border">
            {/* Tab header row */}
            <div className="bg-muted/30 flex items-center gap-2 px-2.5 py-2">
              <span className="bg-muted text-muted-foreground flex h-5 w-5 shrink-0 items-center justify-center rounded text-[9px] font-semibold">
                {idx + 1}
              </span>
              <Input
                value={tab.label}
                onChange={(e) => onUpdate(idx, { label: e.target.value })}
                placeholder="Label (EN)"
                className="h-7 min-w-0 flex-1 text-xs"
              />
              <Input
                value={tab.labelBn ?? ''}
                onChange={(e) => onUpdate(idx, { labelBn: e.target.value })}
                placeholder="Label (BN)"
                className="h-7 w-20 min-w-0 text-xs"
              />

              {/* Type toggle for category mode */}
              {isCategoryType && (
                <select
                  value={tabType}
                  onChange={(e) => {
                    const newType = e.target.value as 'category' | 'custom';
                    if (newType === 'category') {
                      onUpdate(idx, { type: 'category', productIds: [] });
                    } else {
                      onUpdate(idx, { type: 'custom', categoryId: '', productIds: [] });
                    }
                  }}
                  className="border-border bg-card h-7 rounded-md border px-1.5 text-[10px] focus:outline-none"
                >
                  <option value="category">Category</option>
                  <option value="custom">Custom</option>
                </select>
              )}

              {/* Category selector */}
              {isCategoryType && tabType === 'category' && (
                <select
                  value={('categoryId' in tab ? tab.categoryId : '') ?? ''}
                  onChange={(e) => onUpdate(idx, { categoryId: e.target.value, type: 'category' })}
                  className="border-border bg-card h-7 min-w-[100px] rounded-md border px-1.5 text-[10px] focus:outline-none"
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}

              <span className="bg-muted text-muted-foreground shrink-0 rounded px-1.5 py-0.5 text-[9px]">
                {tabType === 'category' ? 'auto' : productCount}
              </span>
              <button
                type="button"
                onClick={() => setExpandedTab(isExpanded ? null : idx)}
                className="text-muted-foreground hover:bg-muted hover:text-foreground shrink-0 rounded p-1"
              >
                {isExpanded ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>
              <button
                type="button"
                onClick={() => onRemove(idx)}
                className="bg-destructive/10 text-destructive hover:bg-destructive/20 shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-medium"
              >
                ✕
              </button>
            </div>

            {/* Expanded: ProductPicker (only for custom tabs) */}
            {isExpanded && tabType === 'custom' && (
              <div className="border-border border-t px-3 py-3">
                <ProductPicker
                  value={'productIds' in tab ? (tab.productIds ?? []) : []}
                  onChange={(ids) => onUpdate(idx, { productIds: ids })}
                />
              </div>
            )}
            {isExpanded && tabType === 'category' && (
              <div className="border-border border-t px-3 py-3">
                <p className="text-muted-foreground text-[10px]">
                  Products will be auto-fetched from the selected category.
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════ */
/* ─── Main export: SectionManager ─── */
/* ══════════════════════════════════════════════════════════════════════ */

export function SectionManager({
  sectionOrder,
  sections,
  onOrderChange,
  onSectionUpdate,
}: {
  sectionOrder: SectionKey[];
  sections: HomeConfig['sections'];
  onOrderChange: (order: SectionKey[]) => void;
  onSectionUpdate: <K extends keyof HomeConfig['sections']>(
    key: K,
    patch: Partial<HomeConfig['sections'][K]>
  ) => void;
}) {
  const [expanded, setExpanded] = useState<SectionKey | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sectionOrder.indexOf(active.id as SectionKey);
    const newIndex = sectionOrder.indexOf(over.id as SectionKey);
    if (oldIndex === -1 || newIndex === -1) return;
    onOrderChange(arrayMove(sectionOrder, oldIndex, newIndex));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {sectionOrder.map((key) => {
            const sec = sections[key] as { enabled: boolean; [k: string]: unknown };
            return (
              <SortableSectionCard
                key={key}
                id={key}
                sectionKey={key}
                config={sec}
                expanded={expanded === key}
                onToggleExpand={() => setExpanded(expanded === key ? null : key)}
                onToggleEnabled={(v) => onSectionUpdate(key, { enabled: v } as never)}
              >
                <SectionConfig sectionKey={key} sections={sections} setSection={onSectionUpdate} />
              </SortableSectionCard>
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
