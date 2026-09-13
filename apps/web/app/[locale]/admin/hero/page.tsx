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
import { AnimatePresence, motion, type TargetAndTransition, type Transition } from 'framer-motion';
import {
  GripVertical,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  ImageIcon,
  Settings,
  X,
  Sparkles,
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
import { Button } from '@/components/ui/button';
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
import { api } from '@/lib/api-client';
import { cn } from '@/lib/utils';

/* ═══════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════ */

type AnimationType =
  | 'fade'
  | 'top-to-bottom'
  | 'bottom-to-top'
  | 'left-to-right'
  | 'right-to-left'
  | 'scale-up'
  | 'zoom-out'
  | 'parallax';

/**
 * A hero slide is imagery only — the storefront renders no copy over it.
 * `image` is the legacy single-image column, still read for older slides that
 * stored their asset there instead of in one of the background columns.
 */
type HeroSlide = {
  id: string;
  image: string;
  backgroundImage: string | null;
  mobileBackgroundImage: string | null;
  animation: AnimationType;
  animationDuration: number;
  sortOrder: number;
  isActive: boolean;
};

type FormState = {
  image: string;
  backgroundImage: string;
  mobileBackgroundImage: string;
  animation: AnimationType;
  animationDuration: number;
  isActive: boolean;
};

/** Desktop asset wins, mobile falls back to it — mirrors the storefront. */
function desktopImage(slide: {
  backgroundImage: string | null;
  image: string;
}): string {
  return slide.backgroundImage || slide.image;
}

/* ═══════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════ */

const emptyForm: FormState = {
  image: '',
  backgroundImage: '',
  mobileBackgroundImage: '',
  animation: 'fade',
  animationDuration: 900,
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
    desc: 'Pushes down from the top',
  },
  {
    value: 'bottom-to-top',
    label: 'Slide Up',
    icon: <ArrowUp className="h-4 w-4" />,
    desc: 'Pushes up from the bottom',
  },
  {
    value: 'left-to-right',
    label: 'Slide Right',
    icon: <ArrowRight className="h-4 w-4" />,
    desc: 'Pushes right from the left',
  },
  {
    value: 'right-to-left',
    label: 'Slide Left',
    icon: <ArrowLeft className="h-4 w-4" />,
    desc: 'Pushes left from the right',
  },
  {
    value: 'scale-up',
    label: 'Scale Up',
    icon: <ZoomIn className="h-4 w-4" />,
    desc: 'Grows into place',
  },
  {
    value: 'zoom-out',
    label: 'Zoom Out',
    icon: <ZoomOut className="h-4 w-4" />,
    desc: 'Settles back from a zoom',
  },
  {
    value: 'parallax',
    label: 'Parallax',
    icon: <Layers className="h-4 w-4" />,
    desc: 'Subtle vertical drift',
  },
];

