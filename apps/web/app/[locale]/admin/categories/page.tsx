'use client';

import { Plus, Search, Edit3, Trash2, Eye, EyeOff, X, FolderTree } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';

import { SingleImageUploader } from '@/components/dashboard/ImageUploader';
import { Pagination } from '@/components/dashboard/Pagination';
import { StatCard } from '@/components/dashboard/StatCard';
import { api } from '@/lib/api-client';

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type FormState = {
  name: string;
  slug: string;
  description: string;
  image: string;
  parentId: string;
  sortOrder: number;
  isActive: boolean;
};
const emptyForm: FormState = {
  name: '',
  slug: '',
  description: '',
  image: '',
  parentId: '',
  sortOrder: 0,
  isActive: true,
};

const slugify = (v: string) =>
  v
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: Category[] }>('/api/admin/categories');
      setCategories(res.data);
    } catch {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };
  const openEdit = (cat: Category) => {
    setEditingId(cat.id);
    setForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description ?? '',
      image: cat.image ?? '',
      parentId: cat.parentId ?? '',
      sortOrder: cat.sortOrder,
      isActive: cat.isActive,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.slug) return;
    setSaving(true);
    const payload = {
      name: form.name,
      slug: form.slug,
      description: form.description || undefined,
      image: form.image || undefined,
      parentId: form.parentId || undefined,
      sortOrder: form.sortOrder,
      isActive: form.isActive,
    };
    try {
      if (editingId) {
        await api.patch(`/api/admin/categories/${editingId}`, payload);
        toast.success('Category updated');
      } else {
        await api.post('/api/admin/categories', payload);
        toast.success('Category created');
      }
      setDialogOpen(false);
      fetchCategories();
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (cat: Category) => {
    try {
      await api.patch(`/api/admin/categories/${cat.id}`, { isActive: !cat.isActive });
      toast.success(cat.isActive ? 'Category hidden' : 'Category activated');
      fetchCategories();
    } catch {
      toast.error('Failed to update');
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Delete this category? Products in it will be uncategorised.')) return;
    try {
      await api.delete(`/api/admin/categories/${id}`);
      toast.success('Category deleted');
      fetchCategories();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const nameById = new Map(categories.map((c) => [c.id, c.name]));
  const filtered = search
    ? categories.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.slug.includes(search.toLowerCase())
      )
    : categories;

  const perPage = 12;
  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);
  const activeCount = categories.filter((c) => c.isActive).length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Total Categories" value={String(categories.length)} percentage={0} />
        <StatCard
          title="Active"
          value={String(activeCount)}
          percentage={
            categories.length > 0 ? Math.round((activeCount / categories.length) * 100) : 0
          }
        />
        <StatCard
          title="Hidden"
          value={String(categories.length - activeCount)}
          percentageLabel={`${categories.length - activeCount} hidden`}
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative">
          <Search className="text-muted-foreground/70 absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search categories..."
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
          <Plus className="h-4 w-4" /> Add Category
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="border-border bg-card h-14 animate-pulse rounded-xl border" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="border-border bg-card flex flex-col items-center rounded-xl border border-dashed py-16">
          <FolderTree className="text-muted-foreground/40 h-10 w-10" />
          <p className="text-muted-foreground mt-3 text-sm font-medium">No categories found</p>
          <button
            onClick={openNew}
            className="mt-3 text-sm text-emerald-600 hover:underline dark:text-emerald-400"
          >
            Create your first category
          </button>
        </div>
      ) : (
        <div className="border-border bg-card overflow-hidden rounded-xl border shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-emerald-50 dark:bg-emerald-950/30">
                <th className="px-4 py-3 text-left text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  Slug
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  Parent
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  Order
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-border/60 divide-y">
              {paginated.map((cat) => (
                <tr key={cat.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-muted relative h-9 w-9 shrink-0 overflow-hidden rounded-lg">
                        {cat.image && (
                          <Image
                            src={cat.image}
                            alt={cat.name}
                            fill
                            sizes="36px"
                            className="object-cover"
                          />
                        )}
                      </div>
                      <span className="text-foreground text-sm font-medium">{cat.name}</span>
                    </div>
                  </td>
                  <td className="text-muted-foreground px-4 py-3 font-mono text-xs">/{cat.slug}</td>
                  <td className="text-muted-foreground px-4 py-3 text-sm">
                    {cat.parentId ? (nameById.get(cat.parentId) ?? '—') : '—'}
                  </td>
                  <td className="text-foreground px-4 py-3 text-sm">{cat.sortOrder}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${cat.isActive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${cat.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`}
                      />
                      {cat.isActive ? 'Active' : 'Hidden'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => toggleActive(cat)}
                        className="text-muted-foreground/70 hover:bg-muted hover:text-muted-foreground rounded-lg p-1.5"
                        title={cat.isActive ? 'Hide' : 'Activate'}
                      >
                        {cat.isActive ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => openEdit(cat)}
                        className="text-muted-foreground/70 rounded-lg p-1.5 hover:bg-emerald-50 hover:text-emerald-600 hover:dark:bg-emerald-950/30 hover:dark:text-emerald-400"
                        title="Edit"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteCategory(cat.id)}
                        className="text-muted-foreground/70 rounded-lg p-1.5 hover:bg-red-50 hover:text-red-500 hover:dark:bg-red-950/30"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="border-border border-t px-4">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDialogOpen(false)} />
          <div className="bg-card animate-in fade-in zoom-in-95 relative w-full max-w-md rounded-2xl p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-foreground text-lg font-semibold">
                {editingId ? 'Edit Category' : 'New Category'}
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
                <label className="text-foreground mb-1.5 block text-sm font-medium">Name</label>
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name: e.target.value,
                      slug: editingId ? form.slug : slugify(e.target.value),
                    })
                  }
                  placeholder="e.g. Smartphones"
                  className="border-border w-full rounded-lg border px-4 py-2.5 text-sm focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-300"
                />
              </div>
              <div>
                <label className="text-foreground mb-1.5 block text-sm font-medium">Slug</label>
                <input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="smartphones"
                  className="border-border w-full rounded-lg border px-4 py-2.5 font-mono text-sm focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-300"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-foreground mb-1.5 block text-sm font-medium">Parent</label>
                  <select
                    value={form.parentId}
                    onChange={(e) => setForm({ ...form, parentId: e.target.value })}
                    className="border-border bg-card w-full rounded-lg border px-3 py-2.5 text-sm focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-300"
                  >
                    <option value="">None (top-level)</option>
                    {categories
                      .filter((c) => c.id !== editingId)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="text-foreground mb-1.5 block text-sm font-medium">
                    Sort order
                  </label>
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) || 0 })}
                    className="border-border w-full rounded-lg border px-4 py-2.5 text-sm focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-300"
                  />
                </div>
              </div>
              <SingleImageUploader
                value={form.image}
                onChange={(url) => setForm({ ...form, image: url })}
                label="Category Image (optional)"
                heightClass="h-40"
              />
              <div>
                <label className="text-foreground mb-1.5 block text-sm font-medium">
                  Description (optional)
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="border-border w-full resize-none rounded-lg border px-4 py-2.5 text-sm focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-300"
                />
              </div>
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
                disabled={saving || !form.name || !form.slug}
                className="flex-1 rounded-lg bg-emerald-500 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingId ? 'Update Category' : 'Create Category'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
