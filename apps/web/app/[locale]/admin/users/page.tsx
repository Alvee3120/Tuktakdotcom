'use client';

import { Search, Shield, ShieldBan, Users as UsersIcon, Filter } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { Skeleton } from '@/components/ui/skeleton';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { api } from '@/lib/api-client';
import { cn } from '@/lib/utils';

type AdminUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: 'admin' | 'moderator' | 'customer';
  banned: boolean;
  createdAt: string;
};

type UsersResponse = {
  success: boolean;
  data: AdminUser[];
  meta: { total: number; page: number; totalPages: number };
};

const ROLE_FILTERS = ['all', 'admin', 'moderator', 'customer'] as const;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [banningId, setBanningId] = useState<string | null>(null);

  const fetchUsers = useCallback(
    async (p: number) => {
      setLoading(true);
      try {
        const res = await api.get<UsersResponse>('/api/admin/users', {
          params: { page: p, role: roleFilter === 'all' ? undefined : roleFilter },
        });
        setUsers(res.data);
        setMeta(res.meta);
      } catch {
        toast.error('Failed to load users');
      } finally {
        setLoading(false);
      }
    },
    [roleFilter]
  );

  useEffect(() => {
    fetchUsers(1);
  }, [roleFilter, fetchUsers]);

  const handleBan = async (userId: string, currentlyBanned: boolean) => {
    setBanningId(userId);
    try {
      await api.patch(`/api/admin/users/${userId}/ban`, {});
      toast.success(currentlyBanned ? 'User unbanned' : 'User banned');
      fetchUsers(page);
    } catch {
      toast.error('Failed to update user');
    } finally {
      setBanningId(null);
    }
  };

  const filtered = search
    ? users.filter(
        (u) =>
          u.name.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase())
      )
    : users;

  const roleBadge = (role: string) => {
    const variants: Record<string, string> = {
      admin: 'bg-primary/10 text-primary border-primary/20',
      moderator: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      customer: 'bg-muted text-muted-foreground border-border',
    };
    return variants[role] ?? variants.customer;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-heading-xl font-bold">Users</h1>
        <p className="text-body-sm text-muted-foreground mt-0.5">{meta.total} registered users</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="text-muted-foreground h-4 w-4" />
          {ROLE_FILTERS.map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                roleFilter === r
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <UsersIcon className="text-muted-foreground/30 h-10 w-10" />
          <p className="text-muted-foreground mt-3 text-sm font-medium">No users found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((user) => (
            <div
              key={user.id}
              className={cn(
                'border-border bg-card flex items-center justify-between rounded-xl border p-4 transition-colors',
                user.banned && 'opacity-60'
              )}
            >
              <div className="flex items-center gap-4">
                <UserAvatar image={user.image} name={user.name} size="md" />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-foreground text-sm font-medium">{user.name}</p>
                    <span
                      className={cn(
                        'rounded-full border px-2 py-0.5 text-[10px] font-medium',
                        roleBadge(user.role)
                      )}
                    >
                      {user.role}
                    </span>
                    {user.banned && (
                      <Badge variant="destructive" className="text-[9px]">
                        Banned
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-xs">{user.email}</p>
                </div>
              </div>
              <PremiumButton
                variant={user.banned ? 'outline' : 'destructive'}
                size="sm"
                leftIcon={
                  user.banned ? (
                    <Shield className="h-3.5 w-3.5" />
                  ) : (
                    <ShieldBan className="h-3.5 w-3.5" />
                  )
                }
                onClick={() => handleBan(user.id, user.banned)}
                disabled={banningId === user.id}
                className="text-xs"
              >
                {banningId === user.id ? '...' : user.banned ? 'Unban' : 'Ban'}
              </PremiumButton>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => {
              setPage(page - 1);
              fetchUsers(page - 1);
            }}
          >
            Previous
          </Button>
          <span className="text-muted-foreground text-xs">
            Page {meta.page} of {meta.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= meta.totalPages}
            onClick={() => {
              setPage(page + 1);
              fetchUsers(page + 1);
            }}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
