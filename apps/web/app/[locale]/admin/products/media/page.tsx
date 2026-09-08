'use client';

import { Search, Image as ImageIcon, ExternalLink, Copy } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { toast } from 'sonner';

import { Pagination } from '@/components/dashboard/Pagination';
import { useAdminProducts } from '@/hooks/useAdmin';

export default function ProductMediaPage() {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const { data, isLoading } = useAdminProducts({ page: currentPage, search: search || undefined });
  const products = data?.data ?? [];
  const meta = data?.meta;

  // Get all products that have images
  const mediaItems = products.filter((p) => p.image);

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('URL copied');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-foreground text-xl font-semibold">Product Media</h2>
          <p className="text-muted-foreground/70 mt-0.5 text-xs">
            {meta?.total ?? 0} products with images
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="text-muted-foreground/70 absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search by product name..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          className="border-border bg-card placeholder:text-muted-foreground/70 w-full rounded-lg border py-2 pl-9 pr-4 text-sm focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-300"
        />
      </div>

      {/* Media Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="border-border bg-card h-48 animate-pulse rounded-xl border" />
          ))}
        </div>
      ) : mediaItems.length === 0 ? (
        <div className="border-border bg-card flex flex-col items-center rounded-xl border border-dashed py-16">
          <ImageIcon className="text-muted-foreground/40 h-10 w-10" />
          <p className="text-muted-foreground mt-3 text-sm font-medium">No product media found</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {mediaItems.map((product) => (
            <div
              key={product.id}
              className="border-border bg-card group overflow-hidden rounded-xl border shadow-sm transition-all hover:shadow-md"
            >
              <div className="bg-muted/50 relative h-40">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover"
                />
                {/* Overlay actions */}
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 opacity-0 transition-colors group-hover:bg-black/30 group-hover:opacity-100">
                  <button
                    onClick={() => copyUrl(product.image)}
                    className="bg-card/90 text-foreground hover:bg-card rounded-full p-2"
                    title="Copy URL"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <a
                    href={product.image}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-card/90 text-foreground hover:bg-card rounded-full p-2"
                    title="Open in new tab"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
              <div className="p-3">
                <p className="text-foreground truncate text-sm font-medium">{product.name}</p>
                <p className="text-muted-foreground/70 mt-0.5 truncate text-[10px]">
                  {product.image}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="border-border bg-card rounded-xl border px-4 shadow-sm">
          <Pagination
            currentPage={currentPage}
            totalPages={meta.totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
}
