'use client';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AnimatePresence, motion } from 'framer-motion';
import {
  GripVertical,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  ImageIcon,
  Settings,
  X,
  Globe,
  Sparkles,
  Type,
  Link2,
  Palette,
  ArrowDown,
  ArrowUp,
  ArrowLeft,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  Layers,
} from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';

import { SingleImageUploader } from '@/components/dashboard/ImageUploader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PremiumButton } from '@/components/ui/PremiumButton';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api-client';
import { cn } from '@/lib/utils';

/* ═══════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════ */

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';
type AnimationType =
  | 'fade'
  | 'top-to-bottom'
  | 'bottom-to-top'
  | 'left-to-right'
  | 'right-to-left'
  | 'scale-up'
  | 'zoom-out'
  | 'parallax';
type FontSize = 'sm' | 'md' | 'lg' | 'xl';

type HeroSlide = {
  id: string;
  title: string;
  titleBn: string | null;
  subtitle: string | null;
  subtitleBn: string | null;
  description: string | null;
  descriptionBn: string | null;
  image: string;
  backgroundImage: string | null;
  mobileBackgroundImage: string | null;
  ctaText: string | null;
  ctaTextBn: string | null;
  ctaLink: string | null;
  ctaSecondaryText: string | null;
  ctaSecondaryTextBn: string | null;
  ctaSecondaryLink: string | null;
  overlayColor: string;
  textAlign: string;
  textColor: string;
  badge: string | null;
  badgeBn: string | null;
  badgeVariant: BadgeVariant;
  animation: AnimationType;
  animationDuration: number;
  titleFontSize: FontSize;
  subtitleFontSize: FontSize;
  productId: string | null;
  showTrustBadges: boolean;
  showTitle: boolean;
  showSubtitle: boolean;
  sortOrder: number;
  isActive: boolean;
};

type FormState = {
  title: string;
  titleBn: string;
  subtitle: string;
  subtitleBn: string;
  description: string;
  descriptionBn: string;
  image: string;
  backgroundImage: string;
  mobileBackgroundImage: string;
  ctaText: string;
  ctaTextBn: string;
  ctaLink: string;
  ctaSecondaryText: string;
  ctaSecondaryTextBn: string;
  ctaSecondaryLink: string;
  overlayColor: string;
  textAlign: string;
  textColor: string;
  badge: string;
  badgeBn: string;
  badgeVariant: BadgeVariant;
  animation: AnimationType;
  animationDuration: number;
  titleFontSize: FontSize;
  subtitleFontSize: FontSize;
  productId: string;
  showTrustBadges: boolean;
  showTitle: boolean;
  showSubtitle: boolean;
  sortOrder: number;
  isActive: boolean;
};

type TabLang = 'en' | 'bn';

/* ═══════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════ */

const emptyForm: FormState = {
  title: '',
  titleBn: '',
  subtitle: '',
  subtitleBn: '',
  description: '',
  descriptionBn: '',
  image: '',
  backgroundImage: '',
  mobileBackgroundImage: '',
  ctaText: 'Shop Now',
  ctaTextBn: 'এখনই কিনুন',
  ctaLink: '/products',
  ctaSecondaryText: '',
  ctaSecondaryTextBn: '',
  ctaSecondaryLink: '',
  overlayColor: 'from-black/60 to-transparent',
  textAlign: 'left',
  textColor: '#ffffff',
  badge: '',
  badgeBn: '',
  badgeVariant: 'default',
  animation: 'fade',
  animationDuration: 700,
  titleFontSize: 'lg',
  subtitleFontSize: 'md',
  productId: '',
  showTrustBadges: true,
  showTitle: true,
  showSubtitle: true,
  sortOrder: 0,
  isActive: true,
};

const ANIMATIONS: { value: AnimationType; label: string; icon: React.ReactNode; desc: string }[] = [
  {
    value: 'fade',
    label: 'Fade',
    icon: <Sparkles className="h-4 w-4" />,
    desc: 'Smooth opacity transition',
  },
  {
    value: 'top-to-bottom',
    label: 'Slide Down',
    icon: <ArrowDown className="h-4 w-4" />,
    desc: 'Enter from top',
  },
  {
    value: 'bottom-to-top',
    label: 'Slide Up',
    icon: <ArrowUp className="h-4 w-4" />,
    desc: 'Enter from bottom',
  },
  {
    value: 'left-to-right',
    label: 'Slide Right',
    icon: <ArrowRight className="h-4 w-4" />,
    desc: 'Enter from left',
  },
  {
    value: 'right-to-left',
    label: 'Slide Left',
    icon: <ArrowLeft className="h-4 w-4" />,
    desc: 'Enter from right',
  },
  {
    value: 'scale-up',
    label: 'Scale Up',
    icon: <ZoomIn className="h-4 w-4" />,
    desc: 'Zoom in from small',
  },
  {
    value: 'zoom-out',
    label: 'Zoom Out',
    icon: <ZoomOut className="h-4 w-4" />,
    desc: 'Zoom from large',
  },
  {
    value: 'parallax',
    label: 'Parallax',
    icon: <Layers className="h-4 w-4" />,
    desc: 'Depth movement',
  },
];

