'use client';

import { Loader2, Plus, Search, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';

import { useAdminProducts } from '@/hooks/useAdmin';
import { useProductsByIds } from '@/hooks/useProducts';
import { formatPrice } from '@/lib/utils';

type ProductPickerProps = {
  value: string[];
  onChange: (ids: string[]) => void;
  max?: number;
};

/**
 * Multi-select product picker for admin home sections.
 * Selected chips resolve name/image via the public by-IDs hook; the search
 * dropdown uses the existing admin products list endpoint.
 */
export function ProductPicker({ value, onChange, max = 20 }: ProductPickerProps) {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { products: selected } = useProductsByIds(value);
  const { data: searchRes, isFetching } = useAdminProducts({ search: debounced || undefined });
  const results = (searchRes?.data ?? []).filter((p) => !value.includes(p.id)).slice(0, 8);

  const add = (id: string) => {
    if (value.includes(id) || value.length >= max) return;
    onChange([...value, id]);
    setSearch('');
  };
  const remove = (id: string) => onChange(value.filter((v) => v !== id));

  return (
    <div className="space-y-3">
      {/* Selected chips */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((id) => {
            const p = selected.find((s) => s.id === id);
            return (
              <span
                key={id}
                className="border-border bg-muted/40 flex items-center gap-2 rounded-lg border py-1 pl-1 pr-2 text-xs"
              >
                {p?.image && (
                  <span className="relative h-6 w-6 overflow-hidden rounded bg-white">
                    <Image src={p.image} alt="" fill sizes="24px" className="object-contain" />
                  </span>
                )}
                <span className="text-foreground max-w-[140px] truncate">
                  {p?.name ?? id.slice(0, 8)}
                </span>
                <button
                  type="button"
                  onClick={() => remove(id)}
                  aria-label="Remove"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Search + results */}
      <div className="relative">
        <Search className="text-muted-foreground/70 absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={
            value.length >= max ? `Maximum ${max} products` : 'Search products to add...'
          }
          disabled={value.length >= max}
          className="border-border bg-card placeholder:text-muted-foreground/70 w-full rounded-lg border py-2 pl-9 pr-8 text-sm focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-300 disabled:opacity-50"
        />
        {isFetching && (
          <Loader2 className="text-muted-foreground absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin" />
        )}
      </div>

      {debounced && results.length > 0 && (
        <div className="border-border max-h-64 overflow-y-auto rounded-lg border">
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => add(p.id)}
              className="border-border/60 hover:bg-muted/50 flex w-full items-center gap-3 border-b px-3 py-2 text-left last:border-0"
            >
              <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded bg-white">
                <Image src={p.image} alt="" fill sizes="36px" className="object-contain" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="text-foreground block truncate text-sm">{p.name}</span>
                <span className="text-muted-foreground text-xs">{formatPrice(p.price)}</span>
              </span>
              <Plus className="h-4 w-4 shrink-0 text-emerald-500" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
