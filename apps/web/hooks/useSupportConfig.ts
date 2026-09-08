import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api-client';

/** Public support-info config exposed by GET /api/support-config */
export type SupportConfig = {
  whatsapp: { enabled: boolean; phoneNumber: string };
  messenger: { enabled: boolean; pageId: string };
};

/** Hook: Fetch storefront support chat config (WhatsApp + Messenger). */
export function useSupportConfig() {
  return useQuery({
    queryKey: ['support-config'],
    queryFn: () => api.get<{ success: boolean; data: SupportConfig }>('/api/support-config'),
    staleTime: 5 * 60 * 1000,
  });
}
