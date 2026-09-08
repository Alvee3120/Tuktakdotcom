'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

import { SocialIcon } from '@/components/shared/SocialIcon';
import { useSupportConfig } from '@/hooks/useSupportConfig';

/**
 * Floating chat buttons — fixed bottom-right stack.
 * Visibility is driven entirely by the admin "Chat" settings:
 *  - WhatsApp  → shown when is_whatsapp_enabled and a phone number is set.
 *  - Messenger → shown when is_messenger_enabled and a page ID is set.
 * Colors/borders come from Tailwind theme tokens so they adapt to
 * light/dark mode automatically. Stacks above the MobileBottomNav and
 * sits clear of the right-edge FloatingCart (which is center-aligned).
 */
export function FloatingChatIcons() {
  const t = useTranslations('common');
  const { data } = useSupportConfig();
  const whatsapp = data?.data?.whatsapp;
  const messenger = data?.data?.messenger;

  const whatsappPhone = whatsapp?.phoneNumber?.replace(/[^0-9]/g, '') ?? '';
  const showWhatsApp = whatsapp?.enabled && whatsappPhone.length > 0;
  const showMessenger = messenger?.enabled && (messenger.pageId ?? '').trim().length > 0;

  if (!showWhatsApp && !showMessenger) return null;

  return (
    <div className="fixed bottom-20 right-4 z-[60] flex flex-col items-center gap-3 lg:bottom-6 lg:right-6">
      {showMessenger && (
        <motion.a
          href={`https://m.me/${encodeURIComponent(messenger!.pageId.trim())}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('chatOnMessenger')}
          title={t('chatOnMessenger')}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 16, stiffness: 260 }}
          whileHover={{ scale: 1.12, y: -2 }}
          whileTap={{ scale: 0.92 }}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0084FF] text-white shadow-lg shadow-blue-500/30 transition-colors hover:bg-[#0073e6]"
        >
          <SocialIcon platform="messenger" className="h-6 w-6" />
        </motion.a>
      )}
      {showWhatsApp && (
        <motion.a
          href={`https://wa.me/${whatsappPhone}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('chatOnWhatsApp')}
          title={t('chatOnWhatsApp')}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: 'spring',
            damping: 16,
            stiffness: 260,
            delay: showMessenger ? 0.08 : 0,
          }}
          whileHover={{ scale: 1.12, y: -2 }}
          whileTap={{ scale: 0.92 }}
          className="relative flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-emerald-500/30 transition-colors hover:bg-[#1fb959]"
        >
          <SocialIcon platform="whatsapp" className="h-6 w-6" />
          <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-60" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-white shadow" />
          </span>
        </motion.a>
      )}
    </div>
  );
}
