import { ArrowLeft, Compass, Home, PackageOpen, Search, ShoppingBag, Sparkles } from 'lucide-react';
import Link from 'next/link';

import { Container } from '@/components/shared/Layout';
import { PremiumButton } from '@/components/ui/PremiumButton';

const quickLinks = [
  { href: '/products', label: 'Browse Products', icon: ShoppingBag },
  { href: '/flash-deals', label: 'Flash Deals', icon: Sparkles },
  { href: '/tracking', label: 'Track Order', icon: PackageOpen },
  { href: '/contact', label: 'Help Center', icon: Compass },
];

export default function NotFound() {
  return (
    <div className="relative flex min-h-[80vh] items-center justify-center overflow-hidden px-4 py-16">
      {/* ── Ambient background (decorative, respects dark mode) ── */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="animate-float bg-primary/15 absolute -left-24 top-10 h-72 w-72 rounded-full blur-3xl" />
        <div
          className="animate-float bg-primary/10 absolute right-[-4rem] top-1/3 h-80 w-80 rounded-full blur-3xl"
          style={{ animationDelay: '-1.5s' }}
        />
        <div className="bg-secondary absolute bottom-[-5rem] left-1/4 h-64 w-64 rounded-full blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.4] dark:opacity-[0.25]"
          style={{
            backgroundImage: 'radial-gradient(circle, var(--border) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            maskImage: 'radial-gradient(ellipse 70% 60% at 50% 40%, black, transparent)',
            WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 40%, black, transparent)',
          }}
        />
      </div>

      <Container size="sm">
        <div className="relative text-center">
          {/* ── 404 artwork ── */}
          <div className="relative mx-auto flex items-center justify-center">
            <span
              aria-hidden
              className="text-primary/5 select-none text-[7rem] font-black leading-none tracking-tighter sm:text-[11rem]"
            >
              404
            </span>

            {/* Floating lost package */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[56%]">
              <div className="animate-float relative">
                <div className="border-primary/20 bg-card text-primary shadow-glow flex h-14 w-14 items-center justify-center rounded-2xl border sm:h-16 sm:w-16">
                  <PackageOpen className="h-7 w-7 sm:h-8 sm:w-8" />
                </div>
                {/* Delivery dashed line */}
                <div className="from-primary/60 absolute left-1/2 top-full mt-2 h-2 w-px -translate-x-1/2 bg-gradient-to-b to-transparent" />
                <div className="animate-pulse-soft bg-primary/30 absolute left-1/2 top-full mt-0.5 h-2 w-10 -translate-x-1/2 rounded-full" />
              </div>
            </div>

            {/* Animated pin dots */}
            <span className="animate-pulse-soft bg-primary/60 absolute left-[12%] top-[18%] h-2 w-2 rounded-full" />
            <span
              className="animate-pulse-soft bg-primary/40 absolute right-[16%] top-[30%] h-2.5 w-2.5 rounded-full"
              style={{ animationDelay: '-1s' }}
            />
            <span
              className="animate-pulse-soft bg-warning/60 absolute bottom-[16%] left-[20%] h-2 w-2 rounded-full"
              style={{ animationDelay: '-2s' }}
            />
          </div>

          {/* ── Headline ── */}
          <h1 className="text-heading-xl sm:text-display-md mt-6 font-bold tracking-tight">
            Looks like this page <span className="text-gradient">got lost in transit</span>
          </h1>

          {/* ── Description ── */}
          <p className="text-body-md text-muted-foreground mx-auto mt-4 max-w-md">
            The page you&apos;re looking for doesn&apos;t exist or has been moved. The delivery
            driver couldn&apos;t find it either — let&apos;s get you back on track.
          </p>

          {/* ── Actions ── */}
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/" className="w-full sm:w-auto">
              <PremiumButton
                variant="gradient"
                size="lg"
                className="w-full gap-2 sm:w-auto"
                leftIcon={<Home className="h-4 w-4" />}
              >
                Back to Home
              </PremiumButton>
            </Link>
            <Link href="/products" className="w-full sm:w-auto">
              <PremiumButton
                variant="outline"
                size="lg"
                className="w-full gap-2 sm:w-auto"
                leftIcon={<Search className="h-4 w-4" />}
              >
                Search Products
              </PremiumButton>
            </Link>
          </div>

          {/* ── Quick links ── */}
          <div className="mt-10">
            <p className="text-overline text-muted-foreground">Popular places</p>
            <div className="mx-auto mt-4 grid max-w-lg grid-cols-2 gap-2.5 sm:grid-cols-4">
              {quickLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="border-border bg-card hover:border-primary/30 hover:shadow-glow group flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all duration-200 hover:-translate-y-0.5"
                >
                  <Icon className="text-primary h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                  <span className="text-body-xs text-foreground font-medium">{label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* ── Back link ── */}
          <Link
            href="/"
            className="text-body-sm text-muted-foreground hover:text-primary group mt-8 inline-flex items-center gap-1.5 font-medium transition-colors"
          >
            <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
            Go back where you came from
          </Link>
        </div>
      </Container>
    </div>
  );
}