const VALID_ANIMATIONS: AnimationType[] = [
  'fade',
  'top-to-bottom',
  'bottom-to-top',
  'left-to-right',
  'right-to-left',
  'scale-up',
  'zoom-out',
  'parallax',
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

  const image = desktopImage(slide);

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
        {image ? (
          <Image src={image} alt="" fill sizes="288px" className="object-cover" />
        ) : (
          <div className="from-primary/10 to-primary/5 absolute inset-0 bg-gradient-to-br" />
        )}
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
          <p className="text-muted-foreground max-w-[160px] truncate text-xs">
            {image ? image.split('/').pop() : 'No image'}
          </p>
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

type PreviewVariants = {
  initial: TargetAndTransition;
  animate: TargetAndTransition;
  exit: TargetAndTransition;
};

/** One aspect-ratio preview frame — module scope so it isn't recreated per render. */
function PreviewFrame({
  src,
  badge,
  variants,
  transition,
  isDirectional,
  slideKey,
}: {
  src: string;
  badge: string;
  variants: PreviewVariants;
  transition: Transition;
  isDirectional: boolean;
  slideKey: string;
}) {
  return (
    <div className="border-border bg-muted relative aspect-[16/9] overflow-hidden rounded-xl border">
      <div className="bg-background/80 pointer-events-none absolute left-2 top-2 z-20 rounded-full px-2 py-0.5 text-[9px] font-bold backdrop-blur-sm">
        {badge}
      </div>
      <AnimatePresence mode={isDirectional ? 'popLayout' : 'wait'} initial={false}>
        <motion.div
          key={slideKey}
          initial={variants.initial}
          animate={variants.animate}
          exit={variants.exit}
          transition={transition}
          className="absolute inset-0"
          style={{ willChange: 'transform, opacity' }}
        >
          {src ? (
            <Image src={src} alt="" fill sizes="600px" className="object-cover" />
          ) : (
            <div className="from-primary/10 to-primary/5 absolute inset-0 bg-gradient-to-br" />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function LivePreview({ form }: { form: FormState }) {
  const EASING = [0.22, 1, 0.36, 1] as const;
  const isDirectional = [
    'top-to-bottom',
    'bottom-to-top',
    'left-to-right',
    'right-to-left',
  ].includes(form.animation);

  const variants: PreviewVariants = (() => {
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
        return {
          initial: { scale: 0.9, opacity: 0 },
          animate: { scale: 1, opacity: 1 },
          exit: { scale: 1.05, opacity: 0 },
        };
      case 'zoom-out':
        return {
          initial: { scale: 1.15, opacity: 0 },
          animate: { scale: 1, opacity: 1 },
          exit: { scale: 0.95, opacity: 0 },
        };
      case 'parallax':
        return {
          initial: { y: '-8%', opacity: 0 },
          animate: { y: '0%', opacity: 1 },
          exit: { y: '8%', opacity: 0 },
        };
      case 'fade':
      default:
        return { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };
    }
  })();

  const transition = { duration: (form.animationDuration || 900) / 1000, ease: EASING };
  const desktop = desktopImage(form);
  const mobile = form.mobileBackgroundImage || desktop;
  const slideKey = `${form.animation}-${form.animationDuration}-${desktop}-${mobile}`;
  const frameProps = { variants, transition, isDirectional, slideKey };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[3fr_1fr] gap-2">
        <PreviewFrame src={desktop} badge="Desktop 16:9" {...frameProps} />
        <PreviewFrame src={mobile} badge="Mobile" {...frameProps} />
      </div>
      <div className="bg-background/80 pointer-events-none inline-block rounded-full px-2 py-0.5 text-[9px] font-medium backdrop-blur-sm">
        {ANIMATIONS.find((a) => a.value === form.animation)?.label} · {form.animationDuration}ms
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
    setPanelOpen(true);
  };

  const openEdit = (slide: HeroSlide) => {
    setEditingId(slide.id);
    setForm({
      image: slide.image ?? '',
      backgroundImage: slide.backgroundImage ?? '',
      mobileBackgroundImage: slide.mobileBackgroundImage ?? '',
      animation: VALID_ANIMATIONS.includes(slide.animation) ? slide.animation : 'fade',
      animationDuration: slide.animationDuration ?? 900,
      isActive: slide.isActive,
    });
    setPanelOpen(true);
  };

  /* ── Save ── */
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        image: form.image,
        backgroundImage: form.backgroundImage || null,
        mobileBackgroundImage: form.mobileBackgroundImage || null,
        animation: VALID_ANIMATIONS.includes(form.animation) ? form.animation : 'fade',
        animationDuration: Math.min(3000, Math.max(200, form.animationDuration || 900)),
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
          className="flex w-full flex-col p-0 sm:max-w-2xl [&>button]:hidden"
        >
          <SheetHeader className="relative overflow-hidden border-b bg-gradient-to-br from-primary/10 via-primary/5 to-background px-6 py-5">
            <div className="bg-primary/10 pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full blur-2xl" />
            <div className="bg-primary/5 pointer-events-none absolute -bottom-4 -left-4 h-16 w-16 rounded-full blur-xl" />
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
                    {editingId ? 'Update imagery & motion' : 'Add a full-screen hero image'}
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

            {/* Images — the only content a slide has */}
            <div className="border-border bg-card rounded-xl border p-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="bg-primary/10 text-primary flex h-7 w-7 items-center justify-center rounded-lg">
                  <ImageIcon className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Images</p>
                  <p className="text-muted-foreground text-[10px]">
                    Shown full-screen edge to edge — no text is rendered over them
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <SingleImageUploader
                    value={form.backgroundImage}
                    onChange={(url) => setField('backgroundImage', url)}
                    label="Desktop"
                    heightClass="aspect-[16/9]"
                    folder="hero"
                    unoptimized
                  />
                  <div className="flex items-center justify-center gap-1">
                    <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5 text-[9px] font-bold">
                      16:9
                    </span>
                    <span className="text-muted-foreground text-[9px]">1920×1080</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <SingleImageUploader
                    value={form.mobileBackgroundImage}
                    onChange={(url) => setField('mobileBackgroundImage', url)}
                    label="Mobile"
                    heightClass="aspect-[3/4]"
                    folder="hero"
                    unoptimized
                  />
                  <div className="flex items-center justify-center gap-1">
                    <span className="bg-amber-500/10 text-amber-600 rounded px-1.5 py-0.5 text-[9px] font-bold">
                      3:4
                    </span>
                    <span className="text-muted-foreground text-[9px]">750×1000</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <SingleImageUploader
                    value={form.image}
                    onChange={(url) => setField('image', url)}
                    label="Fallback"
                    heightClass="aspect-[4/3]"
                    folder="hero"
                  />
                  <div className="flex items-center justify-center gap-1">
                    <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[9px] font-medium">
                      4:3
                    </span>
                    <span className="text-muted-foreground text-[9px]">800×600</span>
                  </div>
                </div>
              </div>
              <div className="bg-muted/50 mt-3 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5">
                <span className="bg-primary h-1.5 w-1.5 rounded-full" />
                <p className="text-muted-foreground text-[10px] leading-none">
                  Desktop is used on large screens · Mobile falls back to Desktop when empty ·
                  Fallback is used when both are empty
                </p>
              </div>
            </div>

            {/* ── Motion ── */}
            <div className="border-border bg-card rounded-xl border p-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="bg-amber-500/10 text-amber-600 flex h-7 w-7 items-center justify-center rounded-lg">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Motion</p>
                  <p className="text-muted-foreground text-[10px]">
                    How each image transitions to the next
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {ANIMATIONS.map((anim) => (
                  <button
                    key={anim.value}
                    onClick={() => setField('animation', anim.value)}
                    title={anim.desc}
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

            {/* ── Options ── */}
            <div className="border-border bg-card space-y-3 rounded-xl border p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-500/10 text-slate-600">
                  <Settings className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Options</p>
                  <p className="text-muted-foreground text-[10px]">Visibility</p>
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setField('isActive', e.target.checked)}
                  className="border-border rounded"
                />
                Active
              </label>
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
