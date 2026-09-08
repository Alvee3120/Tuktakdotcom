'use client';

import { Tag, Check, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Input } from '@/components/ui/input';
import { PremiumButton } from '@/components/ui/PremiumButton';

export type CouponResult = {
  code: string;
  /** Discount amount already computed by the backend for the given subtotal */
  discountAmount: number;
};

type CouponInputProps = {
  appliedCoupon: CouponResult | null;
  subtotal: number;
  onApply: (coupon: CouponResult) => void;
  onRemove: () => void;
};

/**
 * Coupon input component with validation, display, and remove functionality.
 * Validates against POST /api/orders/validate-coupon (requires auth session).
 */
export function CouponInput({ appliedCoupon, subtotal, onApply, onRemove }: CouponInputProps) {
  const t = useTranslations('checkout');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApply = async () => {
    if (!code.trim()) return;

    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/orders/validate-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: code.trim().toUpperCase(), orderAmount: subtotal }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error ?? t('couponInvalid'));
        return;
      }

      onApply({
        code: data.data.couponCode,
        discountAmount: data.data.discount,
      });
      setCode('');
    } catch {
      setError(t('couponInvalid'));
    } finally {
      setLoading(false);
    }
  };

  // Coupon applied state
  if (appliedCoupon) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 dark:border-green-800/30 dark:bg-green-950/20">
        <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
        <span className="text-body-sm flex-1 font-medium text-green-800 dark:text-green-200">
          {appliedCoupon.code} — {t('couponApplied')}
        </span>
        <button
          onClick={onRemove}
          className="text-xs font-medium text-green-700 underline hover:text-green-900 dark:text-green-300"
        >
          {t('couponRemove')}
        </button>
      </div>
    );
  }

  // Input state
  return (
    <div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder={t('couponCode')}
            className="pl-9 uppercase"
            disabled={loading}
            onKeyDown={(e) => e.key === 'Enter' && handleApply()}
          />
        </div>
        <PremiumButton
          variant="outline"
          size="sm"
          onClick={handleApply}
          disabled={!code.trim() || loading}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('applyCoupon')}
        </PremiumButton>
      </div>
      {error && <p className="text-caption text-destructive mt-1">{error}</p>}
    </div>
  );
}
