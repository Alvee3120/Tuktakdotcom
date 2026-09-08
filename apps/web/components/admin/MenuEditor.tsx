'use client';

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Link as LinkIcon,
  FolderOpen,
  FolderTree,
  Plus,
  Trash2,
  ExternalLink,
  X,
  Check,
} from 'lucide-react';
import { useCallback, useState } from 'react';

import { SingleImageUploader } from '@/components/dashboard/ImageUploader';
import { SocialIcon } from '@/components/shared/SocialIcon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ICON_MAP, ALL_ICON_NAMES } from '@/lib/icon-map';
import {
  createMenuItemId,
  type MenuItem,
  type FooterColumn,
  type FooterSocialItem,
  type FooterPaymentItem,
  SOCIAL_PLATFORMS,
} from '@/lib/menu-config';
import { cn } from '@/lib/utils';

/* ──────────── Icons for picker ──────────── */
const ICON_OPTIONS = [
  { name: '', label: 'None' },
  ...ALL_ICON_NAMES.map((n) => ({ name: n, label: n })),
];

/* ──────────── Inline Add / Edit Form ──────────── */
type FormMode = { mode: 'add' } | { mode: 'edit'; item: MenuItem };

function MenuItemForm({
  form,
  onConfirm,
  onCancel,
  categoryOptions,
}: {
  form: FormMode;
  onConfirm: (item: MenuItem) => void;
  onCancel: () => void;
  categoryOptions: Array<{ id: string; name: string; slug: string }>;
}) {
  const existing = form.mode === 'edit' ? form.item : null;
  const [type, setType] = useState<MenuItem['type']>(existing?.type ?? 'link');
  const [label, setLabel] = useState(existing?.label ?? '');
  const [labelBn, setLabelBn] = useState(existing?.labelBn ?? '');
  const [href, setHref] = useState(existing?.href ?? '');
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? '');
  const [icon, setIcon] = useState(existing?.icon ?? '');
  const [openInNewTab, setOpenInNewTab] = useState(existing?.openInNewTab ?? false);

  const handleSubmit = () => {
    if (!label.trim()) return;
    const item: MenuItem = {
      id: existing?.id ?? createMenuItemId(),
      type,
      label: label.trim(),
      labelBn: labelBn.trim() || undefined,
      icon: icon || undefined,
      openInNewTab: openInNewTab || undefined,
      children: existing?.children,
    };
    if (type === 'link') {
      item.href = href.trim() || '/';
    } else if (type === 'category') {
      item.categoryId = categoryId || undefined;
    }
    // dropdown type: no extra fields needed
    onConfirm(item);
  };

  return (
    <div className="border-primary/40 bg-primary/5 space-y-3 rounded-lg border border-dashed p-3">
      {/* Type selector */}
      <div className="flex gap-1.5">
        {(
          [
            { value: 'link', icon: LinkIcon, label: 'Link' },
            { value: 'category', icon: FolderOpen, label: 'Category' },
            { value: 'dropdown', icon: FolderTree, label: 'Dropdown' },
          ] as const
        ).map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setType(opt.value)}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
              type === opt.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-background border-border text-muted-foreground hover:bg-accent border'
            )}
          >
            <opt.icon className="h-3 w-3" />
            {opt.label}
          </button>
        ))}
      </div>

      {/* Label */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[11px]">Label (EN) *</Label>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Menu item label"
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Label (BN)</Label>
          <Input
            value={labelBn}
            onChange={(e) => setLabelBn(e.target.value)}
            placeholder="বাংলা লেবেল"
            className="h-8 text-xs"
          />
        </div>
      </div>

      {/* Type-specific fields */}
      {type === 'link' && (
        <div className="space-y-1">
          <Label className="text-[11px]">URL *</Label>
          <Input
            value={href}
            onChange={(e) => setHref(e.target.value)}
            placeholder="/products or https://..."
            className="h-8 text-xs"
          />
        </div>
      )}

      {type === 'category' && (
        <div className="space-y-1">
          <Label className="text-[11px]">Category *</Label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="border-border bg-background w-full rounded-md border px-2 py-1.5 text-xs"
          >
            <option value="">Select a category…</option>
            {categoryOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {type === 'dropdown' && (
        <p className="text-muted-foreground text-[11px]">
          Dropdown items will be added after saving. Expand this item to add children.
        </p>
      )}

      {/* Icon picker */}
      <div className="space-y-1">
        <Label className="text-[11px]">Icon (optional)</Label>
        <div className="border-border max-h-32 overflow-y-auto rounded-md border p-1.5">
          <div className="flex flex-wrap gap-1">
            {ICON_OPTIONS.map((opt) => {
              const Icon = ICON_MAP[opt.name];
              return (
                <button
                  key={opt.name}
                  type="button"
                  onClick={() => setIcon(opt.name)}
                  title={opt.label}
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-md text-xs transition-colors',
                    icon === opt.name
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background border-border text-muted-foreground hover:bg-accent border'
                  )}
                >
                  {Icon ? <Icon className="h-3.5 w-3.5" /> : <X className="h-3 w-3" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Open in new tab */}
      {type === 'link' && (
        <label className="text-muted-foreground flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={openInNewTab}
            onChange={(e) => setOpenInNewTab(e.target.checked)}
            className="border-border rounded"
          />
          Open in new tab
        </label>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button size="sm" className="h-7 text-xs" onClick={handleSubmit} disabled={!label.trim()}>
          <Check className="mr-1 h-3 w-3" />
          {form.mode === 'edit' ? 'Update' : 'Add'}
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

/* ──────────── Sortable Item Card ──────────── */
function SortableMenuItem({
  item,
  depth,
  onUpdate,
  onDelete,
  onAddChild,
  categoryOptions,
}: {
  item: MenuItem;
  depth: number;
  onUpdate: (id: string, patch: Partial<MenuItem>) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string) => void;
  categoryOptions: Array<{ id: string; name: string; slug: string }>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const typeIcon =
    item.type === 'link' ? LinkIcon : item.type === 'category' ? FolderOpen : FolderTree;
  const TypeIcon = typeIcon;
  const ItemIcon = ICON_MAP[item.icon ?? ''];
  const categoryName =
    item.type === 'category' ? categoryOptions.find((c) => c.id === item.categoryId)?.name : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && 'opacity-50', depth > 0 && 'ml-6')}
    >
      {editing ? (
        <MenuItemForm
          form={{ mode: 'edit', item }}
          onConfirm={(updated) => {
            onUpdate(item.id, updated);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
          categoryOptions={categoryOptions}
        />
      ) : (
        <div className="border-border bg-card hover:bg-accent/50 group flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors">
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className="text-muted-foreground/50 hover:text-muted-foreground shrink-0 cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" />
          </button>

          {/* Type icon */}
          <div
            className={cn(
              'flex h-6 w-6 shrink-0 items-center justify-center rounded-md',
              item.type === 'link' && 'bg-blue-500/10 text-blue-500',
              item.type === 'category' && 'bg-emerald-500/10 text-emerald-500',
              item.type === 'dropdown' && 'bg-amber-500/10 text-amber-500'
            )}
          >
            <TypeIcon className="h-3 w-3" />
          </div>

          {/* Menu icon */}
          {ItemIcon && (
            <div className="bg-muted text-muted-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-md">
              <ItemIcon className="h-3 w-3" />
            </div>
          )}

          {/* Label + meta */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-foreground truncate text-sm font-medium">{item.label}</span>
              {item.labelBn && (
                <span className="text-muted-foreground text-[10px]">({item.labelBn})</span>
              )}
              {item.openInNewTab && (
                <ExternalLink className="text-muted-foreground/50 h-3 w-3 shrink-0" />
              )}
            </div>
            <div className="text-muted-foreground flex items-center gap-1.5 text-[10px]">
              {item.type === 'link' && <span className="truncate">{item.href}</span>}
              {item.type === 'category' && categoryName && (
                <span className="truncate">{categoryName}</span>
              )}
              {item.type === 'dropdown' && item.children && (
                <span>
                  {item.children.length} child{item.children.length !== 1 ? 'ren' : ''}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {item.type === 'dropdown' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => onAddChild(item.id)}
                title="Add child item"
              >
                <Plus className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setEditing(true)}
              title="Edit"
            >
              <span className="text-[10px] font-medium">Edit</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive h-6 w-6"
              onClick={() => onDelete(item.id)}
              title="Delete"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
            {item.type === 'dropdown' && item.children && item.children.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Nested children */}
      {item.type === 'dropdown' && expanded && item.children && item.children.length > 0 && (
        <div className="mt-1 space-y-1">
          <ChildSortableList
            items={item.children}
            parentId={item.id}
            onUpdate={onUpdate}
            categoryOptions={categoryOptions}
          />
        </div>
      )}
    </div>
  );
}

/* ──────────── Child Sortable List (nested) ──────────── */
function ChildSortableList({
  items,
  parentId,
  onUpdate,
  categoryOptions,
}: {
  items: MenuItem[];
  parentId: string;
  onUpdate: (id: string, patch: Partial<MenuItem>) => void;
  categoryOptions: Array<{ id: string; name: string; slug: string }>;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(items, oldIndex, newIndex);
    onUpdate(parentId, { children: reordered });
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-1">
          {items.map((child) => (
            <SortableMenuItem
              key={child.id}
              item={child}
              depth={1}
              onUpdate={(childId, patch) => {
                // Update child within parent's children
                const updated = items.map((c) => (c.id === childId ? { ...c, ...patch } : c));
                onUpdate(parentId, { children: updated });
              }}
              onDelete={(childId) => {
                const filtered = items.filter((c) => c.id !== childId);
                onUpdate(parentId, { children: filtered });
              }}
              onAddChild={() => {}} // No nesting beyond 2 levels
              categoryOptions={categoryOptions}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

/* ──────────── Main Menu Editor ──────────── */
export function MenuEditor({
  items,
  onChange,
  label,
  categoryOptions = [],
}: {
  items: MenuItem[];
  onChange: (items: MenuItem[]) => void;
  label: string;
  categoryOptions?: Array<{ id: string; name: string; slug: string }>;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      onChange(arrayMove(items, oldIndex, newIndex));
    },
    [items, onChange]
  );

  const handleUpdate = useCallback(
    (id: string, patch: Partial<MenuItem>) => {
      onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    },
    [items, onChange]
  );

  const handleDelete = useCallback(
    (id: string) => {
      onChange(items.filter((item) => item.id !== id));
    },
    [items, onChange]
  );

  const handleAddChild = useCallback(
    (parentId: string) => {
      const newChild: MenuItem = {
        id: createMenuItemId(),
        type: 'link',
        label: 'New Item',
        href: '/',
      };
      onChange(
        items.map((item) =>
          item.id === parentId ? { ...item, children: [...(item.children ?? []), newChild] } : item
        )
      );
    },
    [items, onChange]
  );

  const handleAddItem = (item: MenuItem) => {
    onChange([...items, item]);
    setShowAdd(false);
  };

  return (
    <div className="space-y-3">
      {items.length === 0 && (
        <p className="text-muted-foreground py-4 text-center text-xs">
          No menu items yet. Add your first item below.
        </p>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1.5">
            {items.map((item) => (
              <SortableMenuItem
                key={item.id}
                item={item}
                depth={0}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onAddChild={handleAddChild}
                categoryOptions={categoryOptions}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add button / form */}
      {showAdd ? (
        <MenuItemForm
          form={{ mode: 'add' }}
          onConfirm={handleAddItem}
          onCancel={() => setShowAdd(false)}
          categoryOptions={categoryOptions}
        />
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="w-full border-dashed text-xs"
          onClick={() => setShowAdd(true)}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add {label} Item
        </Button>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   FOOTER COLUMN EDITOR — manages columns of footer menu items
   ════════════════════════════════════════════════════════════════ */

function FooterColumnCard({
  column,
  onUpdate,
  onDelete,
  categoryOptions,
}: {
  column: FooterColumn;
  onUpdate: (id: string, patch: Partial<FooterColumn>) => void;
  onDelete: (id: string) => void;
  categoryOptions: Array<{ id: string; name: string; slug: string }>;
}) {
  const [expanded, setExpanded] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && 'opacity-50')}>
      <div className="border-border bg-card rounded-lg border">
        {/* Header */}
        <div className="group flex items-center gap-2 px-3 py-2.5">
          <button
            {...attributes}
            {...listeners}
            className="text-muted-foreground/50 hover:text-muted-foreground shrink-0 cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <span className="text-foreground text-sm font-medium">{column.title}</span>
            {column.titleBn && (
              <span className="text-muted-foreground ml-1.5 text-[10px]">({column.titleBn})</span>
            )}
            <span className="text-muted-foreground ml-2 text-[10px]">
              {column.items.length} items
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive h-6 w-6"
            onClick={() => onDelete(column.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

        {/* Expanded content */}
        {expanded && (
          <div className="border-border space-y-3 border-t p-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px]">Column Title (EN)</Label>
                <Input
                  value={column.title}
                  onChange={(e) => onUpdate(column.id, { title: e.target.value })}
                  placeholder="e.g. Shop"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Column Title (BN)</Label>
                <Input
                  value={column.titleBn ?? ''}
                  onChange={(e) => onUpdate(column.id, { titleBn: e.target.value })}
                  placeholder="e.g. দোকান"
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <MenuEditor
              items={column.items}
              onChange={(items) => onUpdate(column.id, { items })}
              label={`${column.title} Links`}
              categoryOptions={categoryOptions}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function FooterColumnEditor({
  columns,
  onChange,
  categoryOptions = [],
}: {
  columns: FooterColumn[];
  onChange: (columns: FooterColumn[]) => void;
  categoryOptions?: Array<{ id: string; name: string; slug: string }>;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTitleBn, setNewTitleBn] = useState('');
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = columns.findIndex((c) => c.id === active.id);
      const newIndex = columns.findIndex((c) => c.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      onChange(arrayMove(columns, oldIndex, newIndex));
    },
    [columns, onChange]
  );

  const handleAddColumn = () => {
    if (!newTitle.trim()) return;
    const col: FooterColumn = {
      id: `fc-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      title: newTitle.trim(),
      titleBn: newTitleBn.trim() || undefined,
      items: [],
    };
    onChange([...columns, col]);
    setNewTitle('');
    setNewTitleBn('');
    setShowAdd(false);
  };

  return (
    <div className="space-y-3">
      {columns.length === 0 && (
        <p className="text-muted-foreground py-4 text-center text-xs">
          No footer columns yet. Add your first column below.
        </p>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={columns.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {columns.map((col) => (
              <FooterColumnCard
                key={col.id}
                column={col}
                onUpdate={(id, patch) =>
                  onChange(columns.map((c) => (c.id === id ? { ...c, ...patch } : c)))
                }
                onDelete={(id) => onChange(columns.filter((c) => c.id !== id))}
                categoryOptions={categoryOptions}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {showAdd ? (
        <div className="border-primary/40 bg-primary/5 space-y-2 rounded-lg border border-dashed p-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[11px]">Column Title (EN) *</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Shop"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Column Title (BN)</Label>
              <Input
                value={newTitleBn}
                onChange={(e) => setNewTitleBn(e.target.value)}
                placeholder="e.g. দোকান"
                className="h-8 text-xs"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={handleAddColumn}
              disabled={!newTitle.trim()}
            >
              <Check className="mr-1 h-3 w-3" /> Add Column
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => {
                setShowAdd(false);
                setNewTitle('');
                setNewTitleBn('');
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="w-full border-dashed text-xs"
          onClick={() => setShowAdd(true)}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Footer Column
        </Button>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   SOCIAL LINKS EDITOR — enable/disable & set URLs for platforms
   ════════════════════════════════════════════════════════════════ */

export function SocialLinksEditor({
  socials,
  onChange,
}: {
  socials: FooterSocialItem[];
  onChange: (items: FooterSocialItem[]) => void;
}) {
  const togglePlatform = (platformId: string) => {
    const exists = socials.find((s) => s.platform === platformId);
    if (exists) {
      onChange(socials.filter((s) => s.platform !== platformId));
    } else {
      onChange([...socials, { platform: platformId, url: '' }]);
    }
  };

  const updateUrl = (platformId: string, url: string) => {
    onChange(socials.map((s) => (s.platform === platformId ? { ...s, url } : s)));
  };

  const isLinked = (id: string) => socials.some((s) => s.platform === id);
  const getUrl = (id: string) => socials.find((s) => s.platform === id)?.url ?? '';

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs">
        Toggle platforms on/off and paste your profile URL. Links open in a new tab.
      </p>
      <div className="space-y-3">
        {SOCIAL_PLATFORMS.map((platform) => {
          const linked = isLinked(platform.id);
          return (
            <div
              key={platform.id}
              className="border-border bg-card space-y-2 rounded-lg border p-3"
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => togglePlatform(platform.id)}
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
                    linked
                      ? 'text-white'
                      : 'bg-background border-border text-muted-foreground hover:bg-accent border'
                  )}
                  style={linked ? { background: platform.color ?? 'var(--primary)' } : undefined}
                >
                  <SocialIcon platform={platform.id} className="h-3.5 w-3.5" />
                </button>
                <span className="text-foreground flex-1 text-sm font-medium">{platform.label}</span>
                <Badge variant={linked ? 'default' : 'secondary'} className="text-[10px]">
                  {linked ? 'Active' : 'Off'}
                </Badge>
              </div>
              {linked && (
                <Input
                  value={getUrl(platform.id)}
                  onChange={(e) => updateUrl(platform.id, e.target.value)}
                  placeholder={`https://${platform.id}.com/yourprofile`}
                  className="h-8 text-xs"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   PAYMENT METHODS EDITOR — add/remove payment badges with image
   ════════════════════════════════════════════════════════════════ */

export function PaymentMethodsEditor({
  payments,
  onChange,
}: {
  payments: FooterPaymentItem[];
  onChange: (items: FooterPaymentItem[]) => void;
}) {
  const handleAdd = () => {
    const item: FooterPaymentItem = {
      id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name: '',
    };
    onChange([...payments, item]);
  };

  const handleUpdate = (id: string, patch: Partial<FooterPaymentItem>) => {
    onChange(payments.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const handleDelete = (id: string) => {
    onChange(payments.filter((p) => p.id !== id));
  };

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs">
        Payment method badges shown in the footer bottom bar. Upload a logo/image or just use the
        text name.
      </p>

      {payments.length === 0 && (
        <p className="text-muted-foreground py-4 text-center text-xs">
          No payment methods yet. Add your first one below.
        </p>
      )}

      <div className="space-y-3">
        {payments.map((pm) => (
          <div key={pm.id} className="border-border bg-card space-y-3 rounded-lg border p-3">
            <div className="flex items-center gap-3">
              {pm.image ? (
                <img src={pm.image} alt={pm.name} className="h-8 w-auto object-contain" />
              ) : (
                <div className="bg-muted text-muted-foreground flex h-8 items-center rounded px-2 text-xs font-medium">
                  {pm.name || 'New'}
                </div>
              )}
              <div className="flex-1 space-y-1">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px]">Name (EN) *</Label>
                    <Input
                      value={pm.name}
                      onChange={(e) => handleUpdate(pm.id, { name: e.target.value })}
                      placeholder="e.g. bKash"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Name (BN)</Label>
                    <Input
                      value={pm.labelBn ?? ''}
                      onChange={(e) => handleUpdate(pm.id, { labelBn: e.target.value })}
                      placeholder="e.g. বিকাশ"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive h-6 w-6 shrink-0"
                onClick={() => handleDelete(pm.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px]">Logo / Icon Image</Label>
              <SingleImageUploader
                value={pm.image ?? ''}
                onChange={(url) => handleUpdate(pm.id, { image: url })}
                heightClass="h-16"
              />
              <p className="text-muted-foreground text-[10px]">
                Upload a payment logo. If empty, the name text is used as a badge.
              </p>
            </div>
          </div>
        ))}
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full border-dashed text-xs"
        onClick={handleAdd}
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Add Payment Method
      </Button>
    </div>
  );
}
