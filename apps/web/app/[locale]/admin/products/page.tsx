'use client';

import { Edit3, Plus, Search, Trash2, Package, Star } from 'lucide-react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Pagination } from '@/components/dashboard/Pagination';
import { StatCard } from '@/components/dashboard/StatCard';
import { TabFilter } from '@/components/dashboard/TabFilter';
import { useAdminProducts, useAdminCategories, useDeleteProduct } from '@/hooks/useAdmin';
import { formatPrice } from '@/lib/utils';

const tabs = [
  { label: 'All Products', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Featured', value: 'featured' },
  { label: 'Low Stock', value: 'lowstock' },
];

export default function AdminProductsPage() {
  const tc = useTranslations('admin.common');
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get('search') ?? '';
  const urlCategory = searchParams.get('category') ?? '';
  const [search, setSearch] = useState(urlSearch);
  const [category, setCategory] = useState(urlCategory);
  const [activeTab, setActiveTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const { data: categoriesRes } = useAdminCategories();
  const categories = categoriesRes?.data ?? [];

  // Keep in sync with URL params
  useEffect(() => {
    setSearch(urlSearch);
    setCategory(urlCategory);
    setCurrentPage(1);
  }, [urlSearch, urlCategory]);

  const { data, isLoading, refetch } = useAdminProducts({
    page: currentPage,
    search: search || undefined,
    category: category || undefined,
  });
  const products = data?.data ?? [];
  const meta = data?.meta;
  const deleteProduct = useDeleteProduct();

  // Client-side filtering for tabs
  const filteredProducts = products.filter((p) => {
    if (activeTab === 'active') return p.isActive;
    if (activeTab === 'featured') return p.isFeatured;
    if (activeTab === 'lowstock') return p.stock < 10;
    return true;
  });

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deactivate "${name}"?`)) return;
    await deleteProduct.mutateAsync(id);
    toast.success('Product deactivated');
    refetch();
  };

  const totalActive = products.filter((p) => p.isActive).length;
  const totalFeatured = products.filter((p) => p.isFeatured).length;
  const lowStock = products.filter((p) => p.stock < 10).length;

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Products"
          value={meta?.total?.toLocaleString() ?? '0'}
          percentage={0}
        />
        <StatCard
          title="Active"
          value={String(totalActive)}
          percentage={meta?.total ? Math.round((totalActive / meta.total) * 100) : 0}
        />
        <StatCard title="Featured" value={String(totalFeatured)} percentageLabel="promoted" />
        <StatCard
          title="Low Stock"
          value={String(lowStock)}
          percentageLabel={lowStock > 0 ? 'needs restock' : 'all good'}
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabFilter
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(v) => {
            setActiveTab(v);
            setCurrentPage(1);
          }}
        />
        <div className="flex items-center gap-2">
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setCurrentPage(1);
            }}
            className="border-border bg-card placeholder:text-muted-foreground/70 rounded-lg border px-3 py-2 text-sm focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-300"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <div className="relative">
            <Search className="text-muted-foreground/70 absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`${tc('search')}...`}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="border-border bg-card placeholder:text-muted-foreground/70 rounded-lg border py-2 pl-9 pr-4 text-sm focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-300"
            />
          </div>
          <button
            onClick={() => router.push('/admin/products/add')}
            className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-600"
          >
            <Plus className="h-4 w-4" /> {tc('add')}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="border-border bg-card overflow-hidden rounded-xl border shadow-sm">
        {isLoading ? (
          <div className="space-y-3 p-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-muted/50 h-14 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <Package className="text-muted-foreground/40 h-10 w-10" />
            <p className="text-muted-foreground mt-3 text-sm font-medium">{tc('noData')}</p>
            {search && (
              <p className="text-muted-foreground/70 mt-1 text-xs">Try a different search term</p>
            )}
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="bg-emerald-50 dark:bg-emerald-950/30">
                  <th className="w-12 px-4 py-3 text-left">
                    <input type="checkbox" className="border-border h-4 w-4 rounded" />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    {tc('product')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    {tc('price')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    {tc('stock')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    {tc('status')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    {tc('action')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-border/60 divide-y">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3">
                      <input type="checkbox" className="border-border h-4 w-4 rounded" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="bg-muted border-border relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border">
                          {product.image ? (
                            <Image
                              src={product.image}
                              alt={product.name}
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          ) : (
                            <Package className="text-muted-foreground/40 m-2.5 h-5 w-5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-foreground truncate text-sm font-medium">
                            {product.name}
                          </p>
                          <p className="text-muted-foreground/70 truncate text-[11px]">
                            /{product.slug}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-foreground text-sm font-medium">
                        {formatPrice(product.price)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-sm font-medium ${product.stock < 10 ? 'text-red-500' : 'text-foreground'}`}
                      >
                        {product.stock}
                      </span>
                      {product.stock < 10 && <p className="text-[10px] text-red-400">Low stock</p>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            product.isActive
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${product.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`}
                          />
                          {product.isActive ? tc('active') : tc('inactive')}
                        </span>
                        {product.isFeatured && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:bg-amber-950/30 dark:text-amber-400">
                            <Star className="h-2.5 w-2.5" /> Featured
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => router.push(`/admin/products/${product.id}/edit`)}
                          className="text-muted-foreground/70 rounded-lg p-1.5 transition-colors hover:bg-emerald-50 hover:text-emerald-600 hover:dark:bg-emerald-950/30 hover:dark:text-emerald-400"
                          title="Edit (images, variants, pricing)"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id, product.name)}
                          className="text-muted-foreground/70 rounded-lg p-1.5 transition-colors hover:bg-red-50 hover:text-red-500 hover:dark:bg-red-950/30"
                          title="Deactivate"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {meta && meta.totalPages > 1 && (
              <div className="border-border border-t px-4">
                <Pagination
                  currentPage={currentPage}
                  totalPages={meta.totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
