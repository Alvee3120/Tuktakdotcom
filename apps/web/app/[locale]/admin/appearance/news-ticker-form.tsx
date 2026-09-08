'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { Switch } from '@/components/ui/switch';
import { api } from '@/lib/api-client';
import { DEFAULT_NEWS_TICKER, type NewsTickerConfig } from '@/lib/news-ticker';

/**
 * Admin form for the Top Bar News Ticker.
 *
 * Fetches the active config from the auth-gated admin endpoint, lets the admin
 * edit it, and saves via PUT /api/admin/news-ticker. The API Worker then
 * triggers on-demand revalidation of the storefront server-to-server, so the
 * revalidate secret never reaches the browser.
 */
export default function NewsTickerForm() {
  const [form, setForm] = useState<NewsTickerConfig>(DEFAULT_NEWS_TICKER);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get<{ success: boolean; data: Partial<NewsTickerConfig> }>('/api/admin/news-ticker')
      .then((res) => setForm({ ...DEFAULT_NEWS_TICKER, ...(res.data ?? {}) }))
      .catch(() => setForm(DEFAULT_NEWS_TICKER))
      .finally(() => setLoading(false));
  }, []);

  const update = (key: keyof NewsTickerConfig, value: string | boolean | null | string[]) =>
    setForm((prev) => ({ ...prev, [key]: value }) as NewsTickerConfig);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put<unknown>('/api/admin/news-ticker', form);
      toast.success('News ticker saved — storefront revalidated');
    } catch (err) {
      toast.error(`Failed to save: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-muted-foreground text-sm">Loading ticker…</p>;
  }

  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label htmlFor="enabled">Enable top-bar ticker</Label>
          <p className="text-muted-foreground text-sm">
            Show a scrolling announcement in the storefront top bar.
          </p>
        </div>
        <Switch id="enabled" checked={form.enabled} onCheckedChange={(v) => update('enabled', v)} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="text">Message (English)</Label>
        <Input
          id="text"
          value={form.text}
          onChange={(e) => update('text', e.target.value)}
          placeholder="Free shipping on orders over ৳5,000 | Same-day delivery"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="textBn">Message (Bengali)</Label>
        <Input
          id="textBn"
          value={form.textBn ?? ''}
          onChange={(e) => update('textBn', e.target.value || null)}
          placeholder="৳5,000-এর ওপর ফ্রি শিপিং | ঢাকায় একদিনের ডেলিভারি"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="link">Link URL (optional)</Label>
        <Input
          id="link"
          value={form.link ?? ''}
          onChange={(e) => update('link', e.target.value || null)}
          placeholder="/products or https://example.com"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="linkLabel">Link label (optional)</Label>
        <Input
          id="linkLabel"
          value={form.linkLabel ?? ''}
          onChange={(e) => update('linkLabel', e.target.value || null)}
          placeholder="Shop Now"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="phone">Phone number (announcement bar)</Label>
        <p className="text-muted-foreground text-xs">
          Shown in the top-bar phone pill. Use ASCII digits for a valid tel: link.
        </p>
        <Input
          id="phone"
          value={form.phone ?? ''}
          onChange={(e) => update('phone', e.target.value)}
          placeholder="01400881103"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="announcements">Marquee phrases (English) — one per line</Label>
        <textarea
          id="announcements"
          value={(form.announcements ?? []).join('\n')}
          onChange={(e) =>
            update(
              'announcements',
              e.target.value
                .split('\n')
                .map((s) => s.trim())
                .filter(Boolean)
            )
          }
          placeholder="Free shipping on orders over ৳5,000\nSame-day delivery in Dhaka\nCash on delivery available"
          rows={4}
          className="border-border bg-card placeholder:text-muted-foreground/70 w-full rounded-lg border px-3 py-2 font-mono text-sm focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-300"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="announcementsBn">Marquee phrases (Bengali) — one per line</Label>
        <textarea
          id="announcementsBn"
          value={(form.announcementsBn ?? []).join('\n')}
          onChange={(e) =>
            update(
              'announcementsBn',
              e.target.value
                .split('\n')
                .map((s) => s.trim())
                .filter(Boolean)
            )
          }
          placeholder="৳5,000-এর ওপর ফ্রি শিপিং\nঢাকায় একদিনের ডেলিভারি\nক্যাশ অন ডেলিভারি"
          rows={4}
          className="border-border bg-card placeholder:text-muted-foreground/70 w-full rounded-lg border px-3 py-2 font-mono text-sm focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-300"
        />
      </div>

      <PremiumButton isLoading={saving} disabled={saving} onClick={handleSave}>
        Save changes
      </PremiumButton>
    </div>
  );
}
