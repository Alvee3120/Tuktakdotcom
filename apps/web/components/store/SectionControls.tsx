'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

/** Bottom-left pagination dots. Clickable when onSelect is provided. */
export function SectionDots({
  count,
  active,
  className,
  onSelect,
}: {
  count: number;
  active: number;
  className?: string;
  onSelect?: (i: number) => void;
}) {
  if (count <= 1) return null;

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          onClick={() => onSelect?.(i)}
          aria-label={`Go to page ${i + 1}`}
          className={cn(
            'h-1.5 rounded-full transition-all duration-300',
            i === active ? 'bg-primary w-6' : 'bg-border hover:bg-muted-foreground/40 w-1.5'
          )}
        />
      ))}
    </div>
  );
}

/**
 * Horizontal-scroll paging for a product strip. Prev/Next scroll the active
 * tab's products; at the end of a tab they cascade to the next/previous tab.
 */
export function useCarouselPaging({
  activeIdx,
  onChangeActive,
  tabCount,
}: {
  activeIdx: number;
  onChangeActive: (i: number) => void;
  tabCount: number;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(0);

  const sync = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const w = el.clientWidth || 1;
    const count = Math.max(0, Math.ceil((el.scrollWidth - el.clientWidth) / w));
    setPages(count);
    setPage(Math.min(count, Math.round(el.scrollLeft / w)));
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    el.scrollLeft = 0;
    sync();
  }, [activeIdx, sync]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onScroll = () => sync();
    el.addEventListener('scroll', onScroll, { passive: true });
    sync();
    window.addEventListener('resize', onScroll);
    const ro = new ResizeObserver(() => sync());
    ro.observe(el);
    const mo = new MutationObserver(() => sync());
    mo.observe(el, { childList: true, subtree: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      ro.disconnect();
      mo.disconnect();
    };
  }, [sync]);

  const next = useCallback(() => {
    const el = viewportRef.current;
    if (el && el.scrollLeft + el.clientWidth < el.scrollWidth - 1) {
      el.scrollBy({ left: el.clientWidth, behavior: 'smooth' });
      return;
    }
    if (tabCount > 0 && activeIdx < tabCount - 1) onChangeActive(activeIdx + 1);
  }, [activeIdx, onChangeActive, tabCount]);

  const prev = useCallback(() => {
    const el = viewportRef.current;
    if (el && el.scrollLeft > 1) {
      el.scrollBy({ left: -el.clientWidth, behavior: 'smooth' });
      return;
    }
    if (tabCount > 0 && activeIdx > 0) onChangeActive(activeIdx - 1);
  }, [activeIdx, onChangeActive, tabCount]);

  return { viewportRef, page, pages, next, prev };
}

/**
 * Grid-mode dots: one dot per product row, highlighting the row that crosses
 * the viewport band as the user scrolls.
 */
export function useRowHighlight(totalRows: number, onChangeRow?: (i: number) => void) {
  const [activeRow, setActiveRow] = useState(0);
  const rowEls = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    if (totalRows <= 1) {
      onChangeRow?.(0);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.row ?? 0);
            setActiveRow(idx);
            onChangeRow?.(idx);
          }
        }
      },
      { rootMargin: '-40% 0px -50% 0px', threshold: 0 }
    );
    for (const el of rowEls.current) {
      if (el) obs.observe(el);
    }
    return () => obs.disconnect();
  }, [totalRows, onChangeRow]);

  const setRowRef = useCallback(
    (i: number) => (el: HTMLElement | null) => {
      rowEls.current[i] = el;
    },
    []
  );

  return { activeRow, setRowRef };
}
