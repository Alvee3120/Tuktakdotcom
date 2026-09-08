'use client';

import { Send, CheckCircle, Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

export function NewsletterForm() {
  const t = useTranslations('newsletter');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/contact/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error();
      setIsSuccess(true);
      toast.success(t('success'));
      setEmail('');
      setTimeout(() => setIsSuccess(false), 4000);
    } catch {
      toast.error(t('error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <p className="mb-3 text-sm leading-relaxed text-emerald-700/60 dark:text-white/50">
        {t('description')}
      </p>
      <form className="flex gap-2" onSubmit={handleSubmit}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('placeholder')}
          required
          className="h-10 min-w-0 flex-1 rounded-lg border border-emerald-200/50 bg-white/70 px-3.5 text-sm text-emerald-900 placeholder:text-emerald-700/40 backdrop-blur-sm transition-colors focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-white/40"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-5 text-sm font-medium text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow-md disabled:opacity-60 dark:bg-emerald-500 dark:hover:bg-emerald-400"
        >
          {isLoading ? (
            <Send className="h-3.5 w-3.5 animate-pulse" />
          ) : isSuccess ? (
            <CheckCircle className="h-3.5 w-3.5" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">{t('subscribe')}</span>
        </button>
      </form>
      <p className="mt-2 text-[11px] leading-relaxed text-emerald-700/40 dark:text-white/40">
        {t('privacy')}
      </p>
    </div>
  );
}
