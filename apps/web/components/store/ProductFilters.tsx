'use client';

import { useCallback, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { useCategoryTree, useBrands } from '@/hooks/useCatalog';

type FilterState = {
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
};

type ProductFiltersProps = {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onReset: () => void;
};

/** Product filter sidebar with category, brand, price range filters */
export function ProductFilters({ filters, onFilterChange, onReset }: ProductFiltersProps) {
  const { data: categoriesRes, isLoading: loadingCategories } = useCategoryTree();
  const { data: brandsRes, isLoading: loadingBrands } = useBrands();

  const categoryTree = categoriesRes?.data ?? [];
  const brands = brandsRes?.data ?? [];

  // Local drag state for smooth slider movement
  const [localPrice, setLocalPrice] = useState<[number, number]>([
    filters.minPrice ?? 0,
    filters.maxPrice ?? 500000,
  ]);
  const isDragging = useRef(false);

  // Sync local state when URL filters change externally
  const prevMin = filters.minPrice ?? 0;
  const prevMax = filters.maxPrice ?? 500000;
  if (!isDragging.current && (localPrice[0] !== prevMin || localPrice[1] !== prevMax)) {
    setLocalPrice([prevMin, prevMax]);
  }

  const toggleCategory = (slug: string, checked: boolean) =>
    onFilterChange({ ...filters, category: checked ? slug : undefined });

  const hasActiveFilters =
    filters.category || filters.brand || filters.minPrice || filters.maxPrice;

  return (
    <aside className="space-y-6">
      {/* Categories */}
      <div className="space-y-3">
        <h3 className="text-label font-medium">Category</h3>
        {loadingCategories ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
          </div>
        ) : (
          <div className="space-y-2">
            {categoryTree
              .filter((c) => c.isActive)
              .map((category) => (
                <div key={category.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`cat-${category.id}`}
                      checked={filters.category === category.slug}
                      onCheckedChange={(checked) => toggleCategory(category.slug, !!checked)}
                    />
                    <Label htmlFor={`cat-${category.id}`} className="text-body-sm cursor-pointer">
                      {category.name}
                    </Label>
                  </div>
                  {/* Nested subcategories from /api/categories/tree */}
                  {category.children
                    .filter((c) => c.isActive)
                    .map((child) => (
                      <div key={child.id} className="ml-6 flex items-center gap-2">
                        <Checkbox
                          id={`cat-${child.id}`}
                          checked={filters.category === child.slug}
                          onCheckedChange={(checked) => toggleCategory(child.slug, !!checked)}
                        />
                        <Label
                          htmlFor={`cat-${child.id}`}
                          className="text-body-sm text-muted-foreground cursor-pointer"
                        >
                          {child.name}
                        </Label>
                      </div>
                    ))}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Brands */}
      <div className="space-y-3">
        <h3 className="text-label font-medium">Brand</h3>
        {loadingBrands ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
          </div>
        ) : (
          <div className="space-y-2">
            {brands
              .filter((b) => b.isActive)
              .map((brand) => (
                <div key={brand.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`brand-${brand.id}`}
                    checked={filters.brand === brand.slug}
                    onCheckedChange={(checked) =>
                      onFilterChange({
                        ...filters,
                        brand: checked ? brand.slug : undefined,
                      })
                    }
                  />
                  <Label htmlFor={`brand-${brand.id}`} className="text-body-sm cursor-pointer">
                    {brand.name}
                  </Label>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Price Range */}
      <div className="space-y-3">
        <h3 className="text-label font-medium">Price Range</h3>
        <div className="px-2 pt-2">
          <Slider
            defaultValue={[0, 500000]}
            max={500000}
            min={0}
            step={5000}
            value={localPrice}
            onValueChange={(val: number[]) => {
              isDragging.current = true;
              setLocalPrice(val as [number, number]);
            }}
            onValueCommit={([min, max]: number[]) => {
              isDragging.current = false;
              onFilterChange({
                ...filters,
                minPrice: min > 0 ? min : undefined,
                maxPrice: max < 500000 ? max : undefined,
              });
            }}
          />
        </div>
        <div className="flex items-center justify-between text-sm font-medium text-foreground">
          <span>৳{localPrice[0].toLocaleString()}</span>
          <span>৳{localPrice[1].toLocaleString()}</span>
        </div>
      </div>
    </aside>
  );
}
