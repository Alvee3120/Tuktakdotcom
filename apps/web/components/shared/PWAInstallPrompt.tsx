'use client';

import { Download, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { PremiumButton } from '@/components/ui/PremiumButton';

/**
 * PWA Install Prompt — shows a banner when the browser supports PWA installation.
 * Listens for `beforeinstallprompt` and dismisses on user action or after timeout.
 */
export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Don't show if user previously dismissed
    if (localStorage.getItem('pwa-install-dismissed')) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Delay showing by 30s to not be intrusive
      const timer = setTimeout(() => setShow(true), 30_000);
      return () => clearTimeout(timer);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    const prompt = deferredPrompt as unknown as {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: string }>;
    };
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === 'accepted') {
      setShow(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem('pwa-install-dismissed', '1');
    setDeferredPrompt(null);
  };

  if (!show || !deferredPrompt) return null;

  return (
    <div className="animate-in slide-in-from-bottom-4 fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-md">
      <div className="border-border bg-card flex items-center gap-3 rounded-2xl border p-4 shadow-2xl">
        {/* Icon */}
        <div className="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
          <Download className="text-primary h-5 w-5" />
        </div>

        {/* Text */}
        <div className="flex-1">
          <p className="text-body-sm text-foreground font-semibold">Install Tuktak</p>
          <p className="text-caption text-muted-foreground">Get quick access and offline support</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <PremiumButton variant="primary" size="sm" onClick={handleInstall}>
            Install
          </PremiumButton>
          <button
            onClick={handleDismiss}
            className="text-muted-foreground hover:bg-muted flex h-7 w-7 items-center justify-center rounded-full transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
