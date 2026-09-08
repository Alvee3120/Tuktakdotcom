'use client';

import {
  Code2,
  Plus,
  Trash2,
  GripVertical,
  Eye,
  EyeOff,
  FileCode,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { api } from '@/lib/api-client';
import { cn } from '@/lib/utils';

/* ───────────── Types ───────────── */

type SnippetPosition = 'header' | 'footer' | 'body';

type Snippet = {
  id: string;
  name: string;
  position: SnippetPosition;
  content: string;
  enabled: boolean;
  order: number;
};

type SnippetsTabProps = {
  onDirtyChange?: (dirty: boolean) => void;
  onSaveRef?: React.MutableRefObject<(() => Promise<boolean>) | null>;
};

const POSITION_META: Record<
  SnippetPosition,
  { label: string; description: string; color: string; icon: React.ReactNode }
> = {
  header: {
    label: 'Header',
    description: 'Injected in <head>. Use for meta tags, analytics, preconnect, custom CSS.',
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    icon: <FileCode className="h-3.5 w-3.5" />,
  },
  body: {
    label: 'Body',
    description: 'Injected at end of <body>. Use for chat widgets, A/B testing, popup scripts.',
    color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    icon: <Code2 className="h-3.5 w-3.5" />,
  },
  footer: {
    label: 'Footer',
    description: 'Lazy-loaded after page. Use for non-critical analytics, heatmaps, support tools.',
    color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    icon: <ArrowDown className="h-3.5 w-3.5" />,
  },
};

const PRESETS: { name: string; position: SnippetPosition; content: string }[] = [
  {
    name: 'Google Tag Manager (noscript)',
    position: 'header',
    content:
      '<!-- Google Tag Manager (noscript) -->\n<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX"\nheight="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>\n<!-- End Google Tag Manager (noscript) -->',
  },
  {
    name: 'Facebook Pixel (noscript)',
    position: 'footer',
    content:
      '<!-- Facebook Pixel (noscript) -->\n<noscript><img height="1" width="1" style="display:none"\nsrc="https://www.facebook.com/tr?id=XXXXXXXXXX&ev=PageView&noscript=1"/></noscript>\n<!-- End Facebook Pixel (noscript) -->',
  },
  {
    name: 'Crisp Chat Widget',
    position: 'footer',
    content:
      '<script>window.CRISP_WEBSITE_ID="your-id";(function(){d=document;s=d.createElement("script");s.src="https://client.crisp.chat/l.js";s.async=1;d.getElementsByTagName("head")[0].appendChild(s);})();</script>',
  },
  {
    name: 'Custom Meta Viewport',
    position: 'header',
    content:
      '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />',
  },
];

function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/* ───────────── Component ───────────── */

export function SnippetsTab({ onDirtyChange, onSaveRef }: SnippetsTabProps) {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showPresets, setShowPresets] = useState(false);

  /* Fetch snippets from settings */
  useEffect(() => {
    api
      .get<{ success: boolean; data: Record<string, string> }>('/api/admin/settings')
      .then((res) => {
        if (res.data?.customSnippets) {
          try {
            const parsed = JSON.parse(res.data.customSnippets);
            if (Array.isArray(parsed)) setSnippets(parsed);
          } catch {}
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  /* Save snippets */
  const handleSave = useCallback(async (): Promise<boolean> => {
    setSaving(true);
    try {
      await api.put('/api/admin/settings', {
        customSnippets: JSON.stringify(snippets),
      });
      onDirtyChange?.(false);
      toast.success('Snippets saved — storefront updated instantly');
      return true;
    } catch {
      toast.error('Failed to save snippets');
      return false;
    } finally {
      setSaving(false);
    }
  }, [snippets, onDirtyChange]);

  /* Expose save to parent */
  useEffect(() => {
    if (onSaveRef) onSaveRef.current = handleSave;
  }, [handleSave, onSaveRef]);

  const markDirty = () => onDirtyChange?.(true);

  const addSnippet = (position: SnippetPosition) => {
    const snippet: Snippet = {
      id: newId(),
      name: '',
      position,
      content: '',
      enabled: true,
      order: snippets.filter((s) => s.position === position).length,
    };
    setSnippets((prev) => [...prev, snippet]);
    setExpandedId(snippet.id);
    markDirty();
  };

  const addPreset = (preset: (typeof PRESETS)[number]) => {
    const snippet: Snippet = {
      id: newId(),
      name: preset.name,
      position: preset.position,
      content: preset.content,
      enabled: true,
      order: snippets.filter((s) => s.position === preset.position).length,
    };
    setSnippets((prev) => [...prev, snippet]);
    setExpandedId(snippet.id);
    setShowPresets(false);
    markDirty();
  };

  const removeSnippet = (id: string) => {
    setSnippets((prev) => prev.filter((s) => s.id !== id));
    if (expandedId === id) setExpandedId(null);
    markDirty();
  };

  const updateSnippet = (id: string, patch: Partial<Snippet>) => {
    setSnippets((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    markDirty();
  };

  const toggleSnippet = (id: string) => {
    setSnippets((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
    markDirty();
  };

  const moveSnippet = (id: string, direction: 'up' | 'down') => {
    setSnippets((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx === -1) return prev;
      const swap = direction === 'up' ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swap]] = [next[swap], next[idx]];
      // Reassign orders within same position
      const pos = next[idx].position;
      let order = 0;
      for (const s of next) {
        if (s.position === pos) {
          s.order = order++;
        }
      }
      return next;
    });
    markDirty();
  };

  const grouped = {
    header: snippets.filter((s) => s.position === 'header'),
    body: snippets.filter((s) => s.position === 'body'),
    footer: snippets.filter((s) => s.position === 'footer'),
  };

  const totalCount = snippets.length;
  const enabledCount = snippets.filter((s) => s.enabled).length;

  if (loading) {
    return (
      <div className="border-border bg-card rounded-2xl border p-6">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 flex h-9 w-9 items-center justify-center rounded-lg">
            <Code2 className="text-primary h-4 w-4" />
          </div>
          <div>
            <div className="h-4 w-32 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
            <div className="mt-1 h-3 w-48 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="border-border bg-card rounded-2xl border p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 flex h-9 w-9 items-center justify-center rounded-lg">
              <Code2 className="text-primary h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Custom Snippets</h2>
              <p className="text-muted-foreground text-xs">
                Inject custom HTML/CSS/JS into your storefront
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {totalCount > 0 && (
              <span className="text-muted-foreground rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-medium dark:bg-neutral-800">
                {enabledCount}/{totalCount} active
              </span>
            )}
            <PremiumButton
              variant="outline"
              size="sm"
              onClick={() => setShowPresets(!showPresets)}
              leftIcon={<Plus className="h-3.5 w-3.5" />}
            >
              Presets
            </PremiumButton>
          </div>
        </div>

        {/* Presets dropdown */}
        {showPresets && (
          <div className="bg-muted/50 mt-4 rounded-xl p-4">
            <p className="text-muted-foreground mb-3 text-xs font-medium uppercase tracking-wider">
              Quick Add
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => addPreset(preset)}
                  className="border-border hover:bg-card flex items-start gap-3 rounded-xl border bg-white p-3 text-left transition-colors dark:bg-neutral-900"
                >
                  <span
                    className={cn(
                      'mt-0.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold',
                      POSITION_META[preset.position].color
                    )}
                  >
                    {POSITION_META[preset.position].icon}
                    {POSITION_META[preset.position].label}
                  </span>
                  <span className="text-xs font-medium">{preset.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Info banner */}
        <div className="bg-primary/5 mt-4 flex items-start gap-2.5 rounded-xl p-3.5">
          <AlertCircle className="text-primary mt-0.5 h-4 w-4 shrink-0" />
          <div className="space-y-1">
            <p className="text-xs font-medium">How it works</p>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Header snippets load before page content (for meta tags, CSS, preconnect). Body
              snippets load after DOM ready (for widgets, popups). Footer snippets lazy-load last
              (for analytics, heatmaps). Changes deploy instantly via ISR revalidation.
            </p>
          </div>
        </div>
      </div>

      {/* Snippet groups */}
      {(['header', 'body', 'footer'] as const).map((pos) => {
        const meta = POSITION_META[pos];
        const items = grouped[pos];
        return (
          <div key={pos} className="border-border bg-card rounded-2xl border p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-semibold',
                    meta.color
                  )}
                >
                  {meta.icon}
                  {meta.label}
                </span>
                <span className="text-muted-foreground text-[11px]">{meta.description}</span>
              </div>
              <PremiumButton
                variant="ghost"
                size="sm"
                onClick={() => addSnippet(pos)}
                leftIcon={<Plus className="h-3.5 w-3.5" />}
              >
                Add
              </PremiumButton>
            </div>

            {items.length === 0 && (
              <div className="border-border/50 mt-4 flex flex-col items-center rounded-xl border border-dashed py-8">
                <Code2 className="text-muted-foreground/50 mb-2 h-6 w-6" />
                <p className="text-muted-foreground text-xs">No {meta.label.toLowerCase()} snippets</p>
              </div>
            )}

            <div className="mt-4 space-y-3">
              {items.map((snippet) => {
                const isExpanded = expandedId === snippet.id;
                return (
                  <div
                    key={snippet.id}
                    className={cn(
                      'border-border rounded-xl border transition-all',
                      snippet.enabled ? 'bg-card' : 'bg-muted/30 opacity-60'
                    )}
                  >
                    {/* Snippet header */}
                    <div className="flex items-center gap-2 px-4 py-3">
                      <GripVertical className="text-muted-foreground h-4 w-4 shrink-0 cursor-grab" />
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : snippet.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="flex items-center gap-2">
                          {snippet.enabled ? (
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                          ) : (
                            <EyeOff className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                          )}
                          <span className="truncate text-sm font-medium">
                            {snippet.name || (
                              <span className="text-muted-foreground italic">Untitled snippet</span>
                            )}
                          </span>
                          {snippet.content && (
                            <span className="text-muted-foreground shrink-0 text-[10px]">
                              {snippet.content.length} chars
                            </span>
                          )}
                        </div>
                      </button>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => moveSnippet(snippet.id, 'up')}
                          className="hover:bg-muted rounded-md p-1 transition-colors"
                          title="Move up"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => moveSnippet(snippet.id, 'down')}
                          className="hover:bg-muted rounded-md p-1 transition-colors"
                          title="Move down"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => toggleSnippet(snippet.id)}
                          className="hover:bg-muted rounded-md p-1 transition-colors"
                          title={snippet.enabled ? 'Disable' : 'Enable'}
                        >
                          {snippet.enabled ? (
                            <Eye className="h-3.5 w-3.5" />
                          ) : (
                            <EyeOff className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => removeSnippet(snippet.id)}
                          className="hover:bg-destructive/10 hover:text-destructive rounded-md p-1 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Expanded editor */}
                    {isExpanded && (
                      <div className="border-border space-y-3 border-t px-4 pb-4 pt-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <Label className="text-[11px]">Name</Label>
                            <Input
                              value={snippet.name}
                              onChange={(e) =>
                                updateSnippet(snippet.id, { name: e.target.value })
                              }
                              placeholder="e.g. Google Analytics, Hotjar, Crisp..."
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px]">Position</Label>
                            <select
                              value={snippet.position}
                              onChange={(e) =>
                                updateSnippet(snippet.id, {
                                  position: e.target.value as SnippetPosition,
                                })
                              }
                              className="border-border bg-background h-8 w-full rounded-md border px-2 text-xs"
                            >
                              <option value="header">Header ({'<head>'})</option>
                              <option value="body">Body ({'</body>'})</option>
                              <option value="footer">Footer (lazy)</option>
                            </select>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label className="text-[11px]">Code / HTML</Label>
                            <span className="text-muted-foreground text-[10px]">
                              {snippet.content.length.toLocaleString()} characters
                            </span>
                          </div>
                          <textarea
                            value={snippet.content}
                            onChange={(e) =>
                              updateSnippet(snippet.id, { content: e.target.value })
                            }
                            placeholder={'<script>\n  // Your code here\n</script>'}
                            spellCheck={false}
                            className="border-border bg-muted/50 min-h-[160px] w-full rounded-xl border p-3 font-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
