'use client';

import { Plus, Search, MoreVertical, Edit3, Trash2, Eye, EyeOff, X, Star } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { toast } from 'sonner';

import { SingleImageUploader } from '@/components/dashboard/ImageUploader';
import { Pagination } from '@/components/dashboard/Pagination';
import { StatCard } from '@/components/dashboard/StatCard';
import {
  useAdminBrandsPaginated,
  useCreateBrand,
  useUpdateBrand,
  useDeleteBrand,
} from '@/hooks/useAdmin';

type FormState = { name: string; slug: string; logo: string; isActive: boolean };
const emptyForm: FormState = { name: '', slug: '', logo: '', isActive: true };

export default function AdminBrandsPage() {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const { data, isLoading } = useAdminBrandsPaginated();
  const createBrand = useCreateBrand();
  const updateBrand = useUpdateBrand();
  const deleteBrand = useDeleteBrand();
  const brands = data?.data ?? [];

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };
  const openEdit = (brand: (typeof brands)[0]) => {
    setEditingId(brand.id);
    setForm({
      name: brand.name,
      slug: brand.slug,
      logo: brand.logo ?? '',
      isActive: brand.isActive,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.slug) return;
    try {
      if (editingId) {
        await updateBrand.mutateAsync({ id: editingId, data: form });
        toast.success('Brand updated');
      } else {
        await createBrand.mutateAsync(form);
        toast.success('Brand created');
      }
      setDialogOpen(false);
    } catch {
      toast.error('Failed to save');
    }
  };

  const toggleActive = async (brand: (typeof brands)[0]) => {
    await updateBrand.mutateAsync({ id: brand.id, data: { isActive: !brand.isActive } });
    toast.success(brand.isActive ? 'Brand deactivated' : 'Brand activated');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this brand?')) return;
    await deleteBrand.mutateAsync(id);
    toast.success('Brand deleted');
  };

  const filtered = search
    ? brands.filter((b) => b.name.toLowerCase().includes(search.toLowerCase()))
    : brands;

  const perPage = 10;
  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const activeBrands = brands.filter((b) => b.isActive).length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Total Brands" value={String(brands.length)} percentage={0} />
        <StatCard
          title="Active Brands"
          value={String(activeBrands)}
          percentage={brands.length > 0 ? Math.round((activeBrands / brands.length) * 100) : 0}
        />
        <StatCard
          title="Inactive Brands"
          value={String(brands.length - activeBrands)}
          percentageLabel={`${brands.length - activeBrands} hidden`}
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative">
          <Search className="text-muted-foreground/70 absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search brands..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="border-border bg-card placeholder:text-muted-foreground/70 rounded-lg border py-2 pl-9 pr-4 text-sm focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-300"
          />
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-600"
        >
          <Plus className="h-4 w-4" /> Add Brand
        </button>
      </div>

      {/* Brand grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="border-border bg-card h-40 animate-pulse rounded-xl border" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="border-border bg-card flex flex-col items-center rounded-xl border border-dashed py-16">
          <Star className="text-muted-foreground/40 h-10 w-10" />
          <p className="text-muted-foreground mt-3 text-sm font-medium">No brands found</p>
          <button
            onClick={openNew}
            className="mt-3 text-sm text-emerald-600 hover:underline dark:text-emerald-400"
          >
            Create your first brand
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {paginated.map((brand) => (
            <div
              key={brand.id}
              className={`bg-card relative rounded-xl border p-4 shadow-sm transition-all hover:shadow-md ${brand.isActive ? 'border-border' : 'border-border border-dashed opacity-60'}`}
            >
              <div className="mb-3 flex items-center justify-between">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${brand.isActive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${brand.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`}
                  />
                  {brand.isActive ? 'Active' : 'Inactive'}
                </span>
                <button className="text-muted-foreground/70 hover:text-muted-foreground">
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>

              {/* Logo / Name */}
              <div className="mb-3 flex h-16 items-center justify-center">
                {brand.logo ? (
                  <div className="relative h-12 w-24">
                    <Image
                      src={brand.logo}
                      alt={brand.name}
                      fill
                      sizes="96px"
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <span className="text-foreground text-lg font-bold">{brand.name}</span>
                )}
              </div>

              <div className="mb-3 text-center">
                <p className="text-foreground text-sm font-medium">{brand.name}</p>
                <p className="text-muted-foreground/70 text-[11px]">/{brand.slug}</p>
              </div>

              {/* Actions */}
              <div className="border-border/60 flex items-center justify-center gap-1 border-t pt-3">
                <button
                  onClick={() => toggleActive(brand)}
                  className="text-muted-foreground/70 hover:bg-muted hover:text-muted-foreground rounded-lg p-2"
                  title={brand.isActive ? 'Deactivate' : 'Activate'}
                >
                  {brand.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => openEdit(brand)}
                  className="text-muted-foreground/70 rounded-lg p-2 hover:bg-emerald-50 hover:text-emerald-600 hover:dark:bg-emerald-950/30 hover:dark:text-emerald-400"
                  title="Edit"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(brand.id)}
                  className="text-muted-foreground/70 rounded-lg p-2 hover:bg-red-50 hover:text-red-500 hover:dark:bg-red-950/30"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="border-border bg-card rounded-xl border px-4 shadow-sm">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* Create/Edit Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDialogOpen(false)} />
          <div className="bg-card animate-in fade-in zoom-in-95 relative w-full max-w-md rounded-2xl p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-foreground text-lg font-semibold">
                {editingId ? 'Edit Brand' : 'New Brand'}
              </h3>
              <button
                onClick={() => setDialogOpen(false)}
                className="text-muted-foreground/70 hover:bg-muted rounded-full p-1.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-foreground mb-1.5 block text-sm font-medium">
                  Brand Name
                </label>
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name: e.target.value,
                      slug: editingId
                        ? form.slug
                        : e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, '-')
                            .replace(/^-|-$/g, ''),
                    })
                  }
                  placeholder="e.g. Samsung"
                  className="border-border w-full rounded-lg border px-4 py-2.5 text-sm focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-300"
                />
              </div>
              <div>
                <label className="text-foreground mb-1.5 block text-sm font-medium">Slug</label>
                <input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="samsung"
                  className="border-border w-full rounded-lg border px-4 py-2.5 font-mono text-sm focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-300"
                />
              </div>
              <SingleImageUploader
                value={form.logo}
                onChange={(url) => setForm({ ...form, logo: url })}
                label="Brand Logo (optional)"
                heightClass="h-40"
              />
              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="border-border rounded text-emerald-500 focus:ring-emerald-300"
                />
                <span className="text-foreground text-sm">Active (visible on store)</span>
              </label>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={() => setDialogOpen(false)}
                className="border-border text-foreground hover:bg-muted/50 flex-1 rounded-lg border py-2.5 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={
                  createBrand.isPending || updateBrand.isPending || !form.name || !form.slug
                }
                className="flex-1 rounded-lg bg-emerald-500 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {createBrand.isPending || updateBrand.isPending
                  ? 'Saving...'
                  : editingId
                    ? 'Update Brand'
                    : 'Create Brand'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
