'use client';

import { Mail, Download } from 'lucide-react';
import { useState } from 'react';

import { StatCard } from '@/components/dashboard/StatCard';
import { useNewsletterSubscribers } from '@/hooks/useAdmin';

export default function AdminNewsletterPage() {
  const { data, isLoading } = useNewsletterSubscribers();
  const subscribers = data?.data ?? [];
  const [search, setSearch] = useState('');

  const filtered = subscribers.filter((s) => s.email.toLowerCase().includes(search.toLowerCase()));
  const activeCount = subscribers.filter((s) => s.isActive).length;

  const exportCsv = () => {
    const rows = [
      ['Email', 'Status', 'Subscribed At'],
      ...filtered.map((s) => [s.email, s.isActive ? 'active' : 'unsubscribed', s.createdAt]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'newsletter-subscribers.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Total Subscribers" value={subscribers.length} subtitle="All time" />
        <StatCard title="Active" value={activeCount} subtitle="Currently subscribed" />
        <StatCard
          title="Unsubscribed"
          value={subscribers.length - activeCount}
          subtitle="Opted out"
        />
      </div>

      {/* Table card */}
      <div className="border-border bg-card rounded-xl border shadow-sm">
        <div className="border-border flex items-center justify-between gap-3 border-b px-5 py-4">
          <h3 className="text-foreground text-base font-semibold">Newsletter Subscribers</h3>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search email..."
              className="border-border bg-card placeholder:text-muted-foreground/70 rounded-lg border px-3 py-2 text-sm focus:border-emerald-300 focus:outline-none"
            />
            <button
              onClick={exportCsv}
              disabled={filtered.length === 0}
              className="border-border bg-card text-foreground hover:bg-muted/50 flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium disabled:opacity-50"
            >
              <Download className="h-4 w-4" /> Export CSV
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-muted h-10 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Mail className="text-muted-foreground/40 h-10 w-10" />
            <p className="text-foreground mt-3 text-sm font-medium">No subscribers found</p>
            <p className="text-muted-foreground/70 text-xs">
              {search
                ? 'Try a different search.'
                : 'Subscribers from the storefront footer will appear here.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border text-muted-foreground/70 border-b text-left text-xs uppercase tracking-wider">
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Subscribed</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((sub) => (
                <tr
                  key={sub.id}
                  className="border-border/50 hover:bg-muted/30 border-b last:border-0"
                >
                  <td className="text-foreground px-5 py-3 font-medium">{sub.email}</td>
                  <td className="px-5 py-3">
                    <span
                      className={
                        sub.isActive
                          ? 'inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                          : 'bg-muted text-muted-foreground inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium'
                      }
                    >
                      {sub.isActive ? 'Active' : 'Unsubscribed'}
                    </span>
                  </td>
                  <td className="text-muted-foreground px-5 py-3">
                    {new Date(sub.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
