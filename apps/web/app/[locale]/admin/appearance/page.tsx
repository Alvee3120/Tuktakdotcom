'use client';

import {
  LayoutTemplate,
  Loader2,
  Save,
  Palette,
  LayoutGrid,
  Menu,
  PanelLeftOpen,
  Globe,
  Columns3,
  CreditCard,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  MenuEditor,
  FooterColumnEditor,
  SocialLinksEditor,
  PaymentMethodsEditor,
} from '@/components/admin/MenuEditor';
import { SectionManager } from '@/components/admin/SectionManager';
import { SingleImageUploader } from '@/components/dashboard/ImageUploader';
import { TabFilter } from '@/components/dashboard/TabFilter';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { Skeleton } from '@/components/ui/skeleton';
import { useCategories } from '@/hooks/useCatalog';
import { api } from '@/lib/api-client';
import {
  DEFAULT_HOME_CONFIG,
  mergeHomeConfig,
  type HomeConfig,
  type SectionKey,
} from '@/lib/home-config';
import { DEFAULT_MENU_CONFIG, mergeMenuConfig, type MenuConfig } from '@/lib/menu-config';
import { cn } from '@/lib/utils';

import NewsTickerForm from './news-ticker-form';

const inputCls =
  'w-full rounded-lg border border-border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground/70 focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-300';

function Card({
  icon: Icon,
  title,
  desc,
  right,
  children,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="border-border bg-card space-y-4 rounded-2xl border p-4 sm:space-y-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-primary/5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
            <Icon className="text-primary h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">{title}</h2>
            <p className="text-muted-foreground text-xs leading-snug">{desc}</p>
          </div>
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </div>
      {children}
    </div>
  );
}

