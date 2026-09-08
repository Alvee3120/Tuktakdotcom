import {
  Truck,
  PackageCheck,
  Headphones,
  ShieldCheck,
  RotateCcw,
  CreditCard,
  Clock,
  Zap,
  Heart,
  Award,
  CheckCircle,
  Sparkles,
  Lock,
  Globe,
  Phone,
  Mail,
  MapPin,
  Star,
  BadgeCheck,
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import type { FeatureItem } from '@/lib/home-config';

type FeatureBarProps = {
  enabled?: boolean;
  items?: FeatureItem[];
};

/** Map of icon name → lucide component for admin picker */
export const FEATURE_BAR_ICONS: Record<
  string,
  React.ComponentType<{ className?: string; strokeWidth?: number }>
> = {
  truck: Truck,
  package: PackageCheck,
  headphones: Headphones,
  shield: ShieldCheck,
  'shield-check': ShieldCheck,
  returns: RotateCcw,
  'rotate-ccw': RotateCcw,
  creditCard: CreditCard,
  'credit-card': CreditCard,
  clock: Clock,
  zap: Zap,
  heart: Heart,
  award: Award,
  check: CheckCircle,
  'check-circle': CheckCircle,
  sparkles: Sparkles,
  lock: Lock,
  globe: Globe,
  phone: Phone,
  mail: Mail,
  mapPin: MapPin,
  'map-pin': MapPin,
  star: Star,
  badge: BadgeCheck,
  'badge-check': BadgeCheck,
};

const DEFAULT_ICONS = [Truck, PackageCheck, Headphones, ShieldCheck];

function FeatureIcon({
  name,
  className,
  strokeWidth,
}: {
  name: string;
  className?: string;
  strokeWidth?: number;
}) {
  const Icon = FEATURE_BAR_ICONS[name] ?? Truck;
  return <Icon className={className} strokeWidth={strokeWidth} />;
}

export async function FeatureBar({ enabled = true, items }: FeatureBarProps = {}) {
  if (!enabled) return null;
  const t = await getTranslations('home.features');

  const fallback: FeatureItem[] = [
    { title: t('shipping.title'), desc: t('shipping.desc'), icon: 'truck' },
    { title: t('returns.title'), desc: t('returns.desc'), icon: 'returns' },
    { title: t('support.title'), desc: t('support.desc'), icon: 'headphones' },
    { title: 'Secure Payment', desc: '100% secure checkout', icon: 'shield' },
  ];

  // Use admin items if array has any items at all; only fall back when empty/missing
  const source = items && items.length > 0 ? items : fallback;

  return (
    <section className="bg-transparent">
      <div className="mx-auto max-w-screen-2xl px-2 py-8 sm:px-3 sm:py-10 lg:px-4 lg:py-12">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {source.slice(0, 4).map((item, i) => (
            <div
              key={i}
              className="group relative flex flex-col items-center overflow-hidden rounded-2xl border border-emerald-500/10 bg-emerald-50/50 p-5 text-center backdrop-blur-xl transition-all duration-300 hover:border-emerald-500/25 hover:bg-emerald-100/60 dark:border-emerald-400/15 dark:bg-emerald-900/30 dark:hover:border-emerald-400/30 dark:hover:bg-emerald-900/50"
            >
              {/* Glass highlight */}
              <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-white/40 via-white/10 to-transparent dark:from-white/[0.08] dark:via-white/[0.02]" />

              {/* Green glow */}
              <div className="pointer-events-none absolute -left-6 -top-6 h-20 w-20 rounded-full bg-emerald-400/20 blur-2xl transition-opacity duration-300 group-hover:opacity-100 dark:bg-emerald-400/10" />

              <div className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-200/80 to-emerald-300/50 text-emerald-700 shadow-lg shadow-emerald-500/10 backdrop-blur-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-emerald-500/20 dark:border-emerald-400/25 dark:from-emerald-600/60 dark:to-emerald-700/40 dark:text-emerald-200 dark:shadow-emerald-400/10 dark:group-hover:shadow-emerald-400/20">
                <FeatureIcon name={item.icon ?? ''} className="h-5 w-5" strokeWidth={1.5} />
              </div>

              <div className="relative mt-3">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 sm:text-xs dark:text-emerald-200">
                  {item.title}
                </h3>
                <p className="mt-1 text-[10px] leading-snug text-emerald-600/80 sm:text-[11px] dark:text-emerald-400/70">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
