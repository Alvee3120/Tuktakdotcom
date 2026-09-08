'use client';

import {
  Shield,
  Plus,
  Search,
  Edit3,
  Trash2,
  X,
  Eye,
  EyeOff,
  Check,
  Ban,
  ShieldCheck,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Pagination } from '@/components/dashboard/Pagination';
import { StatCard } from '@/components/dashboard/StatCard';
import {
  useModerators,
  useModeratorPages,
  useCreateModerator,
  useUpdateModerator,
  useDeleteModerator,
  type Moderator,
  type ModeratorPage,
} from '@/hooks/useAdmin';

export default function ModeratorsPage() {
  const tc = useTranslations('admin.common');
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedModerator, setSelectedModerator] = useState<Moderator | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    permissions: [] as string[],
  });

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, refetch } = useModerators({
    page: currentPage,
    search: debouncedSearch,
  });
  const { data: pagesData } = useModeratorPages();
  const createModerator = useCreateModerator();
  const updateModerator = useUpdateModerator();
  const deleteModerator = useDeleteModerator();

  const moderators = data?.data ?? [];
  const meta = data?.meta;
  const availablePages = pagesData?.data ?? [];

  // Group pages by section
  const pagesBySection = availablePages.reduce(
    (acc, page) => {
      if (!acc[page.section]) acc[page.section] = [];
      acc[page.section].push(page);
      return acc;
    },
    {} as Record<string, ModeratorPage[]>
  );

  const handleCreate = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      await createModerator.mutateAsync(formData);
      toast.success('Moderator created successfully');
      setCreateDialogOpen(false);
      resetForm();
      refetch();
    } catch (err: unknown) {
      const error = err as { error?: string };
      toast.error(error?.error || 'Failed to create moderator');
    }
  };

  const handleEdit = async () => {
    if (!selectedModerator) return;
    try {
      await updateModerator.mutateAsync({
        id: selectedModerator.id,
        data: {
          name: formData.name,
          permissions: formData.permissions,
        },
      });
      toast.success('Moderator updated successfully');
      setEditDialogOpen(false);
      resetForm();
      refetch();
    } catch (err: unknown) {
      const error = err as { error?: string };
      toast.error(error?.error || 'Failed to update moderator');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this moderator?')) return;
    try {
      await deleteModerator.mutateAsync(id);
      toast.success('Moderator deleted');
      refetch();
    } catch {
      toast.error('Failed to delete moderator');
    }
  };

  const handleBanToggle = async (moderator: Moderator) => {
    try {
      await updateModerator.mutateAsync({
        id: moderator.id,
        data: { banned: !moderator.banned },
      });
      toast.success(moderator.banned ? 'Moderator unbanned' : 'Moderator banned');
      refetch();
    } catch {
      toast.error('Failed to update moderator');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', password: '', permissions: [] });
    setShowPassword(false);
  };

  const openEditDialog = (moderator: Moderator) => {
    setSelectedModerator(moderator);
    let parsedPermissions: string[] = [];
    try {
      parsedPermissions = moderator.permissions ? JSON.parse(moderator.permissions) : [];
    } catch {
      parsedPermissions = [];
    }
    setFormData({
      name: moderator.name,
      email: moderator.email,
      password: '',
      permissions: Array.isArray(parsedPermissions) ? parsedPermissions : [],
    });
    setEditDialogOpen(true);
  };

  const togglePermission = (pageKey: string) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(pageKey)
        ? prev.permissions.filter((p) => p !== pageKey)
        : [...prev.permissions, pageKey],
    }));
  };

  const selectAllPermissions = () => {
    setFormData((prev) => ({
      ...prev,
      permissions: availablePages.map((p) => p.key),
    }));
  };

  const clearAllPermissions = () => {
    setFormData((prev) => ({ ...prev, permissions: [] }));
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Moderators"
          value={meta?.total?.toLocaleString() ?? '0'}
          percentageLabel="all time"
        />
        <StatCard
          title="Active"
          value={String(moderators.filter((m) => !m.banned).length)}
          percentageLabel="this page"
        />
        <StatCard
          title="Banned"
          value={String(moderators.filter((m) => m.banned).length)}
          percentageLabel="suspended"
        />
        <StatCard
          title="Available Pages"
          value={String(availablePages.length)}
          percentageLabel="accessible"
        />
      </div>

      {/* Header + Search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-foreground text-base font-semibold">Moderator Management</h3>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="text-muted-foreground/70 absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search moderators..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-border bg-card placeholder:text-muted-foreground/70 rounded-lg border py-2 pl-9 pr-4 text-sm focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-300"
            />
          </div>
          <button
            onClick={() => {
              resetForm();
              setCreateDialogOpen(true);
            }}
            className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
          >
            <Plus className="h-4 w-4" />
            Add Moderator
          </button>
        </div>
      </div>

      {/* Moderators Table */}
      <div className="border-border bg-card overflow-hidden rounded-xl border shadow-sm">
        {isLoading ? (
          <div className="space-y-3 p-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-muted/50 h-14 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="bg-emerald-50 dark:bg-emerald-950/30">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    Moderator
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    Access Pages
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-border/60 divide-y">
                {moderators.map((mod) => {
                  let permissions: string[] = [];
                  try {
                    permissions = mod.permissions ? JSON.parse(mod.permissions) : [];
                  } catch {
                    permissions = [];
                  }
                  if (!Array.isArray(permissions)) permissions = [];
                  return (
                    <tr key={mod.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                            {mod.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <span className="text-foreground text-sm font-medium">
                            {mod.name || 'Unknown'}
                          </span>
                        </div>
                      </td>
                      <td className="text-muted-foreground px-4 py-3 text-sm">{mod.email}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {permissions.length > 0 ? (
                            permissions.slice(0, 3).map((p) => (
                              <span
                                key={p}
                                className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium capitalize text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                              >
                                {p}
                              </span>
                            ))
                          ) : (
                            <span className="text-muted-foreground/70 text-xs">No access</span>
                          )}
                          {permissions.length > 3 && (
                            <span className="bg-muted text-muted-foreground inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium">
                              +{permissions.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {mod.banned ? (
                          <span className="flex items-center gap-1.5 text-xs font-medium text-red-500">
                            <span className="h-2 w-2 rounded-full bg-red-500" /> Banned
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Active
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditDialog(mod)}
                            className="text-muted-foreground/70 rounded-lg p-1.5 hover:bg-emerald-50 hover:text-emerald-600 hover:dark:bg-emerald-950/30 hover:dark:text-emerald-400"
                            title="Edit permissions"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleBanToggle(mod)}
                            className="text-muted-foreground/70 rounded-lg p-1.5 hover:bg-red-50 hover:text-red-500 hover:dark:bg-red-950/30"
                            title={mod.banned ? 'Unban' : 'Ban'}
                          >
                            {mod.banned ? (
                              <ShieldCheck className="h-4 w-4" />
                            ) : (
                              <Ban className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(mod.id)}
                            className="text-muted-foreground/70 rounded-lg p-1.5 hover:bg-red-50 hover:text-red-500 hover:dark:bg-red-950/30"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {moderators.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Shield className="text-muted-foreground/30 h-12 w-12" />
                <p className="text-muted-foreground mt-3 text-sm font-medium">
                  No moderators found
                </p>
                <p className="text-muted-foreground/70 text-xs">
                  Create your first moderator to get started
                </p>
              </div>
            )}
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

      {/* Create Moderator Dialog */}
      {createDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setCreateDialogOpen(false)}
          />
          <div className="bg-card animate-in fade-in zoom-in-95 relative max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-emerald-500" />
                <h3 className="text-foreground text-lg font-semibold">Create Moderator</h3>
              </div>
              <button
                onClick={() => setCreateDialogOpen(false)}
                className="text-muted-foreground/70 hover:bg-muted rounded-full p-1.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-foreground text-sm font-medium">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="border-border bg-background w-full rounded-lg border px-3 py-2 text-sm focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-300"
                  placeholder="Enter name"
                />
              </div>

              <div className="space-y-1">
                <label className="text-foreground text-sm font-medium">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="border-border bg-background w-full rounded-lg border px-3 py-2 text-sm focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-300"
                  placeholder="Enter email"
                />
              </div>

              <div className="space-y-1">
                <label className="text-foreground text-sm font-medium">Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="border-border bg-background w-full rounded-lg border px-3 py-2 pr-10 text-sm focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-300"
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-muted-foreground/70 hover:text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Permissions */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-foreground text-sm font-medium">
                    Page Access Permissions
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAllPermissions}
                      className="text-xs text-emerald-500 hover:text-emerald-600"
                    >
                      Select All
                    </button>
                    <span className="text-muted-foreground/50">|</span>
                    <button
                      onClick={clearAllPermissions}
                      className="text-muted-foreground hover:text-foreground text-xs"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
                <p className="text-muted-foreground/70 text-xs">
                  Select which pages this moderator can access
                </p>

                <div className="border-border max-h-48 space-y-3 overflow-y-auto rounded-lg border p-3">
                  {Object.entries(pagesBySection).map(([section, pages]) => (
                    <div key={section}>
                      <p className="text-muted-foreground/70 mb-2 text-[10px] font-semibold uppercase capitalize tracking-wider">
                        {section}
                      </p>
                      <div className="space-y-1">
                        {pages.map((page) => (
                          <label
                            key={page.key}
                            className="hover:bg-muted/50 flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5"
                          >
                            <input
                              type="checkbox"
                              checked={formData.permissions.includes(page.key)}
                              onChange={() => togglePermission(page.key)}
                              className="border-border h-4 w-4 rounded accent-emerald-500"
                            />
                            <span className="text-foreground text-sm">{page.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleCreate}
                disabled={createModerator.isPending}
                className="flex-1 rounded-lg bg-emerald-500 py-2.5 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
              >
                {createModerator.isPending ? 'Creating...' : 'Create Moderator'}
              </button>
              <button
                onClick={() => setCreateDialogOpen(false)}
                className="border-border text-foreground hover:bg-muted/50 flex-1 rounded-lg border py-2.5 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Moderator Dialog */}
      {editDialogOpen && selectedModerator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditDialogOpen(false)} />
          <div className="bg-card animate-in fade-in zoom-in-95 relative max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Edit3 className="h-5 w-5 text-blue-500" />
                <div>
                  <h3 className="text-foreground text-lg font-semibold">Edit Moderator</h3>
                  <p className="text-muted-foreground text-sm">{selectedModerator.email}</p>
                </div>
              </div>
              <button
                onClick={() => setEditDialogOpen(false)}
                className="text-muted-foreground/70 hover:bg-muted rounded-full p-1.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-foreground text-sm font-medium">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="border-border bg-background w-full rounded-lg border px-3 py-2 text-sm focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-300"
                />
              </div>

              {/* Permissions */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-foreground text-sm font-medium">
                    Page Access Permissions
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAllPermissions}
                      className="text-xs text-emerald-500 hover:text-emerald-600"
                    >
                      Select All
                    </button>
                    <span className="text-muted-foreground/50">|</span>
                    <button
                      onClick={clearAllPermissions}
                      className="text-muted-foreground hover:text-foreground text-xs"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="border-border max-h-64 space-y-3 overflow-y-auto rounded-lg border p-3">
                  {Object.entries(pagesBySection).map(([section, pages]) => (
                    <div key={section}>
                      <p className="text-muted-foreground/70 mb-2 text-[10px] font-semibold uppercase capitalize tracking-wider">
                        {section}
                      </p>
                      <div className="space-y-1">
                        {pages.map((page) => (
                          <label
                            key={page.key}
                            className="hover:bg-muted/50 flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5"
                          >
                            <input
                              type="checkbox"
                              checked={formData.permissions.includes(page.key)}
                              onChange={() => togglePermission(page.key)}
                              className="border-border h-4 w-4 rounded accent-emerald-500"
                            />
                            <span className="text-foreground text-sm">{page.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleEdit}
                disabled={updateModerator.isPending}
                className="flex-1 rounded-lg bg-blue-500 py-2.5 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
              >
                {updateModerator.isPending ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => setEditDialogOpen(false)}
                className="border-border text-foreground hover:bg-muted/50 flex-1 rounded-lg border py-2.5 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
