import { API_URL } from '@/lib/constants';

/**
 * Storefront social links — admin-managed under Settings → Social tab.
 *
 * Fetched server-side from the public /api/social-config endpoint with the
 * `social-config` ISR tag, so an admin save revalidates the footer instantly.
 */

export type SocialLink = {
  /** Platform id — matches a SocialIcon path (facebook/instagram/youtube/whatsapp) */
  platform: string;
  label: string;
  url: string;
  /** Brand color applied on hover */
  color: string;
};

const PLATFORM_META: Record<string, { label: string; color: string }> = {
  facebook: { label: 'Facebook', color: '#1877F2' },
  instagram: { label: 'Instagram', color: '#E4405F' },
  youtube: { label: 'YouTube', color: '#FF0000' },
  whatsapp: { label: 'WhatsApp', color: '#25D366' },
};

/** Render order for the footer icon row. */
const PLATFORM_ORDER = ['facebook', 'instagram', 'youtube', 'whatsapp'] as const;

/**
 * Normalize an admin-entered value into an href. URLs pass through; bare
 * domains get an https:// prefix, and WhatsApp accepts a raw phone number
 * (converted to a wa.me link).
 */
function toHref(platform: string, value: string): string {
  const v = value.trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  if (platform === 'whatsapp') {
    const digits = v.replace(/[^0-9]/g, '');
    return digits ? `https://wa.me/${digits}` : '';
  }
  return `https://${v.replace(/^\/+/, '')}`;
}

/** Server-side fetch of the configured social links. Empty when none are set. */
export async function getSocialLinks(): Promise<SocialLink[]> {
  try {
    const res = await fetch(`${API_URL}/api/social-config`, {
      next: { tags: ['social-config'], revalidate: 0 },
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { success?: boolean; data?: Record<string, string> };
    if (!body.success || !body.data) return [];
    const data = body.data;

    return PLATFORM_ORDER.flatMap((platform) => {
      const url = toHref(platform, data[platform] ?? '');
      if (!url) return [];
      const meta = PLATFORM_META[platform];
      return [{ platform, label: meta.label, url, color: meta.color }];
    });
  } catch {
    return [];
  }
}
