'use client';

import { ArrowRight, Loader2, Package, Search, TrendingUp, X } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useRef } from 'react';

import { trackSearch } from '@/lib/tracking';
import { formatPrice } from '@/lib/utils';

type SearchResult = {
  id: string;
  slug: string;
  name: string;
  price: number;
  image: string;
};

export function SearchCommand() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [open]);

  // Debounced search
  const search = useCallback(async (q: string) => {
    if (!q.trim() || q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    setSelectedIndex(0);
    try {
      const res = await fetch(`/api/products?search=${encodeURIComponent(q)}&limit=8`);
      const data = await res.json();
      setResults(data.data ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 200);
    return () => clearTimeout(timer);
  }, [query, search]);

  const handleSelect = (slug: string) => {
    setOpen(false);
    router.push(`/products/${slug}`);
  };

  const handleSearchAll = () => {
    setOpen(false);
    trackSearch(query);
    router.push(`/products?q=${encodeURIComponent(query)}`);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex === results.length) {
        handleSearchAll();
      } else if (results[selectedIndex]) {
        handleSelect(results[selectedIndex].slug);
      }
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Search products"
        className="border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-1.5 rounded-full border px-2 py-1.5 text-xs transition-all md:gap-2 md:px-3"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden md:inline">Search products...</span>
        <kbd className="bg-muted text-muted-foreground pointer-events-none hidden h-4 items-center gap-0.5 rounded border px-1 font-mono text-[9px] font-medium lg:flex">
          ⌘K
        </kbd>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] sm:pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Dialog */}
      <div className="animate-slide-up relative mx-4 w-full max-w-2xl">
        <div className="bg-background/95 overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/20 backdrop-blur-2xl dark:border-white/5">
          {/* Search Input */}
          <div className="border-border flex items-center gap-3 border-b px-5 py-4">
            <Search className="text-muted-foreground h-5 w-5 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search products, categories, brands..."
              className="text-foreground placeholder:text-muted-foreground flex-1 bg-transparent text-base outline-none"
              autoComplete="off"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="bg-muted text-muted-foreground hover:bg-muted-foreground/20 flex h-6 w-6 items-center justify-center rounded-full"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <kbd className="border-border text-muted-foreground hidden h-6 items-center rounded-md border px-1.5 font-mono text-[10px] sm:flex">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-[420px] overflow-y-auto px-2 py-2">
            {loading && (
              <div className="text-muted-foreground flex items-center justify-center gap-2 py-10 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching...
              </div>
            )}

            {!loading && query.length >= 2 && results.length === 0 && (
              <div className="flex flex-col items-center py-10 text-center">
                <Package className="text-muted-foreground/30 h-10 w-10" />
                <p className="text-foreground mt-3 text-sm font-medium">No products found</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  No results for &ldquo;{query}&rdquo;
                </p>
              </div>
            )}

            {!loading && results.length > 0 && (
              <div className="space-y-0.5">
                <p className="text-muted-foreground px-3 py-1.5 text-xs font-medium">Products</p>
                {results.map((product, i) => (
                  <button
                    key={product.id}
                    onClick={() => handleSelect(product.slug)}
                    onMouseEnter={() => setSelectedIndex(i)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                      selectedIndex === i
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    <div className="bg-muted relative h-10 w-10 shrink-0 overflow-hidden rounded-lg">
                      <Image src={product.image} alt={product.name} fill className="object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{product.name}</p>
                      <p className="text-muted-foreground text-xs">{formatPrice(product.price)}</p>
                    </div>
                    <span className="text-muted-foreground text-xs opacity-0 group-hover:opacity-100">
                      ↵
                    </span>
                  </button>
                ))}
              </div>
            )}

            {!loading && query.length >= 2 && results.length > 0 && (
              <button
                onClick={handleSearchAll}
                onMouseEnter={() => setSelectedIndex(results.length)}
                className={`mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                  selectedIndex === results.length
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <TrendingUp className="h-4 w-4 shrink-0" />
                <span className="text-sm font-medium">
                  See all results for &ldquo;{query}&rdquo;
                </span>
                <ArrowRight className="ml-auto h-4 w-4" />
              </button>
            )}

            {!loading && query.length === 0 && (
              <div className="flex flex-col items-center py-10 text-center">
                <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-xl">
                  <Search className="text-primary h-6 w-6" />
                </div>
                <p className="text-foreground mt-3 text-sm font-medium">Search products</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Start typing to search across {results.length > 0 ? 'products' : 'our catalog'}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-border flex items-center justify-between border-t px-5 py-3">
            <div className="text-muted-foreground flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1">
                <kbd className="border-border rounded border px-1 py-0.5 font-mono text-[10px]">
                  ↑
                </kbd>
                <kbd className="border-border rounded border px-1 py-0.5 font-mono text-[10px]">
                  ↓
                </kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="border-border rounded border px-1 py-0.5 font-mono text-[10px]">
                  ↵
                </kbd>
                Select
              </span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground text-xs transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