const OVERLAY_PRESETS = [
  { value: '', label: 'None' },
  { value: 'from-black/60 to-transparent', label: 'Dark → Clear' },
  { value: 'from-black/80 to-black/20', label: 'Dark Solid' },
  { value: 'from-primary/60 to-transparent', label: 'Brand → Clear' },
  { value: 'from-black/40 via-black/10 to-transparent', label: 'Subtle Vignette' },
  { value: 'to-black/50', label: 'Bottom Dark' },
];

/* ═══════════════════════════════════════════════════
   SORTABLE SLIDE CARD
   ═══════════════════════════════════════════════════ */

function SortableSlideCard({
  slide,
  index,
  total: _total,
  onEdit,
  onToggle,
  onDelete,
}: {
  slide: HeroSlide;
  index: number;
  total: number;
  onEdit: (s: HeroSlide) => void;
  onToggle: (s: HeroSlide) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: slide.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'bg-card group relative flex flex-col overflow-hidden rounded-xl border transition-all',
        isDragging ? 'ring-primary/30 shadow-2xl ring-2' : 'hover:shadow-md',
        slide.isActive ? 'border-border' : 'border-dashed opacity-60'
      )}
    >
      <div className="bg-muted relative h-44 overflow-hidden">
        <Image
          src={slide.backgroundImage || slide.image}
          alt={slide.title}
          fill
          sizes="288px"
          className="object-cover"
        />
        <div className={cn('absolute inset-0 bg-gradient-to-r', slide.overlayColor)} />
        <div className="absolute inset-0 z-10 flex flex-col justify-center px-6">
          {slide.badge && (
            <Badge variant={slide.badgeVariant ?? 'default'} className="mb-2 w-fit text-xs">
              {slide.badge}
            </Badge>
          )}
          <h3 className="line-clamp-1 text-lg font-bold" style={{ color: slide.textColor }}>
            {slide.title}
          </h3>
          {slide.subtitle && (
            <p className="mt-1 line-clamp-1 text-xs opacity-80" style={{ color: slide.textColor }}>
              {slide.subtitle}
            </p>
          )}
        </div>
        {/* Animation indicator */}
        <div className="absolute left-2 top-2 z-20">
          <span className="bg-background/80 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm">
            {ANIMATIONS.find((a) => a.value === slide.animation)?.icon}
            <span className="hidden sm:inline">
              {ANIMATIONS.find((a) => a.value === slide.animation)?.label}
            </span>
          </span>
        </div>
        <div className="absolute right-2 top-2 z-20 flex gap-1">
          <button
            onClick={() => onToggle(slide)}
            className="bg-background/80 hover:bg-background flex h-7 w-7 items-center justify-center rounded-full backdrop-blur-sm"
            title={slide.isActive ? 'Hide' : 'Show'}
          >
            {slide.isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between p-3">
        <div className="flex min-w-0 items-center gap-2">
          <button
            {...attributes}
            {...listeners}
            className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <span className="bg-muted text-muted-foreground flex h-6 w-6 items-center justify-center rounded-md font-mono text-xs font-bold">
            {index + 1}
          </span>
          <p className="max-w-[140px] truncate text-sm font-medium">{slide.title}</p>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => onEdit(slide)}
            className="text-muted-foreground hover:bg-primary/10 hover:text-primary flex h-7 w-7 items-center justify-center rounded"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onDelete(slide.id)}
            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive flex h-7 w-7 items-center justify-center rounded"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   LIVE PREVIEW
   ═══════════════════════════════════════════════════ */

