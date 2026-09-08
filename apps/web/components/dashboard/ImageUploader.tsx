'use client';

import { Image as ImageIcon, Link2, Loader2, UploadCloud, X } from 'lucide-react';
import { useRef, useState, type DragEvent } from 'react';
import { toast } from 'sonner';

import { uploadImage } from '@/hooks/useAdmin';
import { uploadResizedImage } from '@/lib/image';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/avif';

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return value.startsWith('/');
  }
}

/* ─────────────────────────────────────────────
 * Single image uploader — main product image
 * ──────────────────────────────────────────── */
export function SingleImageUploader({
  value,
  onChange,
  label = 'Main Image',
  heightClass = 'aspect-square',
  folder,
  unoptimized = false,
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  heightClass?: string;
  folder?: string;
  /** When true, upload the original file as-is (no resize/re-encode to WebP). */
  unoptimized?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const url = unoptimized
        ? await uploadImage(file, folder)
        : await uploadResizedImage(file, (f) => uploadImage(f, folder));
      onChange(url);
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  const applyUrl = () => {
    const url = urlInput.trim();
    if (!url || !isValidUrl(url)) {
      toast.error('Enter a valid image URL');
      return;
    }
    onChange(url);
    setUrlInput('');
    setShowUrlInput(false);
  };

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-foreground text-sm font-medium">{label} *</label>
        <button
          type="button"
          onClick={() => setShowUrlInput((v) => !v)}
          className="text-primary hover:text-primary/80 flex items-center gap-1 text-[11px] font-medium"
        >
          <Link2 className="h-3 w-3" /> Use URL
        </button>
      </div>

      {showUrlInput && (
        <div className="mb-2 flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), applyUrl())}
            placeholder="https://example.com/image.jpg"
            className="border-border focus:border-primary/50 focus:ring-primary/30 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1"
          />
          <button
            type="button"
            onClick={applyUrl}
            className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 rounded-lg px-3 py-2 text-xs font-medium"
          >
            Set
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = '';
        }}
      />

      {value ? (
        <div className="border-border group relative overflow-hidden rounded-xl border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Product" className={`${heightClass} w-full object-cover`} />
          <div className="absolute inset-0 hidden items-center justify-center gap-2 bg-black/50 group-hover:flex">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="bg-card text-foreground hover:bg-muted rounded-lg px-3 py-1.5 text-xs font-medium"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600"
            >
              Remove
            </button>
          </div>
          {uploading && (
            <div className="bg-card/70 absolute inset-0 flex items-center justify-center">
              <Loader2 className="text-primary h-6 w-6 animate-spin" />
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          disabled={uploading}
          className={`flex ${heightClass} w-full flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors ${
            dragging
              ? 'border-primary bg-primary/5'
              : 'border-border bg-muted/50 hover:border-primary/30 hover:bg-primary/5'
          }`}
        >
          {uploading ? (
            <Loader2 className="text-primary h-8 w-8 animate-spin" />
          ) : (
            <>
              <UploadCloud className="text-muted-foreground/40 h-10 w-10" />
              <p className="text-muted-foreground mt-2 text-sm font-medium">
                Click or drag image here
              </p>
              <p className="text-muted-foreground/70 mt-0.5 text-xs">
                JPG, PNG, WebP, GIF — max 5MB
              </p>
            </>
          )}
        </button>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
 * Multi image uploader — gallery images
 * ──────────────────────────────────────────── */
export function MultiImageUploader({
  values,
  onChange,
  label = 'Gallery Images',
  max = 10,
}: {
  values: string[];
  onChange: (urls: string[]) => void;
  label?: string;
  max?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  const handleFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).slice(0, max - values.length);
    if (list.length === 0) {
      toast.error(`Maximum ${max} gallery images`);
      return;
    }
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of list) {
        uploaded.push(await uploadResizedImage(file, uploadImage));
      }
      onChange([...values, ...uploaded]);
      toast.success(`${uploaded.length} image${uploaded.length > 1 ? 's' : ''} uploaded`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const addUrl = () => {
    const url = urlInput.trim();
    if (!url) return;
    if (!isValidUrl(url)) {
      toast.error('Enter a valid image URL');
      return;
    }
    if (values.length >= max) {
      toast.error(`Maximum ${max} gallery images`);
      return;
    }
    onChange([...values, url]);
    setUrlInput('');
  };

  return (
    <div>
      <label className="text-foreground mb-1.5 block text-sm font-medium">{label}</label>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void handleFiles(e.target.files);
          e.target.value = '';
        }}
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files?.length) void handleFiles(e.dataTransfer.files);
        }}
        className={`rounded-xl border-2 border-dashed p-3 transition-colors ${
          dragging ? 'border-primary bg-primary/5' : 'border-border'
        }`}
      >
        <div className="flex flex-wrap gap-2">
          {values.map((url, i) => (
            <div
              key={`${url}-${i}`}
              className="border-border group relative h-20 w-20 overflow-hidden rounded-lg border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Gallery ${i + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => onChange(values.filter((_, idx) => idx !== i))}
                className="h-4.5 w-4.5 absolute right-0.5 top-0.5 flex items-center justify-center rounded-full bg-gray-800/80 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Remove image"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {values.length < max && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="border-border text-muted-foreground/70 hover:border-primary/30 hover:text-primary flex h-20 w-20 flex-col items-center justify-center rounded-lg border border-dashed transition-colors"
            >
              {uploading ? (
                <Loader2 className="text-primary h-5 w-5 animate-spin" />
              ) : (
                <ImageIcon className="h-5 w-5" />
              )}
              <span className="mt-1 text-[10px]">{uploading ? 'Uploading' : 'Add'}</span>
            </button>
          )}
        </div>
        <p className="text-muted-foreground/70 mt-2 text-[11px]">
          Drag & drop multiple images, or click Add — up to {max}
        </p>
      </div>

      <div className="mt-2 flex gap-2">
        <input
          type="url"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addUrl())}
          placeholder="Or paste an image URL…"
          className="border-border focus:border-primary/50 focus:ring-primary/30 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1"
        />
        <button
          type="button"
          onClick={addUrl}
          className="border-border text-primary hover:border-primary/30 hover:bg-primary/5 shrink-0 rounded-lg border px-3 text-xs font-medium"
        >
          Add URL
        </button>
      </div>
    </div>
  );
}
