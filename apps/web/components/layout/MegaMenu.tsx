'use client';

import { ChevronDown } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

import { useCategories, type Category } from '@/hooks/useCatalog';
import { ICON_MAP } from '@/lib/icon-map';
import { cn } from '@/lib/utils';

import type { MenuItem } from '@/lib/menu-config';

/**
 * Desktop mega menu / hover dropdown.
 *
 * Renders a nav item trigger + a dropdown panel when the item has children.
 * For `type: 'category'` items, resolves category data from the DB.
 */
export function MegaMenuItem({
  item,
  isActive,
  locale,
}: {
  item: MenuItem;
  isActive: boolean;
  locale?: string;
}) {
  const [hovered, setHovered] = useState(false);
  const [hoveredChild, setHoveredChild] = useState<string | null>(null);
  const { data } = useCategories();
  const allCategories = data?.data ?? [];

  // Build resolved children list
  const children = item.children ?? [];

  // Resolve category item: get DB category data for type='category' children
  const resolveCategory = (child: MenuItem): Category | undefined => {
    if (child.type === 'category' && child.categoryId) {
      return allCategories.find((c) => c.id === child.categoryId);
    }
    return undefined;
  };

  // Resolve the display label for a child item
  const childLabel = (child: MenuItem) => {
    if (child.type === 'category' && child.categoryId) {
      const cat = allCategories.find((c) => c.id === child.categoryId);
      if (cat) return locale === 'bn' ? cat.name : cat.name; // categories don't have nameBn in this schema
    }
    if (locale === 'bn' && child.labelBn) return child.labelBn;
    return child.label;
  };

  // Resolve the href for a child item
  const childHref = (child: MenuItem) => {
    if (child.type === 'category' && child.categoryId) {
      const cat = allCategories.find((c) => c.id === child.categoryId);
      return cat ? `/products?category=${cat.slug}` : '#';
    }
    return child.href || '#';
  };

  // Resolve the image for a child item
  const childImage = (child: MenuItem): string | null => {
    if (child.type === 'category' && child.categoryId) {
      const cat = allCategories.find((c) => c.id === child.categoryId);
      return cat?.image ?? null;
    }
    return null;
  };

  // If no children, render a simple link
  if (children.length === 0) {
    const href =
      item.type === 'category' && item.categoryId
        ? allCategories.find((c) => c.id === item.categoryId)?.slug
          ? `/products?category=${allCategories.find((c) => c.id === item.categoryId)!.slug}`
          : '#'
        : item.href || '#';
    const LinkIcon = ICON_MAP[item.icon ?? ''];

    return (
      <Link
        href={href}
        target={item.openInNewTab ? '_blank' : undefined}
        className={cn(
          'flex items-center gap-1 rounded-full px-4 py-1 text-sm font-medium transition-all duration-200',
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
        )}
      >
        {LinkIcon && <LinkIcon className="h-4 w-4" />}
        {locale === 'bn' && item.labelBn ? item.labelBn : item.label}
      </Link>
    );
  }

  // Has children: render trigger + dropdown
  const displayLabel = locale === 'bn' && item.labelBn ? item.labelBn : item.label;
  const TriggerIcon = ICON_MAP[item.icon ?? ''];

  // Find which child is being hovered for sub-children display
  const activeChild = hoveredChild ? children.find((c) => c.id === hoveredChild) : null;
  const activeChildChildren = activeChild?.children ?? [];
  const activeChildCategory = activeChild ? resolveCategory(activeChild) : null;

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setHoveredChild(null);
      }}
    >
      {/* Trigger */}
      <button
        className={cn(
          'flex items-center gap-1 rounded-full px-4 py-1 text-sm font-medium transition-all duration-200',
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
        )}
      >
        {TriggerIcon && <TriggerIcon className="h-4 w-4" />}
        {displayLabel}
        <ChevronDown
          className={cn('h-3 w-3 transition-transform duration-200', hovered && 'rotate-180')}
        />
      </button>

      {/* Dropdown panel */}
      <div
        className={cn(
          'border-border bg-card absolute left-0 top-full z-50 mt-1 min-w-[220px] rounded-xl border shadow-xl transition-all duration-200',
          hovered ? 'visible opacity-100' : 'invisible opacity-0'
        )}
      >
        <div className="flex max-h-[400px] min-h-[200px]">
          {/* Left: child items list */}
          <div className="border-border min-w-[200px] overflow-y-auto border-r p-2">
            {children.map((child) => {
              const label = childLabel(child);
              const href = childHref(child);
              const image = childImage(child);
              const hasSubChildren = (child.children?.length ?? 0) > 0 || child.type === 'category';
              const isHovered = hoveredChild === child.id;
              const ChildIcon = ICON_MAP[child.icon ?? ''];

              if (hasSubChildren) {
                return (
                  <div
                    key={child.id}
                    className={cn(
                      'group flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors',
                      isHovered ? 'bg-accent text-foreground' : 'text-foreground hover:bg-accent/50'
                    )}
                    onMouseEnter={() => setHoveredChild(child.id)}
                  >
                    {image ? (
                      <div className="bg-muted relative h-7 w-7 shrink-0 overflow-hidden rounded-md">
                        <Image src={image} alt={label} fill sizes="28px" className="object-cover" />
                      </div>
                    ) : ChildIcon ? (
                      <span className="bg-primary/10 text-primary flex h-7 w-7 shrink-0 items-center justify-center rounded-md">
                        <ChildIcon className="h-4 w-4" />
                      </span>
                    ) : (
                      <span className="bg-primary/10 text-primary flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[10px] font-bold">
                        {label.charAt(0)}
                      </span>
                    )}
                    <span className="flex-1 truncate text-sm">{label}</span>
                    <ChevronDown className="text-muted-foreground/50 h-3 w-3 -rotate-90" />
                  </div>
                );
              }

              const LinkIcon = ICON_MAP[child.icon ?? ''];
              return (
                <Link
                  key={child.id}
                  href={href}
                  target={child.openInNewTab ? '_blank' : undefined}
                  className="text-foreground hover:bg-accent/50 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors"
                >
                  {image ? (
                    <div className="bg-muted relative h-7 w-7 shrink-0 overflow-hidden rounded-md">
                      <Image src={image} alt={label} fill sizes="28px" className="object-cover" />
                    </div>
                  ) : LinkIcon ? (
                    <span className="bg-primary/10 text-primary flex h-7 w-7 shrink-0 items-center justify-center rounded-md">
                      <LinkIcon className="h-4 w-4" />
                    </span>
                  ) : (
                    <span className="bg-primary/10 text-primary flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[10px] font-bold">
                      {label.charAt(0)}
                    </span>
                  )}
                  <span className="truncate text-sm">{label}</span>
                </Link>
              );
            })}
          </div>

          {/* Right: sub-children panel */}
          {activeChild && (activeChildChildren.length > 0 || activeChildCategory) && (
            <div className="min-w-[180px] overflow-y-auto p-3">
              <p className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wider">
                {childLabel(activeChild)}
              </p>
              <div className="space-y-0.5">
                {/* If it's a category with children from DB, show subcategories */}
                {activeChildCategory && activeChildCategory.image && (
                  <div className="bg-muted relative mb-2 aspect-[16/9] w-full overflow-hidden rounded-lg">
                    <Image
                      src={activeChildCategory.image}
                      alt={childLabel(activeChild)}
                      fill
                      sizes="200px"
                      className="object-cover"
                    />
                  </div>
                )}

                {/* Render explicit children */}
                {activeChildChildren.map((subChild) => {
                  const subLabel =
                    locale === 'bn' && subChild.labelBn ? subChild.labelBn : subChild.label;
                  const subHref =
                    subChild.type === 'category' && subChild.categoryId
                      ? allCategories.find((c) => c.id === subChild.categoryId)?.slug
                        ? `/products?category=${allCategories.find((c) => c.id === subChild.categoryId)!.slug}`
                        : '#'
                      : subChild.href || '#';

                  return (
                    <Link
                      key={subChild.id}
                      href={subHref}
                      target={subChild.openInNewTab ? '_blank' : undefined}
                      className="text-foreground hover:bg-accent/50 hover:text-primary block rounded-md px-2.5 py-1.5 text-sm transition-colors"
                    >
                      {subLabel}
                    </Link>
                  );
                })}

                {/* "View All" link for category items */}
                {activeChildCategory && (
                  <Link
                    href={`/products?category=${activeChildCategory.slug}`}
                    className="text-primary mt-2 block rounded-md px-2.5 py-1.5 text-sm font-medium hover:underline"
                  >
                    View All {childLabel(activeChild)} →
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