function LivePreview({ form }: { form: FormState }) {
  const TITLE_SIZE = { sm: 'text-2xl', md: 'text-3xl', lg: 'text-4xl', xl: 'text-5xl' };
  const SUBTITLE_SIZE = { sm: 'text-sm', md: 'text-base', lg: 'text-lg', xl: 'text-xl' };
  const tc = form.textColor || '#ffffff';
  const textAlign = (form.textAlign || 'left') as 'left' | 'center' | 'right';
  const EASING = [0.22, 1, 0.36, 1] as const;
  const isDirectional = ['top-to-bottom', 'bottom-to-top', 'left-to-right', 'right-to-left'].includes(
    form.animation
  );
  // Use 100% offsets like HeroSection — 72px was invisible, 100% fully covers
  const previewVariants = (() => {
    switch (form.animation) {
      case 'top-to-bottom':
        return { initial: { y: '-100%' }, animate: { y: '0%' }, exit: { y: '100%' } };
      case 'bottom-to-top':
        return { initial: { y: '100%' }, animate: { y: '0%' }, exit: { y: '-100%' } };
      case 'left-to-right':
        return { initial: { x: '-100%' }, animate: { x: '0%' }, exit: { x: '100%' } };
      case 'right-to-left':
        return { initial: { x: '100%' }, animate: { x: '0%' }, exit: { x: '-100%' } };
      case 'scale-up':
        return { initial: { scale: 0.88, opacity: 0 }, animate: { scale: 1, opacity: 1 }, exit: { scale: 1.06, opacity: 0 } };
      case 'zoom-out':
        return { initial: { scale: 1.18, opacity: 0 }, animate: { scale: 1, opacity: 1 }, exit: { scale: 0.92, opacity: 0 } };
      case 'parallax':
        return { initial: { y: '-8%', opacity: 0 }, animate: { y: '0%', opacity: 1 }, exit: { y: '8%', opacity: 0 } };
      case 'fade':
      default:
        return { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };
    }
  })();

  const slideKey = `${form.animation}-${form.animationDuration}-${form.title}-${form.textAlign}-${form.overlayColor}-${form.backgroundImage}`;
  const transition = { duration: (form.animationDuration || 700) / 1000, ease: EASING };

  const SlideContent = ({ className }: { className?: string }) => (
    <>
      {/* Background */}
      {form.backgroundImage ? (
        <Image src={form.backgroundImage} alt="Preview" fill sizes="600px" className="object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10 dark:from-primary/20 dark:via-card dark:to-primary/10" />
      )}
      {form.overlayColor && <div className={cn('absolute inset-0 bg-gradient-to-r', form.overlayColor)} />}
      <div
        className={cn(
          'absolute inset-0 z-10 flex flex-col justify-center px-6',
          textAlign === 'center' && 'items-center text-center',
          textAlign === 'right' && 'items-end text-right',
          className
        )}
      >
        {form.badge && (
          <span className="mb-2 inline-flex w-fit items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm" style={{ color: tc }}>
            {form.badge}
          </span>
        )}
        {form.showTitle && (
          <h3 className={cn('line-clamp-2 font-bold', TITLE_SIZE[form.titleFontSize])} style={{ textAlign, color: tc }}>
            {form.title || 'Slide Title'}
          </h3>
        )}
        {form.showSubtitle && form.subtitle && (
          <p className={cn('mt-1 line-clamp-1', SUBTITLE_SIZE[form.subtitleFontSize])} style={{ textAlign, color: tc, opacity: 0.8 }}>
            {form.subtitle}
          </p>
        )}
        {form.description && (
          <p className="mt-1 line-clamp-1 text-xs" style={{ textAlign, color: tc, opacity: 0.6 }}>
            {form.description}
          </p>
        )}
        <div className="mt-3 flex items-center gap-2" style={{ justifyContent: textAlign === 'center' ? 'center' : textAlign === 'right' ? 'flex-end' : 'flex-start' }}>
          <span className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-black">
            {form.ctaText || 'Shop Now'} →
          </span>
          {form.ctaSecondaryText && (
            <span className="inline-flex items-center rounded-lg border border-white/30 px-3 py-1.5 text-xs font-medium text-white">
              {form.ctaSecondaryText}
            </span>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className="space-y-2">
      {/* Dual-aspect preview — Desktop 16:9 (left) + Mobile 16:9 (right) share same animation */}
      <div className="grid grid-cols-[3fr_1fr] gap-2">
        {/* Desktop 16:9 */}
        <div className="border-border bg-muted relative aspect-[16/9] overflow-hidden rounded-xl border">
          <div className="bg-primary/10 text-primary pointer-events-none absolute left-2 top-2 z-20 rounded-full px-2 py-0.5 text-[9px] font-bold">Desktop 16:9 • 1920×1080</div>
          <AnimatePresence mode={isDirectional ? 'popLayout' : 'wait'} initial={false}>
            <motion.div key={slideKey} initial={previewVariants.initial} animate={previewVariants.animate} exit={previewVariants.exit} transition={transition} className="absolute inset-0" style={{ willChange: 'transform, opacity' }}>
              <SlideContent />
            </motion.div>
          </AnimatePresence>
        </div>
        {/* Mobile 16:9 */}
        <div className="border-border bg-muted relative aspect-[16/9] overflow-hidden rounded-xl border">
          <div className="bg-amber-500/10 text-amber-600 pointer-events-none absolute left-2 top-2 z-20 rounded-full px-2 py-0.5 text-[9px] font-bold">Mobile 16:9</div>
          <AnimatePresence mode={isDirectional ? 'popLayout' : 'wait'} initial={false}>
            <motion.div key={slideKey} initial={previewVariants.initial} animate={previewVariants.animate} exit={previewVariants.exit} transition={transition} className="absolute inset-0" style={{ willChange: 'transform, opacity' }}>
              <SlideContent className="px-4 text-[0.65rem]" />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      {/* Animation hint */}
      <div className="bg-background/80 pointer-events-none inline-block rounded-full px-2 py-0.5 text-[9px] font-medium backdrop-blur-sm">
        {ANIMATIONS.find((a) => a.value === form.animation)?.label} · {form.animationDuration}ms
        {!form.overlayColor && ' · No overlay'}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════ */

export default function AdminHeroPage() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [langTab, setLangTab] = useState<TabLang>('en');
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<
    { id: string; name: string; image: string; price: number }[]
  >([]);
  const [, setSearchingProducts] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchSlides = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: HeroSlide[] }>('/api/admin/hero-slides');
      setSlides(res.data);
    } catch {
      toast.error('Failed to load slides');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSlides();
  }, [fetchSlides]);

  /* ── Product search ── */
  useEffect(() => {
    if (productSearch.length < 2) {
      setProductResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingProducts(true);
      try {
        const res = await api.get<{
          success: boolean;
          data: { id: string; name: string; image: string; price: number }[];
        }>(`/api/products?search=${encodeURIComponent(productSearch)}&limit=6`);
        setProductResults(res.data ?? []);
      } catch {
        /* ignore */
      } finally {
        setSearchingProducts(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [productSearch]);

  /* ── DnD reorder ── */
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSlides((items) => {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      const reordered = arrayMove(items, oldIndex, newIndex);
      // Only update slides whose sort order actually changed
      reordered.forEach((s, i) => {
        if (s.sortOrder !== i) {
          api.patch(`/api/admin/hero-slides/${s.id}/sort`, { sortOrder: i }).catch(() => {});
        }
      });
      return reordered;
    });
  }, []);

  /* ── Panel open/close ── */
  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setLangTab('en');
    setPanelOpen(true);
  };

  const openEdit = (slide: HeroSlide) => {
    setEditingId(slide.id);

    // Strip literal snake_case column-name strings that were stored as values by a previous bug
    const KNOWN_COL_NAMES = new Set([
      'title_bn',
      'subtitle_bn',
      'description_bn',
      'cta_text_bn',
      'cta_secondary_text_bn',
      'badge_bn',
      'product_id',
      'title_font_size',
      'subtitle_font_size',
      'animation',
      'show_trust_badges',
      'show_title',
      'show_subtitle',
      'overlay_color',
      'text_align',
      'text_color',
      'badge_variant',
      'sort_order',
      'is_active',
      'created_at',
      'updated_at',
      'cta_link',
      'cta_secondary_link',
    ]);
    const cleanStr = (v: string | null | undefined): string => {
      if (v == null) return '';
      const t = v.trim();
      return t === '' || KNOWN_COL_NAMES.has(t.toLowerCase()) ? '' : t;
    };

    // Sanitize enum values that may have placeholder strings from seed data
    const validTitleSizes: FontSize[] = ['sm', 'md', 'lg', 'xl'];
    const validSubtitleSizes: FontSize[] = ['sm', 'md', 'lg', 'xl'];
    const validAnimations: AnimationType[] = [
      'fade',
      'top-to-bottom',
      'bottom-to-top',
      'left-to-right',
      'right-to-left',
      'scale-up',
      'zoom-out',
      'parallax',
    ];
    const validBadgeVariants: BadgeVariant[] = ['default', 'secondary', 'destructive', 'outline'];
    const validAligns = ['left', 'center', 'right'];

    const rawProductId = cleanStr(slide.productId);
    const isValidProduct =
      rawProductId && !rawProductId.startsWith('product') && rawProductId !== 'product_id';

    setForm({
      title: slide.title,
      titleBn: cleanStr(slide.titleBn),
      subtitle: cleanStr(slide.subtitle),
      subtitleBn: cleanStr(slide.subtitleBn),
      description: cleanStr(slide.description),
      descriptionBn: cleanStr(slide.descriptionBn),
      image: slide.image,
      backgroundImage: cleanStr(slide.backgroundImage),
      mobileBackgroundImage: cleanStr(slide.mobileBackgroundImage),
      ctaText: cleanStr(slide.ctaText),
      ctaTextBn: cleanStr(slide.ctaTextBn),
      ctaLink: cleanStr(slide.ctaLink),
      ctaSecondaryText: cleanStr(slide.ctaSecondaryText),
      ctaSecondaryTextBn: cleanStr(slide.ctaSecondaryTextBn),
      ctaSecondaryLink: cleanStr(slide.ctaSecondaryLink),
      overlayColor: slide.overlayColor || 'from-black/60 to-transparent',
      textAlign: validAligns.includes(slide.textAlign) ? slide.textAlign : 'left',
      textColor: slide.textColor || '#ffffff',
      badge: cleanStr(slide.badge),
      badgeBn: cleanStr(slide.badgeBn),
      badgeVariant: validBadgeVariants.includes(slide.badgeVariant as BadgeVariant)
        ? (slide.badgeVariant as BadgeVariant)
        : 'default',
      animation: validAnimations.includes(slide.animation as AnimationType)
        ? (slide.animation as AnimationType)
        : 'fade',
      animationDuration: slide.animationDuration ?? 700,
      titleFontSize: validTitleSizes.includes(slide.titleFontSize as FontSize)
        ? (slide.titleFontSize as FontSize)
        : 'lg',
      subtitleFontSize: validSubtitleSizes.includes(slide.subtitleFontSize as FontSize)
        ? (slide.subtitleFontSize as FontSize)
        : 'md',
      productId: isValidProduct ? rawProductId : '',
      showTrustBadges: slide.showTrustBadges,
      showTitle: slide.showTitle ?? true,
      showSubtitle: slide.showSubtitle ?? true,
      sortOrder: slide.sortOrder,
      isActive: slide.isActive,
    });
    setLangTab('en');
    setPanelOpen(true);
  };

  /* ── Save ── */
  const handleSave = async () => {
    setSaving(true);
    try {
      // Sanitize enum values before sending to API
      const validTitleSizes: FontSize[] = ['sm', 'md', 'lg', 'xl'];
      const validSubtitleSizes: FontSize[] = ['sm', 'md', 'lg', 'xl'];
      const validAnimations: AnimationType[] = [
        'fade',
        'top-to-bottom',
        'bottom-to-top',
        'left-to-right',
        'right-to-left',
        'scale-up',
        'zoom-out',
        'parallax',
      ];
      const validBadgeVariants: BadgeVariant[] = ['default', 'secondary', 'destructive', 'outline'];
      const validAligns = ['left', 'center', 'right'];
      // Known column-name strings that were erroneously stored as values
      const KNOWN_COL_NAMES = new Set([
        'title_bn',
        'subtitle_bn',
        'description_bn',
        'cta_text_bn',
        'cta_secondary_text_bn',
        'badge_bn',
        'product_id',
        'title_font_size',
        'subtitle_font_size',
        'animation',
        'show_trust_badges',
        'show_title',
        'show_subtitle',
        'overlay_color',
        'text_align',
        'text_color',
        'badge_variant',
      ]);
      const safeStr = (v: string | null | undefined): string | null => {
        if (v == null) return null;
        const t = v.trim();
        return t === '' || KNOWN_COL_NAMES.has(t.toLowerCase()) ? null : t;
      };

      const payload = {
        title: form.title,
        titleBn: safeStr(form.titleBn),
        subtitle: safeStr(form.subtitle),
        subtitleBn: safeStr(form.subtitleBn),
        description: safeStr(form.description),
        descriptionBn: safeStr(form.descriptionBn),
        image: form.image,
        backgroundImage: safeStr(form.backgroundImage),
        mobileBackgroundImage: safeStr(form.mobileBackgroundImage),
        ctaText: safeStr(form.ctaText),
        ctaTextBn: safeStr(form.ctaTextBn),
        ctaLink: safeStr(form.ctaLink),
        ctaSecondaryText: safeStr(form.ctaSecondaryText),
        ctaSecondaryTextBn: safeStr(form.ctaSecondaryTextBn),
        ctaSecondaryLink: safeStr(form.ctaSecondaryLink),
        overlayColor: form.overlayColor || '',
        textAlign: validAligns.includes(form.textAlign) ? form.textAlign : 'left',
        textColor: form.textColor || '#ffffff',
        badge: safeStr(form.badge),
        badgeBn: safeStr(form.badgeBn),
        badgeVariant: validBadgeVariants.includes(form.badgeVariant)
          ? form.badgeVariant
          : 'default',
        animation: validAnimations.includes(form.animation) ? form.animation : 'fade',
        animationDuration: Math.min(3000, Math.max(200, form.animationDuration || 700)),
        titleFontSize: validTitleSizes.includes(form.titleFontSize) ? form.titleFontSize : 'lg',
        subtitleFontSize: validSubtitleSizes.includes(form.subtitleFontSize)
          ? form.subtitleFontSize
          : 'md',
        productId: safeStr(form.productId),
        showTrustBadges: form.showTrustBadges,
        showTitle: form.showTitle,
        showSubtitle: form.showSubtitle,
        sortOrder: form.sortOrder,
        isActive: form.isActive,
      };
      if (editingId) {
        await api.put(`/api/admin/hero-slides/${editingId}`, payload);
        toast.success('Slide updated');
      } else {
        await api.post('/api/admin/hero-slides', { ...payload, sortOrder: slides.length });
        toast.success('Slide created');
      }
      setPanelOpen(false);
      fetchSlides();
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (slide: HeroSlide) => {
    try {
      const newActive = !slide.isActive;
      await api.put(`/api/admin/hero-slides/${slide.id}`, { isActive: newActive });
      toast.success(newActive ? 'Slide activated' : 'Slide hidden');
      fetchSlides();
    } catch (err) {
      toast.error(`Failed to toggle: ${(err as Error).message}`);
    }
  };

  const deleteSlide = async (id: string) => {
    if (!confirm('Delete this slide?')) return;
    try {
      await api.delete(`/api/admin/hero-slides/${id}`);
      toast.success('Slide deleted');
      fetchSlides();
    } catch (err) {
      toast.error(`Failed to delete: ${(err as Error).message}`);
    }
  };

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading-xl font-bold">Hero Slides</h1>
          <p className="text-body-sm text-muted-foreground mt-0.5">
            {slides.length} slides · Drag to reorder
          </p>
        </div>
        <PremiumButton
          variant="primary"
          size="sm"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={openNew}
        >
          Add Slide
        </PremiumButton>
      </div>

      {/* Slide Grid — Drag & Drop */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : slides.length === 0 ? (
        <div className="border-border flex flex-col items-center rounded-xl border border-dashed py-16 text-center">
          <ImageIcon className="text-muted-foreground/30 h-10 w-10" />
          <p className="text-muted-foreground mt-3 text-sm font-medium">No hero slides yet</p>
          <PremiumButton
            variant="outline"
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={openNew}
            className="mt-4"
          >
            Create First Slide
          </PremiumButton>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={slides.map((s) => s.id)} strategy={rectSortingStrategy}>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {slides.map((slide, index) => (
                <SortableSlideCard
                  key={slide.id}
                  slide={slide}
                  index={index}
                  total={slides.length}
                  onEdit={openEdit}
                  onToggle={toggleActive}
                  onDelete={deleteSlide}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* ═══ Editor Panel ═══ */}
      <Sheet
        open={panelOpen}
        onOpenChange={(o) => {
          if (!o) setPanelOpen(false);
        }}
      >
        <SheetContent
          side="right"
          showCloseButton={false}
          className="flex w-[70vw] max-w-[70vw] flex-col p-0 sm:max-w-[70vw] [&>button]:hidden"
        >
          <SheetHeader className="relative overflow-hidden border-b bg-gradient-to-br from-primary/10 via-primary/5 to-background px-6 py-5">
            <div className="bg-primary/10 pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full blur-2xl" />
            <div className="bg-primary/5 pointer-events-none absolute -left-4 -bottom-4 h-16 w-16 rounded-full blur-xl" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-primary text-primary-foreground flex h-9 w-9 items-center justify-center rounded-xl shadow-sm">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <SheetTitle className="text-base font-bold leading-none">
                    {editingId ? 'Edit Slide' : 'New Hero Slide'}
                  </SheetTitle>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {editingId ? 'Update slide content & motion' : 'Design a new hero experience'}
                  </p>
                </div>
              </div>
              <SheetClose asChild>
                <button className="bg-card border-border hover:bg-muted flex h-8 w-8 items-center justify-center rounded-full border shadow-sm">
                  <X className="h-4 w-4" />
                </button>
              </SheetClose>
            </div>
          </SheetHeader>

          <div className="bg-muted/20 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            {/* Live Preview */}
            <LivePreview form={form} />

            {/* Language Tabs — pill with subtle shadow */}
            <div className="border-border bg-card flex items-center gap-1 rounded-xl border p-1 shadow-sm">
              <button
                onClick={() => setLangTab('en')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all',
                  langTab === 'en'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Globe className="h-3 w-3" /> English
              </button>
              <button
                onClick={() => setLangTab('bn')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all',
                  langTab === 'bn'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Globe className="h-3 w-3" /> বাংলা
              </button>
            </div>

            {/* Images — compact with aspect badges */}
            <div className="rounded-xl border border-border bg-card p-3">
              <div className="mb-2 flex items-center gap-2">
                <div className="bg-primary/10 text-primary flex h-7 w-7 items-center justify-center rounded-lg">
                  <ImageIcon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">Media</p>
                  <p className="text-muted-foreground text-[10px] leading-none">Backgrounds + foreground image</p>
                </div>
                <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-medium">3 slots</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <SingleImageUploader
                    value={form.image}
                    onChange={(url) => setField('image', url)}
                    label="Hero Image"
                    heightClass="aspect-[4/3]"
                    folder="hero"
                  />
                  <div className="flex items-center justify-center gap-1">
                    <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[9px] font-medium">4:3</span>
                    <span className="text-muted-foreground text-[9px]">800×600</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <SingleImageUploader
                    value={form.backgroundImage}
                    onChange={(url) => setField('backgroundImage', url)}
                    label="Desktop BG"
                    heightClass="aspect-[16/9]"
                    folder="hero"
                    unoptimized
                  />
                  <div className="flex items-center justify-center gap-1">
                    <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5 text-[9px] font-bold">16:9</span>
                    <span className="text-muted-foreground text-[9px]">1920×1080</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <SingleImageUploader
                    value={form.mobileBackgroundImage}
                    onChange={(url) => setField('mobileBackgroundImage', url)}
                    label="Mobile BG"
                    heightClass="aspect-[3/4]"
                    folder="hero"
                    unoptimized
                  />
                  <div className="flex items-center justify-center gap-1">
                    <span className="bg-amber-500/10 text-amber-600 rounded px-1.5 py-0.5 text-[9px] font-bold">3:4</span>
                    <span className="text-muted-foreground text-[9px]">750×1000</span>
                  </div>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-500/5 px-2.5 py-1.5">
                <span className="bg-amber-500 h-1.5 w-1.5 animate-pulse rounded-full" />
                <p className="text-muted-foreground text-[10px] leading-none">
                  Mobile BG falls back to Desktop BG if empty • All backgrounds animate together with text
                </p>
              </div>
            </div>

            {/* ── Content — bilingual ── */}
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="bg-violet-500/10 text-violet-600 flex h-7 w-7 items-center justify-center rounded-lg">
                  <Type className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Content</p>
                  <p className="text-muted-foreground text-[10px]">Titles, subtitles & CTAs — {langTab === 'en' ? 'English' : 'বাংলা'}</p>
                </div>
              </div>
            {langTab === 'en' ? (
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label className="flex items-center gap-1.5">
                    <Type className="h-3.5 w-3.5" /> Title (English)
                  </Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setField('title', e.target.value)}
                    placeholder="The Latest Tech, Delivered"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Subtitle (English)</Label>
                  <Input
                    value={form.subtitle}
                    onChange={(e) => setField('subtitle', e.target.value)}
                    placeholder="Discover premium electronics"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Description (English)</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setField('description', e.target.value)}
                    rows={2}
                    placeholder="Optional longer description..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="flex items-center gap-1.5">
                      <Link2 className="h-3.5 w-3.5" /> CTA Text
                    </Label>
                    <Input
                      value={form.ctaText}
                      onChange={(e) => setField('ctaText', e.target.value)}
                      placeholder="Shop Now"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>CTA Link</Label>
                    <Input
                      value={form.ctaLink}
                      onChange={(e) => setField('ctaLink', e.target.value)}
                      placeholder="/products"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Secondary CTA</Label>
                    <Input
                      value={form.ctaSecondaryText}
                      onChange={(e) => setField('ctaSecondaryText', e.target.value)}
                      placeholder="Learn More"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Secondary Link</Label>
                    <Input
                      value={form.ctaSecondaryLink}
                      onChange={(e) => setField('ctaSecondaryLink', e.target.value)}
                      placeholder="/about"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Badge Text</Label>
                    <Input
                      value={form.badge}
                      onChange={(e) => setField('badge', e.target.value)}
                      placeholder="New Arrivals"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Badge Style</Label>
                    <select
                      value={form.badgeVariant}
                      onChange={(e) => setField('badgeVariant', e.target.value as BadgeVariant)}
                      className="border-input bg-background flex h-10 w-full rounded-lg border px-3 py-2 text-sm"
                    >
                      <option value="default">Default</option>
                      <option value="secondary">Secondary</option>
                      <option value="destructive">Sale</option>
                      <option value="outline">Outline</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label className="flex items-center gap-1.5">
                    <Type className="h-3.5 w-3.5" /> শিরোনাম (বাংলা)
                  </Label>
                  <Input
                    value={form.titleBn}
                    onChange={(e) => setField('titleBn', e.target.value)}
                    placeholder="সর্বশেষ প্রযুক্তি, আপনার দোরগোড়ায়"
                  />
                </div>
                <div className="space-y-1">
                  <Label>উপশিরোনাম (বাংলা)</Label>
                  <Input
                    value={form.subtitleBn}
                    onChange={(e) => setField('subtitleBn', e.target.value)}
                    placeholder="প্রিমিয়াম ইলেকট্রনিক্স আবিষ্কার করুন"
                  />
                </div>
                <div className="space-y-1">
                  <Label>বিবরণ (বাংলা)</Label>
                  <Textarea
                    value={form.descriptionBn}
                    onChange={(e) => setField('descriptionBn', e.target.value)}
                    rows={2}
                    placeholder="ঐচ্ছিক বিস্তারিত বিবরণ..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="flex items-center gap-1.5">
                      <Link2 className="h-3.5 w-3.5" /> CTA পাঠ্য
                    </Label>
                    <Input
                      value={form.ctaTextBn}
                      onChange={(e) => setField('ctaTextBn', e.target.value)}
                      placeholder="এখনই কিনুন"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Secondary CTA</Label>
                    <Input
                      value={form.ctaSecondaryTextBn}
                      onChange={(e) => setField('ctaSecondaryTextBn', e.target.value)}
                      placeholder="আরও জানুন"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>ব্যাজ পাঠ্য (বাংলা)</Label>
                  <Input
                    value={form.badgeBn}
                    onChange={(e) => setField('badgeBn', e.target.value)}
                    placeholder="নতুন আগমন"
                  />
                </div>
              </div>
            )}
            </div>

            {/* ── Animation Picker — premium ── */}
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="bg-amber-500/10 text-amber-600 flex h-7 w-7 items-center justify-center rounded-lg">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Motion</p>
                  <p className="text-muted-foreground text-[10px]">Direction slides are pure translation — no fade, one by one</p>
                </div>
              </div>
              <p className="text-muted-foreground mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5" /> Transition Animation
              </p>
              <div className="grid grid-cols-4 gap-2">
                {ANIMATIONS.map((anim) => (
                  <button
                    key={anim.value}
                    onClick={() => setField('animation', anim.value)}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-lg border p-2.5 text-center transition-all',
                      form.animation === anim.value
                        ? 'border-primary bg-primary/5 text-primary ring-primary/20 ring-1'
                        : 'border-border hover:border-muted-foreground/30 text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <span className="text-lg">{anim.icon}</span>
                    <span className="text-[10px] font-medium leading-tight">{anim.label}</span>
                  </button>
                ))}
              </div>
              {/* Duration slider */}
              <div className="mt-3 flex items-center gap-3">
                <Label className="whitespace-nowrap text-xs">Duration</Label>
                <input
                  type="range"
                  min={200}
                  max={3000}
                  step={100}
                  value={form.animationDuration}
                  onChange={(e) => setField('animationDuration', Number(e.target.value))}
                  className="bg-muted accent-primary h-1.5 flex-1 cursor-pointer appearance-none rounded-full"
                />
                <span className="text-muted-foreground w-12 text-right font-mono text-xs">
                  {form.animationDuration}ms
                </span>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="bg-sky-500/10 text-sky-600 flex h-7 w-7 items-center justify-center rounded-lg">
                  <Type className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Typography</p>
                  <p className="text-muted-foreground text-[10px]">Scale for title & subtitle</p>
                </div>
              </div>
              <p className="text-muted-foreground mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
                <Type className="h-3.5 w-3.5" /> Typography
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Title Size</Label>
                  <div className="flex gap-1">
                    {(['sm', 'md', 'lg', 'xl'] as const).map((size) => (
                      <button
                        key={size}
                        onClick={() => setField('titleFontSize', size)}
                        className={cn(
                          'flex-1 rounded-md border px-2 py-1.5 text-[10px] font-medium uppercase transition-colors',
                          form.titleFontSize === size
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-border text-muted-foreground hover:border-muted-foreground/30'
                        )}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Subtitle Size</Label>
                  <div className="flex gap-1">
                    {(['sm', 'md', 'lg', 'xl'] as const).map((size) => (
                      <button
                        key={size}
                        onClick={() => setField('subtitleFontSize', size)}
                        className={cn(
                          'flex-1 rounded-md border px-2 py-1.5 text-[10px] font-medium uppercase transition-colors',
                          form.subtitleFontSize === size
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-border text-muted-foreground hover:border-muted-foreground/30'
                        )}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Layout & Appearance ── */}
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="bg-emerald-500/10 text-emerald-600 flex h-7 w-7 items-center justify-center rounded-lg">
                  <Palette className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Layout & Appearance</p>
                  <p className="text-muted-foreground text-[10px]">Alignment, colors & overlay</p>
                </div>
              </div>
              <p className="text-muted-foreground mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
                <Palette className="h-3.5 w-3.5" /> Layout & Appearance
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label>Text Align</Label>
                  <select
                    value={form.textAlign}
                    onChange={(e) => setField('textAlign', e.target.value)}
                    className="border-input bg-background flex h-10 w-full rounded-lg border px-3 py-2 text-sm"
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Text Color</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={form.textColor}
                      onChange={(e) => setField('textColor', e.target.value)}
                      className="border-input h-10 w-10 cursor-pointer rounded-lg border"
                    />
                    <Input
                      value={form.textColor}
                      onChange={(e) => setField('textColor', e.target.value)}
                      className="flex-1 font-mono text-xs"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Overlay</Label>
                  <select
                    value={form.overlayColor}
                    onChange={(e) => setField('overlayColor', e.target.value)}
                    className="border-input bg-background flex h-10 w-full rounded-lg border px-3 py-2 text-sm"
                  >
                    {OVERLAY_PRESETS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* ── Product Link ── */}
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="bg-indigo-500/10 text-indigo-600 flex h-7 w-7 items-center justify-center rounded-lg">
                  <Link2 className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Linked Product</p>
                  <p className="text-muted-foreground text-[10px]">Optional • Click “Shop Now” goes to product</p>
                </div>
              </div>
              <p className="text-muted-foreground mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
                <Link2 className="h-3.5 w-3.5" /> Link Product (Optional)
              </p>
              <Input
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search product to link..."
                className="text-sm"
              />
              {productResults.length > 0 && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {productResults.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setField('productId', p.id);
                        setProductSearch(p.name);
                        setProductResults([]);
                      }}
                      className={cn(
                        'flex items-center gap-2 rounded-lg border p-2 text-left transition-all',
                        form.productId === p.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-muted-foreground/30'
                      )}
                    >
                      <div className="bg-muted relative h-8 w-8 shrink-0 overflow-hidden rounded">
                        <Image
                          src={p.image}
                          alt={p.name}
                          fill
                          sizes="32px"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium">{p.name}</p>
                        <p className="text-muted-foreground text-[10px]">৳{p.price}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {form.productId && (
                <div className="border-primary/20 bg-primary/5 mt-2 flex items-center gap-2 rounded-lg border px-3 py-2">
                  <span className="text-primary text-xs font-medium">Product linked</span>
                  <button
                    onClick={() => {
                      setField('productId', '');
                      setProductSearch('');
                    }}
                    className="text-muted-foreground hover:text-destructive ml-auto"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* ── Options ── */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="bg-slate-500/10 text-slate-600 flex h-7 w-7 items-center justify-center rounded-lg">
                  <Settings className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Options</p>
                  <p className="text-muted-foreground text-[10px]">Visibility & display toggles</p>
                </div>
              </div>
              <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
                <Settings className="h-3.5 w-3.5" /> Options
              </p>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setField('isActive', e.target.checked)}
                    className="border-border rounded"
                  />
                  Active
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.showTitle}
                    onChange={(e) => setField('showTitle', e.target.checked)}
                    className="border-border rounded"
                  />
                  Show Title
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.showSubtitle}
                    onChange={(e) => setField('showSubtitle', e.target.checked)}
                    className="border-border rounded"
                  />
                  Show Subtitle
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.showTrustBadges}
                    onChange={(e) => setField('showTrustBadges', e.target.checked)}
                    className="border-border rounded"
                  />
                  Trust Badges
                </label>
              </div>
            </div>
          </div>

          <SheetFooter className="border-border border-t px-6 py-4">
            <div className="flex w-full items-center justify-between gap-3">
              <Button variant="outline" onClick={() => setPanelOpen(false)}>
                Cancel
              </Button>
              <PremiumButton
                variant="primary"
                onClick={handleSave}
                disabled={saving}
                className="w-full sm:w-auto"
              >
                {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Slide'}
              </PremiumButton>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