export default function AppearancePage() {
  const [cfg, setCfg] = useState<HomeConfig>(DEFAULT_HOME_CONFIG);
  const [menuCfg, setMenuCfg] = useState<MenuConfig>(DEFAULT_MENU_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch categories for the MenuEditor category picker
  const { data: catData } = useCategories();
  const categoryOptions = (catData?.data ?? [])
    .filter((c) => c.isActive)
    .map((c) => ({ id: c.id, name: c.name, slug: c.slug }));

  useEffect(() => {
    api
      .get<{
        data?: {
          homeConfig?: string | Record<string, unknown>;
          primaryColor?: string;
          menuConfig?: string | Record<string, unknown>;
        };
      }>('/api/admin/settings')
      .then((res) => {
        const raw = res.data?.homeConfig;
        if (raw) {
          const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
          let merged = mergeHomeConfig(parsed);
          if (
            !merged.branding.primaryColor &&
            res.data?.primaryColor &&
            res.data.primaryColor !== '#ff6b00'
          ) {
            merged = {
              ...merged,
              branding: { ...merged.branding, primaryColor: res.data.primaryColor },
            };
          }
          setCfg(merged);
        }
        const rawMenu = res.data?.menuConfig;
        if (rawMenu) {
          const parsedMenu = typeof rawMenu === 'string' ? JSON.parse(rawMenu) : rawMenu;
          setMenuCfg(mergeMenuConfig(parsedMenu));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/api/admin/settings', {
        homeConfig: JSON.stringify(cfg),
        menuConfig: JSON.stringify(menuCfg),
      });
      toast.success('Settings saved — live instantly');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const [tab, setTab] = useState('sections');
  const [menuSubTab, setMenuSubTab] = useState('desktop');

  const s = cfg.sections;
  const setSection = <K extends keyof HomeConfig['sections']>(
    key: K,
    patch: Partial<HomeConfig['sections'][K]>
  ) =>
    setCfg((prev) => ({
      ...prev,
      sections: { ...prev.sections, [key]: { ...prev.sections[key], ...patch } },
    }));
  const setBranding = (patch: Partial<HomeConfig['branding']>) =>
    setCfg((prev) => ({ ...prev, branding: { ...prev.branding, ...patch } }));

  if (loading)
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );

  return (
    <div className="space-y-6 pb-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
          <LayoutTemplate className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-heading-lg text-foreground font-bold">Home &amp; Appearance</h1>
          <p className="text-muted-foreground text-xs">
            Drag to reorder sections, toggle visibility, and configure each section
          </p>
        </div>
      </div>

      <TabFilter
        className="flex-nowrap overflow-x-auto scrollbar-hide sm:flex-wrap"
        activeTab={tab}
        onTabChange={setTab}
        tabs={[
          { label: 'Sections', value: 'sections' },
          { label: 'Branding', value: 'branding' },
          { label: 'Card Style', value: 'cards' },
          { label: 'Menu Editor', value: 'menu' },
          { label: 'News Ticker', value: 'ticker' },
        ]}
      />

      {/* ═══ Sections (drag-and-drop) ═══ */}
      {tab === 'sections' && (
        <Card
          icon={LayoutGrid}
          title="Homepage Sections"
          desc="Drag to reorder, toggle visibility, click to expand settings"
        >
          <SectionManager
            sectionOrder={cfg.sectionOrder}
            sections={s}
            onOrderChange={(order: SectionKey[]) =>
              setCfg((prev) => ({ ...prev, sectionOrder: order }))
            }
            onSectionUpdate={setSection}
          />
        </Card>
      )}

      {/* ═══ Branding ═══ */}
      {tab === 'branding' && (
        <Card icon={Palette} title="Branding" desc="Brand color, logo and favicon — live instantly">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label>Primary Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={cfg.branding.primaryColor || '#10b981'}
                  onChange={(e) => setBranding({ primaryColor: e.target.value })}
                  className="border-input h-9 w-10 cursor-pointer rounded-lg border"
                />
                <Input
                  value={cfg.branding.primaryColor}
                  onChange={(e) => setBranding({ primaryColor: e.target.value })}
                  placeholder="#ff6b00 (blank = theme default)"
                  className="w-52 font-mono text-xs"
                />
                {cfg.branding.primaryColor && (
                  <button
                    type="button"
                    onClick={() => setBranding({ primaryColor: '' })}
                    className="text-muted-foreground hover:text-foreground text-xs underline"
                  >
                    Reset
                  </button>
                )}
              </div>
              <p className="text-muted-foreground text-xs">
                Applies to primary buttons, badges and accents across the storefront. Leave blank to
                keep the default theme color.
              </p>
            </div>
            <div className="space-y-1">
              <Label>Logo (light mode)</Label>
              <SingleImageUploader
                label="Light logo"
                value={cfg.branding.logoLight}
                onChange={(url) => setBranding({ logoLight: url })}
                heightClass="h-24"
              />
            </div>
            <div className="space-y-1">
              <Label>Logo (dark mode)</Label>
              <SingleImageUploader
                label="Dark logo"
                value={cfg.branding.logoDark}
                onChange={(url) => setBranding({ logoDark: url })}
                heightClass="h-24"
              />
            </div>
            <div className="space-y-1">
              <Label>Favicon</Label>
              <SingleImageUploader
                label="Favicon"
                value={cfg.branding.favicon}
                onChange={(url) => setBranding({ favicon: url })}
                heightClass="h-24"
              />
              <p className="text-muted-foreground text-xs">
                Square PNG/ICO recommended (32x32 or 512x512).
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* ═══ Card Style ═══ */}
      {tab === 'cards' && (
        <Card
          icon={LayoutGrid}
          title="Product Card Style"
          desc="How product cards look across home grids and the products page"
        >
          <div className="flex flex-wrap gap-3">
            {(['default', 'compact'] as const).map((style) => (
              <button
                key={style}
                onClick={() => setCfg((prev) => ({ ...prev, productCardStyle: style }))}
                className={cn(
                  'min-w-[180px] flex-1 rounded-xl border p-4 text-left transition-colors',
                  cfg.productCardStyle === style
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/40'
                )}
              >
                <p className="text-foreground text-sm font-semibold capitalize">{style}</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {style === 'default'
                    ? 'Rich card with rating, wishlist & quick-add on hover'
                    : '"Order Now" button + circular discount badge (mobile-first)'}
                </p>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* ═══ Menu Editor ═══ */}
      {tab === 'menu' && (
        <div className="space-y-4">
          <div className="border-border bg-muted flex flex-nowrap gap-1.5 overflow-x-auto scrollbar-hide rounded-lg border p-1">
            {(
              [
                { label: 'Desktop Menu', value: 'desktop', icon: Menu },
                { label: 'Mobile Menu', value: 'mobile', icon: PanelLeftOpen },
                { label: 'Footer Columns', value: 'footer', icon: Columns3 },
                { label: 'Social Links', value: 'social', icon: Globe },
                { label: 'Payments', value: 'payments', icon: CreditCard },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setMenuSubTab(opt.value)}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  menuSubTab === opt.value
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <opt.icon className="h-3.5 w-3.5" />
                {opt.label}
              </button>
            ))}
          </div>

          {menuSubTab === 'desktop' && (
            <Card
              icon={Menu}
              title="Desktop Main Menu"
              desc="Configure the horizontal navigation bar. Drag to reorder, add custom links or pick categories."
            >
              <MenuEditor
                items={menuCfg.mainMenu}
                onChange={(items) => setMenuCfg((prev) => ({ ...prev, mainMenu: items }))}
                label="Main Menu"
                categoryOptions={categoryOptions}
              />
            </Card>
          )}

          {menuSubTab === 'mobile' && (
            <Card
              icon={PanelLeftOpen}
              title="Mobile Off-Canvas Menu"
              desc="Same data, optimized as an accordion for mobile. Drag to reorder items."
            >
              <MenuEditor
                items={menuCfg.mobileMenu}
                onChange={(items) => setMenuCfg((prev) => ({ ...prev, mobileMenu: items }))}
                label="Mobile Menu"
                categoryOptions={categoryOptions}
              />
            </Card>
          )}

          {menuSubTab === 'footer' && (
            <div className="space-y-4">
              <Card
                icon={Columns3}
                title="Footer Tagline"
                desc="Text shown under the footer logo (English & Bengali)."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Tagline (EN)</Label>
                    <textarea
                      value={menuCfg.footerTagline ?? ''}
                      onChange={(e) =>
                        setMenuCfg((prev) => ({ ...prev, footerTagline: e.target.value }))
                      }
                      rows={3}
                      className={inputCls}
                      placeholder="Stay in the loop — get the latest deals, new arrivals, and exclusive offers straight to your inbox."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Tagline (BN)</Label>
                    <textarea
                      value={menuCfg.footerTaglineBn ?? ''}
                      onChange={(e) =>
                        setMenuCfg((prev) => ({ ...prev, footerTaglineBn: e.target.value }))
                      }
                      rows={3}
                      className={inputCls}
                      placeholder="সর্বশেষ ডিল, নতুন পণ্য এবং একচেটিয়া অফার সম্পর্কে জানুন"
                    />
                  </div>
                </div>
              </Card>

              <Card
                icon={Columns3}
                title="Footer Menu Columns"
                desc="Manage footer link columns. Drag to reorder columns, expand to add/edit links inside each."
              >
                <FooterColumnEditor
                  columns={menuCfg.footerMenu}
                  onChange={(columns) => setMenuCfg((prev) => ({ ...prev, footerMenu: columns }))}
                  categoryOptions={categoryOptions}
                />
              </Card>
            </div>
          )}

          {menuSubTab === 'social' && (
            <Card
              icon={Globe}
              title="Footer Social Links"
              desc="Toggle social platforms on and off, then paste your profile URL for each."
            >
              <SocialLinksEditor
                socials={menuCfg.footerSocial}
                onChange={(socials) => setMenuCfg((prev) => ({ ...prev, footerSocial: socials }))}
              />
            </Card>
          )}

          {menuSubTab === 'payments' && (
            <Card
              icon={CreditCard}
              title="Footer Payment Methods"
              desc="Add payment method badges with optional logo images shown in the footer bottom bar."
            >
              <PaymentMethodsEditor
                payments={menuCfg.footerPayments}
                onChange={(payments) =>
                  setMenuCfg((prev) => ({ ...prev, footerPayments: payments }))
                }
              />
            </Card>
          )}
        </div>
      )}

      {/* ═══ News Ticker ═══ */}
      {tab === 'ticker' && (
        <div className="border-border bg-card space-y-3 rounded-2xl border p-6">
          <div>
            <h2 className="text-sm font-semibold">Top Bar News Ticker</h2>
            <p className="text-muted-foreground text-xs">
              Scrolling storefront announcement (English &amp; Bengali). Saving triggers an instant
              on-demand revalidation of the storefront.
            </p>
          </div>
          <NewsTickerForm />
        </div>
      )}

      {tab !== 'ticker' && (
        <PremiumButton
          variant="primary"
          size="md"
          leftIcon={
            saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />
          }
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </PremiumButton>
      )}
    </div>
  );
}
