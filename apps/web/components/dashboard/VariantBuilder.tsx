'use client';

import {
  Plus,
  Trash2,
  Sparkles,
  Palette,
  Ruler,
  HardDrive,
  Layers,
  Loader2,
  X,
  Check,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  useVariantTypes,
  useCreateVariantType,
  useUpdateVariantType,
  useDeleteVariantType,
  useAddVariantOption,
  useUpdateVariantOption,
  useDeleteVariantOption,
  useGenerateCombinations,
  type VariantTypePreset,
  type VariantTypeItem,
  type AdminVariant,
} from '@/hooks/useAdmin';

const PRESETS: {
  type: VariantTypePreset;
  label: string;
  icon: typeof Palette;
  defaultOptions: string[];
}[] = [
  { type: 'color', label: 'Color', icon: Palette, defaultOptions: [] },
  { type: 'size', label: 'Size', icon: Ruler, defaultOptions: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
  {
    type: 'storage',
    label: 'Storage',
    icon: HardDrive,
    defaultOptions: ['64GB', '128GB', '256GB', '512GB', '1TB'],
  },
  {
    type: 'material',
    label: 'Material',
    icon: Layers,
    defaultOptions: ['Cotton', 'Polyester', 'Silk', 'Leather', 'Denim'],
  },
  { type: 'custom', label: 'Custom', icon: Layers, defaultOptions: [] },
];

const PRESET_COLORS = [
  { name: 'Black', value: '#000000' },
  { name: 'White', value: '#FFFFFF' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#22C55E' },
  { name: 'Yellow', value: '#EAB308' },
  { name: 'Purple', value: '#A855F7' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Gray', value: '#6B7280' },
  { name: 'Navy', value: '#1E3A5F' },
  { name: 'Brown', value: '#8B5E3C' },
];

function OptionInput({
  option,
  type,
  onUpdate,
  onDelete,
}: {
  option: { id: string; name: string; value: string | null };
  type: VariantTypePreset;
  onUpdate: (name: string, value?: string | null, afterSave?: () => void) => void | Promise<void>;
  onDelete: () => void;
}) {
  const isColor = type === 'color';
  const [name, setName] = useState(option.name);
  const [saving, setSaving] = useState(false);

  useEffect(() => setName(option.name), [option.name]);

  const commit = async (newName: string, value?: string | null) => {
    const trimmed = newName.trim();
    if (
      !trimmed ||
      (trimmed === option.name && (value ?? option.value) === (option.value ?? null))
    ) {
      setName(option.name);
      return;
    }
    setSaving(true);
    try {
      await onUpdate(trimmed, value, () => setSaving(false));
    } catch {
      setName(option.name);
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {isColor && (
        <div className="relative">
          <input
            type="color"
            value={option.value || '#000000'}
            onChange={(e) => {
              void commit(name, e.target.value);
            }}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
          <div
            className="border-border h-8 w-8 rounded-lg border shadow-sm"
            style={{ backgroundColor: option.value || '#000000' }}
          />
        </div>
      )}
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => void commit(name, isColor ? option.value : undefined)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'Escape') setName(option.name);
        }}
        placeholder={isColor ? 'Color name' : 'Option name'}
        className="border-border placeholder:text-muted-foreground/70 flex-1 rounded-lg border px-3 py-1.5 text-sm focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-300"
      />
      {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-500" />}
      <button
        type="button"
        onClick={onDelete}
        className="text-muted-foreground/70 rounded-lg p-1.5 transition-colors hover:bg-red-50 hover:text-red-500"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function TypeNameInput({
  name,
  onCommit,
  className,
}: {
  name: string;
  onCommit: (name: string) => void | Promise<void>;
  className?: string;
}) {
  const [value, setValue] = useState(name);
  const [saving, setSaving] = useState(false);

  useEffect(() => setValue(name), [name]);

  const commit = async () => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === name) {
      setValue(name);
      return;
    }
    setSaving(true);
    try {
      await onCommit(trimmed);
    } catch {
      setValue(name);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-w-0 items-center gap-1">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'Escape') setValue(name);
        }}
        title="Rename variant type"
        className={className}
      />
      {saving && <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />}
    </div>
  );
}

export function VariantBuilder({
  productId,
  onGenerated,
}: {
  productId: string;
  onGenerated?: (variants: AdminVariant[]) => void;
}) {
  const { data: typesRes, isLoading } = useVariantTypes(productId);
  const createType = useCreateVariantType();
  const updateType = useUpdateVariantType();
  const deleteType = useDeleteVariantType();
  const addOption = useAddVariantOption();
  const updateOption = useUpdateVariantOption();
  const deleteOption = useDeleteVariantOption();
  const generateCombinations = useGenerateCombinations();

  const [showAddType, setShowAddType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypePreset, setNewTypePreset] = useState<VariantTypePreset>('custom');
  const [newOptionText, setNewOptionText] = useState<Record<string, string>>({});
  const [generateDefaults, setGenerateDefaults] = useState({
    defaultPrice: '',
    defaultCompareAtPrice: '',
    defaultCost: '',
    defaultStock: '0',
    defaultSku: '',
  });
  const [showGenerate, setShowGenerate] = useState(false);

  const types = typesRes?.data ?? [];

  const handleAddType = async () => {
    if (!newTypeName.trim()) {
      toast.error('Enter a variant type name');
      return;
    }
    const preset = PRESETS.find((p) => p.type === newTypePreset);
    const res = await createType.mutateAsync({
      productId,
      data: {
        name: newTypeName.trim(),
        type: newTypePreset,
        sortOrder: types.length,
      },
    });

    // If preset has default options, add them
    const newTypeId = (res as { success: boolean; data: { id: string } }).data?.id;
    if (preset && preset.defaultOptions.length > 0 && newTypeId) {
      for (const optName of preset.defaultOptions) {
        await addOption.mutateAsync({
          variantTypeId: newTypeId,
          data: { name: optName, sortOrder: 0 },
          productId,
        });
      }
    }

    setNewTypeName('');
    setNewTypePreset('custom');
    setShowAddType(false);
    toast.success('Variant type added');
  };

  const handleAddOption = async (vt: VariantTypeItem) => {
    const text = newOptionText[vt.id]?.trim();
    if (!text) return;
    await addOption.mutateAsync({
      variantTypeId: vt.id,
      data: {
        name: text,
        value:
          vt.type === 'color'
            ? (PRESET_COLORS.find((c) => c.name.toLowerCase() === text.toLowerCase())?.value ??
              null)
            : undefined,
        sortOrder: vt.options.length,
      },
      productId,
    });
    setNewOptionText((prev) => ({ ...prev, [vt.id]: '' }));
  };

  const handleDeleteOption = async (optionId: string, productId: string) => {
    await deleteOption.mutateAsync({ id: optionId, productId });
  };

  const handleUpdateOption = async (
    vt: VariantTypeItem,
    opt: { id: string },
    name: string,
    value?: string | null
  ) => {
    await updateOption.mutateAsync({
      id: opt.id,
      data: { name, value: value ?? null, sortOrder: vt.options.findIndex((o) => o.id === opt.id) },
      productId,
    });
  };

  const handleUpdateTypeName = async (vt: VariantTypeItem, name: string) => {
    await updateType.mutateAsync({
      id: vt.id,
      data: { name, type: vt.type, sortOrder: vt.sortOrder },
      productId,
    });
  };

  const handleDeleteType = async (vt: VariantTypeItem) => {
    if (!confirm(`Delete "${vt.name}" and all its options?`)) return;
    await deleteType.mutateAsync({ id: vt.id, productId });
    toast.success('Variant type deleted');
  };

  const handleGenerate = async () => {
    const price = Number(generateDefaults.defaultPrice);
    if (!price || price <= 0) {
      toast.error('Enter a valid default price');
      return;
    }
    const result = await generateCombinations.mutateAsync({
      productId,
      data: {
        defaultPrice: price,
        defaultCompareAtPrice: generateDefaults.defaultCompareAtPrice
          ? Number(generateDefaults.defaultCompareAtPrice)
          : null,
        defaultCost: generateDefaults.defaultCost ? Number(generateDefaults.defaultCost) : null,
        defaultStock: Number(generateDefaults.defaultStock) || 0,
        defaultSku: generateDefaults.defaultSku || null,
      },
    });
    toast.success('Variant combinations generated!');
    setShowGenerate(false);
    // Pass generated data directly — avoids extra refetch
    if (result?.data) onGenerated?.(result.data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Existing variant types */}
      {types.map((vt) => (
        <div key={vt.id} className="border-border bg-muted/30 rounded-lg border p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-2">
              {vt.type === 'color' && <Palette className="h-4 w-4 shrink-0 text-emerald-500" />}
              {vt.type === 'size' && <Ruler className="h-4 w-4 shrink-0 text-emerald-500" />}
              {vt.type === 'storage' && <HardDrive className="h-4 w-4 shrink-0 text-emerald-500" />}
              {vt.type === 'material' && <Layers className="h-4 w-4 shrink-0 text-emerald-500" />}
              {vt.type === 'custom' && <Layers className="h-4 w-4 shrink-0 text-emerald-500" />}
              <TypeNameInput
                name={vt.name}
                onCommit={(name) => handleUpdateTypeName(vt, name)}
                className="text-foreground focus:bg-background/70 min-w-0 flex-1 truncate bg-transparent text-sm font-semibold focus:rounded focus:px-2 focus:outline-none"
              />
              <span className="bg-muted text-muted-foreground shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium">
                {vt.type}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleDeleteType(vt)}
              className="text-muted-foreground/70 shrink-0 rounded-lg p-1 transition-colors hover:bg-red-50 hover:text-red-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Options */}
          <div className="space-y-2">
            {vt.options.map((opt) => (
              <OptionInput
                key={opt.id}
                option={opt}
                type={vt.type}
                onUpdate={(name, value) => handleUpdateOption(vt, opt, name, value)}
                onDelete={() => handleDeleteOption(opt.id, productId)}
              />
            ))}

            {/* Quick add for color type */}
            {vt.type === 'color' && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => {
                      if (vt.options.some((o) => o.name.toLowerCase() === c.name.toLowerCase()))
                        return;
                      addOption.mutateAsync({
                        variantTypeId: vt.id,
                        data: { name: c.name, value: c.value, sortOrder: vt.options.length },
                        productId,
                      });
                    }}
                    className="border-border group relative h-7 w-7 rounded-full border-2 transition-all hover:scale-110 hover:border-emerald-400"
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  >
                    {vt.options.some((o) => o.name.toLowerCase() === c.name.toLowerCase()) && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30">
                        <span className="text-[8px] font-bold text-white">✓</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Add option input */}
            <div className="flex gap-2 pt-1">
              <input
                value={newOptionText[vt.id] ?? ''}
                onChange={(e) => setNewOptionText((prev) => ({ ...prev, [vt.id]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddOption(vt);
                  }
                }}
                placeholder={
                  vt.type === 'color'
                    ? 'Add color name...'
                    : `Add ${vt.name.toLowerCase()} option...`
                }
                className="border-border placeholder:text-muted-foreground/70 flex-1 rounded-lg border px-3 py-1.5 text-sm focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-300"
              />
              <button
                type="button"
                onClick={() => handleAddOption(vt)}
                className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-600"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Add new variant type */}
      {!showAddType ? (
        <button
          type="button"
          onClick={() => setShowAddType(true)}
          className="border-border text-muted-foreground/70 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-3 text-sm font-medium transition-colors hover:border-emerald-300 hover:text-emerald-500"
        >
          <Plus className="h-4 w-4" /> Add Variant Type
        </button>
      ) : (
        <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              New Variant Type
            </span>
            <button
              type="button"
              onClick={() => setShowAddType(false)}
              className="text-muted-foreground/70 hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Preset buttons */}
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => {
              const Icon = p.icon;
              return (
                <button
                  key={p.type}
                  type="button"
                  onClick={() => {
                    setNewTypePreset(p.type);
                    setNewTypeName(p.label);
                  }}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    newTypePreset === p.type
                      ? 'border-emerald-300 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                      : 'border-border bg-card text-muted-foreground hover:border-emerald-300'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" /> {p.label}
                </button>
              );
            })}
          </div>

          <input
            value={newTypeName}
            onChange={(e) => setNewTypeName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddType();
              }
            }}
            placeholder="e.g., Color, Size, Storage..."
            className="border-border placeholder:text-muted-foreground/70 w-full rounded-lg border px-3 py-2 text-sm focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-300"
          />

          <button
            type="button"
            onClick={handleAddType}
            disabled={createType.isPending}
            className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-60"
          >
            {createType.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Add Type
          </button>
        </div>
      )}

      {/* Generate combinations */}
      {types.length > 0 && types.some((vt) => vt.options.length > 0) && (
        <div className="pt-2">
          {!showGenerate ? (
            <button
              type="button"
              onClick={() => setShowGenerate(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:from-emerald-600 hover:to-teal-600"
            >
              <Sparkles className="h-4 w-4" /> Generate Variants from Options
            </button>
          ) : (
            <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  Generate Combinations
                </span>
                <button
                  type="button"
                  onClick={() => setShowGenerate(false)}
                  className="text-muted-foreground/70 hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-muted-foreground/70 text-xs">
                This will create{' '}
                {types.reduce((acc, vt) => acc * Math.max(vt.options.length, 1), 1)} variant
                combination(s) from{' '}
                {types.map((vt) => `${vt.name} (${vt.options.length})`).join(' × ')}.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-foreground mb-1 block text-xs font-medium">
                    Default Price (৳) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={generateDefaults.defaultPrice}
                    onChange={(e) =>
                      setGenerateDefaults((prev) => ({ ...prev, defaultPrice: e.target.value }))
                    }
                    placeholder="999"
                    className="border-border placeholder:text-muted-foreground/70 w-full rounded-lg border px-3 py-2 text-sm focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-300"
                  />
                </div>
                <div>
                  <label className="text-foreground mb-1 block text-xs font-medium">
                    Compare-at Price (৳)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={generateDefaults.defaultCompareAtPrice}
                    onChange={(e) =>
                      setGenerateDefaults((prev) => ({
                        ...prev,
                        defaultCompareAtPrice: e.target.value,
                      }))
                    }
                    placeholder="1299"
                    className="border-border placeholder:text-muted-foreground/70 w-full rounded-lg border px-3 py-2 text-sm focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-300"
                  />
                </div>
                <div>
                  <label className="text-foreground mb-1 block text-xs font-medium">
                    Default Cost (৳)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={generateDefaults.defaultCost}
                    onChange={(e) =>
                      setGenerateDefaults((prev) => ({ ...prev, defaultCost: e.target.value }))
                    }
                    placeholder="0"
                    className="border-border placeholder:text-muted-foreground/70 w-full rounded-lg border px-3 py-2 text-sm focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-300"
                  />
                </div>
                <div>
                  <label className="text-foreground mb-1 block text-xs font-medium">
                    Default Stock
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={generateDefaults.defaultStock}
                    onChange={(e) =>
                      setGenerateDefaults((prev) => ({ ...prev, defaultStock: e.target.value }))
                    }
                    placeholder="0"
                    className="border-border placeholder:text-muted-foreground/70 w-full rounded-lg border px-3 py-2 text-sm focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-300"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-foreground mb-1 block text-xs font-medium">
                    SKU Prefix
                  </label>
                  <input
                    value={generateDefaults.defaultSku}
                    onChange={(e) =>
                      setGenerateDefaults((prev) => ({ ...prev, defaultSku: e.target.value }))
                    }
                    placeholder="PROD-001"
                    className="border-border placeholder:text-muted-foreground/70 w-full rounded-lg border px-3 py-2 text-sm focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-300"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generateCombinations.isPending}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 py-2.5 text-sm font-semibold text-white hover:from-emerald-600 hover:to-teal-600 disabled:opacity-60"
              >
                {generateCombinations.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                <Sparkles className="h-4 w-4" /> Generate Variants
              </button>
            </div>
          )}
        </div>
      )}

      {types.length === 0 && (
        <div className="border-border flex flex-col items-center rounded-lg border border-dashed py-8">
          <Layers className="text-muted-foreground/30 h-8 w-8" />
          <p className="text-muted-foreground/70 mt-2 text-sm">
            No variant types — add one above to create structured variants
          </p>
        </div>
      )}
    </div>
  );
}
