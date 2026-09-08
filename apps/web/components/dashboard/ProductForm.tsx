'use client';

import {
  Layers,
  Loader2,
  Plus,
  Trash2,
  Upload,
  Warehouse,
  Package,
  Eye,
  ChevronDown,
  ChevronUp,
  Hash,
  DollarSign,
  BarChart3,
  Boxes,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { MultiImageUploader, SingleImageUploader } from '@/components/dashboard/ImageUploader';
import { RichTextEditor } from '@/components/dashboard/RichTextEditor';
import { VariantBuilder } from '@/components/dashboard/VariantBuilder';
import {
  uploadImage,
  useAdminBrands,
  useAdminCategories,
  useInventories,
  type AdminProductDetail,
  type AdminVariant,
  type VariantInput,
} from '@/hooks/useAdmin';
import { uploadResizedImage } from '@/lib/image';

export type ProductPayload = {
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  price: number;
  compareAtPrice: number | null;
  cost: number | null;
  stock: number;
  categoryId: string | null;
  brandId: string | null;
  image: string;
  images?: string[];
  isActive: boolean;
  isFeatured: boolean;
  inventoryAllocations?: { inventoryId: string; quantity: number }[];
};

type VariantRow = {
  key: string;
  id?: string;
  name: string;
  sku: string;
  price: string;
  compareAtPrice: string;
  cost: string;
  stock: string;
  lowStockThreshold: string;
  image: string;
  isActive: boolean;
  allocations: Record<string, string>;
  collapsed: boolean;
};

type FormState = {
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  price: string;
  compareAtPrice: string;
  cost: string;
  stock: string;
  categoryId: string;
  brandId: string;
  image: string;
  isActive: boolean;
  isFeatured: boolean;
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');
}

function newVariantRow(): VariantRow {
  return {
    key: crypto.randomUUID(),
    name: '',
    sku: '',
    price: '',
    compareAtPrice: '',
    cost: '',
    stock: '0',
    lowStockThreshold: '5',
    image: '',
    isActive: true,
    allocations: {},
    collapsed: false,
  };
}

function toFormState(initial?: AdminProductDetail): FormState {
  if (!initial) {
    return {
      name: '',
      slug: '',
      description: '',
      shortDescription: '',
      price: '',
      compareAtPrice: '',
      cost: '',
      stock: '0',
      categoryId: '',
      brandId: '',
      image: '',
      isActive: true,
      isFeatured: false,
    };
  }
  return {
    name: initial.name,
    slug: initial.slug,
    description: initial.description ?? '',
    shortDescription: initial.shortDescription ?? '',
    price: String(initial.price),
    compareAtPrice: initial.compareAtPrice !== null ? String(initial.compareAtPrice) : '',
    cost: initial.cost !== null ? String(initial.cost) : '',
    stock: String(initial.stock),
    categoryId: initial.categoryId ?? '',
    brandId: initial.brandId ?? '',
    image: initial.image,
    isActive: initial.isActive,
    isFeatured: initial.isFeatured,
  };
}

function toVariantRows(initial?: AdminProductDetail): VariantRow[] {
  if (!initial?.variants?.length) return [];
  return initial.variants.map((v) => ({
    key: v.id,
    id: v.id,
    name: v.name,
    sku: v.sku ?? '',
    price: String(v.price),
    compareAtPrice: v.compareAtPrice !== null ? String(v.compareAtPrice) : '',
    cost: (v as unknown as { cost?: number | null }).cost != null ? String((v as unknown as { cost: number }).cost) : '',
    stock: String(v.stock),
    lowStockThreshold: '5',
    image: v.image ?? '',
    isActive: v.isActive,
    allocations: {},
    collapsed: false,
  }));
}

/* ═══ Variant Image Button ═══ */
function VariantImageButton({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      onChange(await uploadResizedImage(file, uploadImage));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        title={value ? 'Replace image' : 'Upload image'}
        className="border-muted-foreground/20 bg-muted/30 text-muted-foreground/50 group relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-all hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-500 hover:dark:bg-emerald-950/20"
      >
        {uploading ? (
          <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
        ) : value ? (
          <>
            <img src={value} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-black/0 transition-all group-hover:bg-black/30" />
            <Upload className="absolute bottom-1 right-1 h-3.5 w-3.5 text-white opacity-0 drop-shadow transition-all group-hover:opacity-100" />
          </>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <Upload className="h-5 w-5" />
            <span className="text-[10px] font-medium">Image</span>
          </div>
        )}
      </button>
    </>
  );
}

/* ═══ Stock Bar Visualization ═══ */
function StockBar({ stock, threshold }: { stock: number; threshold: number }) {
  const pct = threshold > 0 ? Math.min((stock / (threshold * 3)) * 100, 100) : stock > 0 ? 100 : 0;
  const isLow = stock <= threshold;
  const isOut = stock === 0;

  return (
    <div className="flex items-center gap-2">
      <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isOut
              ? 'bg-red-400 dark:bg-red-500'
              : isLow
                ? 'bg-amber-400 dark:bg-amber-500'
                : 'bg-emerald-400 dark:bg-emerald-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className={`text-[10px] font-semibold tabular-nums ${
          isOut
            ? 'text-red-500'
            : isLow
              ? 'text-amber-500'
              : 'text-emerald-600 dark:text-emerald-400'
        }`}
      >
        {stock}
      </span>
    </div>
  );
}

/* ═══ Variant Card (Creative Design) ═══ */
function VariantCard({
  v,
  index,
  hasInventories,
  activeInventories,
  onPatch,
  onAllocChange,
  onRemove,
}: {
  v: VariantRow;
  index: number;
  hasInventories: boolean;
  activeInventories: { id: string; name: string; location?: string }[];
  onPatch: (patch: Partial<VariantRow>) => void;
  onAllocChange: (inventoryId: string, value: string) => void;
  onRemove: () => void;
}) {
  const stock = Number(v.stock) || 0;
  const threshold = Number(v.lowStockThreshold) || 5;
  const price = Number(v.price) || 0;
  const compareAt = Number(v.compareAtPrice) || 0;
  const savings = compareAt > price ? compareAt - price : 0;

  const inputCls =
    'w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 transition-all';
  const tinyInputCls =
    'w-full rounded-lg border border-border bg-background/50 px-2.5 py-1.5 text-xs placeholder:text-muted-foreground/50 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 transition-all';

  /* Color accents per variant index */
  const accentColors = [
    {
      bg: 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30',
      border: 'border-blue-200 dark:border-blue-800',
      badge: 'bg-blue-500',
      text: 'text-blue-600 dark:text-blue-400',
    },
    {
      bg: 'bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30',
      border: 'border-violet-200 dark:border-violet-800',
      badge: 'bg-violet-500',
      text: 'text-violet-600 dark:text-violet-400',
    },
    {
      bg: 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30',
      border: 'border-amber-200 dark:border-amber-800',
      badge: 'bg-amber-500',
      text: 'text-amber-600 dark:text-amber-400',
    },
    {
      bg: 'bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30',
      border: 'border-rose-200 dark:border-rose-800',
      badge: 'bg-rose-500',
      text: 'text-rose-600 dark:text-rose-400',
    },
    {
      bg: 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30',
      border: 'border-emerald-200 dark:border-emerald-800',
      badge: 'bg-emerald-500',
      text: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      bg: 'bg-gradient-to-br from-cyan-50 to-sky-50 dark:from-cyan-950/30 dark:to-sky-950/30',
      border: 'border-cyan-200 dark:border-cyan-800',
      badge: 'bg-cyan-500',
      text: 'text-cyan-600 dark:text-cyan-400',
    },
  ];
  const accent = accentColors[index % accentColors.length];

  return (
    <div
      className={`group relative rounded-2xl border-2 ${accent.border} ${accent.bg} transition-all duration-300 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 ${v.collapsed ? '' : 'p-0'}`}
    >
      {/* ── Header Bar ── */}
      <div
        className={`flex items-center gap-3 px-4 py-3 ${v.collapsed ? 'rounded-2xl' : 'rounded-t-xl border-b border-black/5 dark:border-white/5'}`}
      >
        {/* Number badge */}
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${accent.badge} text-[11px] font-bold text-white shadow-sm`}
        >
          {index + 1}
        </span>

        {/* Image thumbnail (collapsed) or full image (expanded) */}
        {!v.collapsed && (
          <VariantImageButton value={v.image} onChange={(url) => onPatch({ image: url })} />
        )}

        {/* Name + meta */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {v.collapsed ? (
              <input
                value={v.name}
                onChange={(e) => onPatch({ name: e.target.value })}
                placeholder={`Variant #${index + 1}`}
                className="text-foreground placeholder:text-muted-foreground/50 flex-1 bg-transparent text-sm font-semibold focus:outline-none"
              />
            ) : (
              <span className="text-foreground truncate text-sm font-semibold">
                {v.name || `Variant #${index + 1}`}
              </span>
            )}
            {savings > 0 && (
              <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
                Save ৳{savings.toLocaleString()}
              </span>
            )}
          </div>
          <div className="text-muted-foreground/70 mt-0.5 flex items-center gap-3 text-[11px]">
            {v.sku && <span className="font-mono">SKU: {v.sku}</span>}
            {price > 0 && (
              <span className="text-foreground font-semibold">৳{price.toLocaleString()}</span>
            )}
            <span
              className={`inline-flex items-center gap-1 ${stock === 0 ? 'text-red-500' : stock <= threshold ? 'text-amber-500' : 'text-emerald-600 dark:text-emerald-400'}`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${stock === 0 ? 'bg-red-500' : stock <= threshold ? 'bg-amber-500' : 'bg-emerald-500'}`}
              />
              {stock === 0 ? 'Out of stock' : stock <= threshold ? 'Low stock' : 'In stock'}
            </span>
          </div>
        </div>

        {/* Header actions */}
        <div className="flex items-center gap-1.5">
          {/* Active toggle */}
          <button
            type="button"
            onClick={() => onPatch({ isActive: !v.isActive })}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              v.isActive ? 'bg-emerald-500' : 'bg-muted-foreground/25'
            }`}
            title={v.isActive ? 'Active — click to deactivate' : 'Inactive — click to activate'}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                v.isActive ? 'left-[22px]' : 'left-0.5'
              }`}
            />
          </button>

          {/* Expand/Collapse */}
          <button
            type="button"
            onClick={() => onPatch({ collapsed: !v.collapsed })}
            className="text-muted-foreground/50 hover:text-foreground rounded-lg p-1.5 transition-colors hover:bg-black/5 hover:dark:bg-white/5"
            title={v.collapsed ? 'Expand' : 'Collapse'}
          >
            {v.collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>

          {/* Delete */}
          <button
            type="button"
            onClick={onRemove}
            className="text-muted-foreground/50 rounded-lg p-1.5 transition-colors hover:bg-red-50 hover:text-red-500 hover:dark:bg-red-950/30"
            title="Remove variant"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Expanded Content ── */}
      {!v.collapsed && (
        <div className="space-y-4 p-4">
          {/* Row 1: Name + SKU */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_140px]">
            <div>
              <label className="text-muted-foreground/60 mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider">
                <Hash className="h-3 w-3" /> Variant Name
              </label>
              <input
                value={v.name}
                onChange={(e) => onPatch({ name: e.target.value })}
                placeholder="e.g. 128GB / Black / XL"
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-muted-foreground/60 mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider">
                SKU Code
              </label>
              <input
                value={v.sku}
                onChange={(e) => onPatch({ sku: e.target.value })}
                placeholder="IPH-15-BLK-128"
                className={`${inputCls} font-mono text-xs`}
              />
            </div>
          </div>

          {/* Row 2: Pricing (blue accent) */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-800/50 dark:bg-blue-950/20">
            <div className="mb-2.5 flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Pricing
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2.5">
              <div>
                <label className="mb-1 block text-[10px] font-medium text-blue-600/70 dark:text-blue-400/70">
                  Sale Price (৳) *
                </label>
                <input
                  type="number"
                  min={0}
                  value={v.price}
                  onChange={(e) => onPatch({ price: e.target.value })}
                  placeholder="0"
                  className={`${tinyInputCls} font-semibold`}
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-medium text-blue-600/70 dark:text-blue-400/70">
                  Compare-at (৳)
                </label>
                <input
                  type="number"
                  min={0}
                  value={v.compareAtPrice}
                  onChange={(e) => onPatch({ compareAtPrice: e.target.value })}
                  placeholder="0"
                  className={tinyInputCls}
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-medium text-blue-600/70 dark:text-blue-400/70">
                  Cost (৳)
                </label>
                <input
                  type="number"
                  min={0}
                  value={v.cost}
                  onChange={(e) => onPatch({ cost: e.target.value })}
                  placeholder="0"
                  className={tinyInputCls}
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-medium text-blue-600/70 dark:text-blue-400/70">
                  Savings
                </label>
                <div className="flex h-[30px] items-center rounded-lg bg-blue-100/70 px-2.5 text-xs font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  {savings > 0 ? `৳${savings.toLocaleString()}` : '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Stock (amber accent) */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-800/50 dark:bg-amber-950/20">
            <div className="mb-2.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Stock & Threshold
                </span>
              </div>
              <StockBar stock={stock} threshold={threshold} />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="mb-1 block text-[10px] font-medium text-amber-600/70 dark:text-amber-400/70">
                  Quantity in Stock *
                </label>
                <input
                  type="number"
                  min={0}
                  value={v.stock}
                  onChange={(e) => onPatch({ stock: e.target.value })}
                  placeholder="0"
                  className={`${tinyInputCls} font-semibold`}
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-medium text-amber-600/70 dark:text-amber-400/70">
                  Low Stock Alert Threshold
                </label>
                <input
                  type="number"
                  min={0}
                  value={v.lowStockThreshold}
                  onChange={(e) => onPatch({ lowStockThreshold: e.target.value })}
                  placeholder="5"
                  className={tinyInputCls}
                />
              </div>
            </div>
          </div>

          {/* Row 4: Warehouse Allocations — hidden for variants (per-variant per-warehouse not yet supported; stock tracked as single pool) */}
          {false && hasInventories && activeInventories.length > 0 && (
            <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-800/50 dark:bg-violet-950/20">
              <div className="mb-2.5 flex items-center gap-1.5">
                <Warehouse className="h-3.5 w-3.5 text-violet-500" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                  Warehouse Stock
                </span>
              </div>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {activeInventories.map((inv) => {
                  const alloc = Number(v.allocations[inv.id]) || 0;
                  return (
                    <div
                      key={inv.id}
                      className="bg-background/70 flex items-center gap-2 rounded-lg border border-violet-100 px-3 py-2 dark:border-violet-900/50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-foreground truncate text-xs font-medium">{inv.name}</p>
                        {inv.location && (
                          <p className="text-muted-foreground/60 truncate text-[10px]">
                            {inv.location}
                          </p>
                        )}
                      </div>
                      <input
                        type="number"
                        min={0}
                        value={v.allocations[inv.id] ?? ''}
                        onChange={(e) => onAllocChange(inv.id, e.target.value)}
                        placeholder="0"
                        className="border-border bg-background w-16 rounded-lg border px-2 py-1 text-right text-xs font-semibold focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══ Main ProductForm ═══ */
export function ProductForm({
  initial,
  saving,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: AdminProductDetail;
  saving: boolean;
  submitLabel: string;
  onSubmit: (payload: ProductPayload, variants: VariantInput[]) => void | Promise<void>;
  onCancel: () => void;
}) {
  const { data: categoriesRes } = useAdminCategories();
  const { data: brandsRes } = useAdminBrands();
  const { data: inventoriesRes } = useInventories();
  const categories = categoriesRes?.data ?? [];
  const brands = brandsRes?.data ?? [];
  const activeInventories = (inventoriesRes?.data ?? [])
    .filter((inv) => inv.isActive)
    .map((inv) => ({ id: inv.id, name: inv.name, location: inv.location ?? undefined }));

  const [form, setForm] = useState<FormState>(() => toFormState(initial));
  const [gallery, setGallery] = useState<string[]>(() => initial?.images ?? []);
  const [variants, setVariants] = useState<VariantRow[]>(() => toVariantRows(initial));
  const [slugTouched, setSlugTouched] = useState(!!initial);
  const [allocations, setAllocations] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (initial?.inventoryAllocations ?? []).map((a) => [a.inventoryId, String(a.quantity)])
    )
  );

  const hasInventories = activeInventories.length > 0;
  const hasVariants = variants.length > 0;
  const allocationTotal = activeInventories.reduce(
    (sum, inv) => sum + (Number(allocations[inv.id]) || 0),
    0
  );

  const set = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }));
  const setVariant = (key: string, patch: Partial<VariantRow>) =>
    setVariants((prev) => prev.map((v) => (v.key === key ? { ...v, ...patch } : v)));
  const setVariantAllocation = (key: string, inventoryId: string, value: string) =>
    setVariants((prev) =>
      prev.map((v) =>
        v.key === key ? { ...v, allocations: { ...v.allocations, [inventoryId]: value } } : v
      )
    );

  // Called after VariantBuilder generates combinations — use data directly (no refetch needed)
  const handleVariantsGenerated = (generatedVariants: AdminVariant[]) => {
    setVariants(
      generatedVariants.map((v) => ({
        key: v.id,
        id: v.id,
        name: v.name,
        sku: v.sku ?? '',
        price: String(v.price),
        compareAtPrice: v.compareAtPrice !== null ? String(v.compareAtPrice) : '',
        cost: (v as unknown as { cost?: number | null }).cost != null ? String((v as unknown as { cost: number }).cost) : '',
        stock: String(v.stock),
        lowStockThreshold: '5',
        image: v.image ?? '',
        isActive: v.isActive,
        allocations: {},
        collapsed: false,
      }))
    );
  };

  const handleNameChange = (name: string) => {
    set(slugTouched ? { name } : { name, slug: slugify(name) });
  };

  const handleSubmit = () => {
    if (!form.name.trim() || !form.slug.trim()) {
      toast.error('Name and slug are required');
      return;
    }
    const price = Number(form.price);
    if (!price || price <= 0) {
      toast.error('Enter a valid base price');
      return;
    }
    if (!form.image.trim()) {
      toast.error('Upload or set a main product image');
      return;
    }

    const variantInputs: VariantInput[] = [];
    for (const [i, v] of variants.entries()) {
      if (!v.name.trim()) {
        toast.error(`Variant #${i + 1}: name is required`);
        return;
      }
      const vPrice = Number(v.price);
      if (!vPrice || vPrice <= 0) {
        toast.error(`Variant "${v.name}": enter a valid price`);
        return;
      }
      variantInputs.push({
        id: v.id,
        name: v.name.trim(),
        sku: v.sku.trim() || null,
        price: vPrice,
        compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : null,
        cost: v.cost ? Number(v.cost) : null,
        stock: Number(v.stock) || 0,
        image: v.image || null,
        isActive: v.isActive,
      });
    }

    void onSubmit(
      {
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description.trim() || undefined,
        shortDescription: form.shortDescription.trim() || undefined,
        price,
        compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : null,
        cost: form.cost ? Number(form.cost) : null,
        stock: hasVariants
          ? variants.reduce((s, v) => s + (Number(v.stock) || 0), 0)
          : hasInventories
            ? allocationTotal
            : Number(form.stock) || 0,
        categoryId: form.categoryId || null,
        brandId: form.brandId || null,
        image: form.image.trim(),
        images: gallery.length > 0 ? gallery : undefined,
        isActive: form.isActive,
        isFeatured: form.isFeatured,
        inventoryAllocations: hasInventories && !hasVariants
          ? activeInventories.map((inv) => ({
              inventoryId: inv.id,
              quantity: Number(allocations[inv.id]) || 0,
            }))
          : undefined,
      },
      variantInputs
    );
  };

  const inputCls =
    'w-full rounded-lg border border-border bg-background/50 px-4 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 transition-all';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-foreground text-xl font-semibold">
          {initial ? `Edit: ${initial.name}` : 'Add New Product'}
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="border-border bg-card text-foreground hover:bg-muted/50 rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-emerald-500/20 transition-all hover:bg-emerald-600 hover:shadow-md hover:shadow-emerald-500/30 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitLabel}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* ═══ LEFT COLUMN ═══ */}
        <div className="space-y-6">
          {/* ── 1. Basic Details ── */}
          <SectionCard
            icon={<Package className="h-4 w-4 text-emerald-500" />}
            title="Basic Details"
            color="emerald"
          >
            <div className="space-y-4">
              <div>
                <label className="text-foreground mb-1.5 block text-sm font-medium">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="iPhone 15"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-foreground mb-1.5 block text-sm font-medium">Slug *</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set({ slug: slugify(e.target.value) });
                  }}
                  placeholder="iphone-15"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-foreground mb-1.5 block text-sm font-medium">
                  Short Description
                </label>
                <input
                  type="text"
                  value={form.shortDescription}
                  onChange={(e) => set({ shortDescription: e.target.value })}
                  maxLength={500}
                  placeholder="One-line summary shown on product cards"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-foreground mb-1.5 block text-sm font-medium">
                  Product Description
                </label>
                <RichTextEditor
                  value={form.description}
                  onChange={(html) => set({ description: html })}
                  placeholder="Full product description..."
                />
              </div>
            </div>
          </SectionCard>

          {/* ── 2. Pricing + Warehouse Stock ── */}
          <SectionCard
            icon={<DollarSign className="h-4 w-4 text-blue-500" />}
            title="Pricing & Stock"
            color="blue"
          >
            <div className="space-y-5">
              <p className="text-muted-foreground/70 text-xs">
                Base price — used when the product has no variants, or as the default.
              </p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div>
                  <label className="text-foreground mb-1.5 block text-sm font-medium">
                    Price (৳) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.price}
                    onChange={(e) => set({ price: e.target.value })}
                    placeholder="99999"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-foreground mb-1.5 block text-sm font-medium">
                    Compare-at (৳)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.compareAtPrice}
                    onChange={(e) => set({ compareAtPrice: e.target.value })}
                    placeholder="119999"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-foreground mb-1.5 block text-sm font-medium">
                    Cost (৳)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.cost}
                    onChange={(e) => set({ cost: e.target.value })}
                    placeholder="85000"
                    className={inputCls}
                  />
                  <p className="text-muted-foreground/70 mt-1 text-[11px]">
                    For profit reports — hidden from customers.
                  </p>
                </div>
              </div>

              {/* Warehouse Stock Allocation */}
              {hasInventories && (
                <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-4 dark:border-violet-800/50 dark:bg-violet-950/20">
                  <div className="mb-3 flex items-center gap-1.5">
                    <Warehouse className="h-3.5 w-3.5 text-violet-500" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                      Warehouse Stock Allocation
                    </span>
                  </div>
                  <p className="text-muted-foreground/70 mb-3 text-xs">
                    Allocate base stock to each warehouse — total is calculated automatically.
                  </p>
                  <div className="space-y-2">
                    {activeInventories.map((inv) => (
                      <div
                        key={inv.id}
                        className="bg-background/70 flex items-center gap-3 rounded-lg border border-violet-100 px-3 py-2.5 dark:border-violet-900/50"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-foreground truncate text-sm font-medium">{inv.name}</p>
                          {inv.location && (
                            <p className="text-muted-foreground truncate text-[11px]">
                              {inv.location}
                            </p>
                          )}
                        </div>
                        <input
                          type="number"
                          min={0}
                          value={allocations[inv.id] ?? ''}
                          onChange={(e) =>
                            setAllocations((prev) => ({ ...prev, [inv.id]: e.target.value }))
                          }
                          placeholder="0"
                          className="border-border bg-background w-24 rounded-lg border px-2.5 py-2 text-right text-sm font-semibold focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-between rounded-lg bg-violet-100/70 px-3 py-2 dark:bg-violet-900/30">
                    <span className="text-sm font-medium text-violet-700 dark:text-violet-400">
                      Total Base Stock
                    </span>
                    <span className="text-sm font-bold text-violet-700 dark:text-violet-400">
                      {allocationTotal}
                    </span>
                  </div>
                </div>
              )}

              {/* Simple stock when no warehouses */}
              {!hasInventories && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-foreground mb-1.5 block text-sm font-medium">
                      Stock Quantity
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={form.stock}
                      onChange={(e) => set({ stock: e.target.value })}
                      placeholder="0"
                      className={inputCls}
                    />
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          {/* ── 3. Variant Types ── */}
          <SectionCard
            icon={<Layers className="h-4 w-4 text-emerald-500" />}
            title="Variant Types"
            color="emerald"
          >
            <p className="text-muted-foreground/70 mb-4 text-xs">
              Define groups like Color, Size, Storage. Add options to each group, then generate
              combinations below.
            </p>
            {initial?.id ? (
              <VariantBuilder productId={initial.id} onGenerated={handleVariantsGenerated} />
            ) : (
              <div className="border-border flex flex-col items-center rounded-xl border-2 border-dashed py-10">
                <Layers className="text-muted-foreground/20 h-10 w-10" />
                <p className="text-muted-foreground/60 mt-3 text-sm">
                  Save the product first, then add variant types
                </p>
              </div>
            )}
          </SectionCard>

          {/* ── 4. Generated Variants ── */}
          <div className="border-border bg-card rounded-xl border p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-foreground flex items-center gap-2 text-base font-semibold">
                <Boxes className="h-4 w-4 text-emerald-500" /> Generated Variants
                {hasVariants && (
                  <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-100 px-1.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
                    {variants.length}
                  </span>
                )}
              </h3>
              <button
                type="button"
                onClick={() => setVariants((prev) => [...prev, newVariantRow()])}
                className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-600 transition-all hover:bg-emerald-100 hover:shadow-sm dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400 hover:dark:bg-emerald-900/40"
              >
                <Plus className="h-3.5 w-3.5" /> Add Manual
              </button>
            </div>

            <p className="text-muted-foreground/70 mb-5 text-xs">
              Variants generated from the builder above, or added manually. Each variant has its own
              pricing, stock, and visibility.
            </p>

            {variants.length === 0 ? (
              <div className="border-border flex flex-col items-center rounded-xl border-2 border-dashed py-10">
                <Boxes className="text-muted-foreground/20 h-10 w-10" />
                <p className="text-muted-foreground/60 mt-3 text-sm">
                  No variants — product uses base price and stock only
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {variants.map((v, i) => (
                  <VariantCard
                    key={v.key}
                    v={v}
                    index={i}
                    hasInventories={hasInventories}
                    activeInventories={activeInventories}
                    onPatch={(patch) => setVariant(v.key, patch)}
                    onAllocChange={(invId, val) => setVariantAllocation(v.key, invId, val)}
                    onRemove={() => setVariants((prev) => prev.filter((row) => row.key !== v.key))}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ═══ RIGHT COLUMN ═══ */}
        <div className="space-y-6">
          {/* Images */}
          <SectionCard title="Product Images" color="emerald">
            <div className="space-y-5">
              <SingleImageUploader value={form.image} onChange={(url) => set({ image: url })} />
              <MultiImageUploader values={gallery} onChange={setGallery} />
            </div>
          </SectionCard>

          {/* Organization */}
          <SectionCard title="Organization" color="emerald">
            <div className="space-y-4">
              <div>
                <label className="text-foreground mb-1.5 block text-sm font-medium">Category</label>
                <select
                  value={form.categoryId}
                  onChange={(e) => set({ categoryId: e.target.value })}
                  className={inputCls}
                >
                  <option value="">No category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-foreground mb-1.5 block text-sm font-medium">Brand</label>
                <select
                  value={form.brandId}
                  onChange={(e) => set({ brandId: e.target.value })}
                  className={inputCls}
                >
                  <option value="">No brand</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </SectionCard>

          {/* Visibility */}
          <SectionCard
            icon={<Eye className="h-4 w-4 text-emerald-500" />}
            title="Visibility"
            color="emerald"
          >
            <div className="space-y-3">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => set({ isActive: e.target.checked })}
                  className="border-border h-4 w-4 rounded accent-emerald-500"
                />
                <span className="text-muted-foreground text-sm">
                  Active (visible in storefront)
                </span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isFeatured}
                  onChange={(e) => set({ isFeatured: e.target.checked })}
                  className="border-border h-4 w-4 rounded accent-emerald-500"
                />
                <span className="text-muted-foreground text-sm">
                  Featured (highlight on homepage)
                </span>
              </label>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

/* ═══ Section Card ═══ */
function SectionCard({
  icon,
  title,
  color = 'emerald',
  action,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  color?: 'emerald' | 'blue' | 'violet' | 'amber' | 'rose';
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const colorMap = {
    emerald: 'border-emerald-200 dark:border-emerald-800/50',
    blue: 'border-blue-200 dark:border-blue-800/50',
    violet: 'border-violet-200 dark:border-violet-800/50',
    amber: 'border-amber-200 dark:border-amber-800/50',
    rose: 'border-rose-200 dark:border-rose-800/50',
  };

  return (
    <div className={`rounded-xl border ${colorMap[color]} bg-card p-6 shadow-sm`}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-foreground flex items-center gap-2 text-base font-semibold">
          {icon} {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  );
}
