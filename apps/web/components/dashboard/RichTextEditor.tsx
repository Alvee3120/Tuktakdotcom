'use client';

import { Extension, isNodeEmpty } from '@tiptap/core';
import Heading from '@tiptap/extension-heading';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  Undo2,
  Redo2,
  RemoveFormatting,
  Loader2,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

import { uploadImage } from '@/hooks/useAdmin';
import { uploadResizedImage } from '@/lib/image';
import { cn } from '@/lib/utils';

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

function ToolbarButton({
  onClick,
  isActive = false,
  disabled = false,
  title,
  children,
}: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-md transition-colors',
        isActive
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        disabled && 'cursor-not-allowed opacity-40'
      )}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="bg-border mx-1 h-6 w-px" />;
}

// Pressing Enter inside a heading normally spawns another heading (heading
// cascade). This extension makes Enter start a fresh paragraph instead, and
// pressing Enter in an empty heading drops it back to a paragraph.
const noHeadingCascade = Extension.create({
  name: 'noHeadingCascade',
  // Run before StarterKit's Enter so we can override heading splitting.
  priority: 150,
  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const { state } = editor;
        const { from } = state.selection;
        if (!state.selection.empty) return false;
        const $pos = state.doc.resolve(from);
        if ($pos.parent.type.name !== 'heading') return false;
        if (isNodeEmpty($pos.parent)) {
          editor.commands.setParagraph();
        } else {
          editor.chain().splitBlock().setParagraph().run();
        }
        return true;
      },
    };
  },
});

/**
 * Adds an `align` attribute to <img> nodes so images can be left/center/right
 * aligned. The align value is persisted as `data-align` on the img element,
 * which survives the round-trip through persisted HTML.
 */
const ImageAlign = Extension.create({
  name: 'imageAlign',
  addGlobalAttributes() {
    return [
      {
        types: ['image'],
        attributes: {
          align: {
            default: null,
            parseHTML: (element) => element.getAttribute('data-align'),
            renderHTML: (attributes) => {
              if (!attributes.align) return {};
              return { 'data-align': attributes.align };
            },
          },
        },
      },
    ];
  },
});

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false, // We configure heading separately with levels
      }),
      Heading.configure({
        levels: [1, 2, 3],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline hover:text-primary/80',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-lg max-w-full h-auto my-4',
        },
        // Drag-to-resize handles on hover (width/height persisted to the node).
        resize: {
          enabled: true,
          directions: ['bottom-right', 'bottom-left', 'top-right', 'top-left'],
          minWidth: 80,
          minHeight: 80,
          alwaysPreserveAspectRatio: true,
        },
      }),
      ImageAlign,
      noHeadingCascade,
    ],
    content: value || '',
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none min-h-[200px] px-4 py-3 text-sm text-foreground focus:outline-none placeholder:text-muted-foreground/50',
      },
    },
  });

  const handleImageUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !editor) return;

      setUploadingImage(true);
      try {
        // Resize to a max 1600px WebP, upload to R2, then insert the public URL.
        const url = await uploadResizedImage(file, uploadImage);
        editor.chain().focus().setImage({ src: url }).run();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Image upload failed');
      } finally {
        setUploadingImage(false);
        e.target.value = '';
      }
    },
    [editor]
  );

  const handleImageUrl = useCallback(() => {
    const url = window.prompt('Enter image URL:');
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const handleLink = useCallback(() => {
    if (!editor) return;

    if (showLinkInput) {
      if (linkUrl) {
        editor.chain().focus().setLink({ href: linkUrl }).run();
      } else {
        editor.chain().focus().unsetLink().run();
      }
      setShowLinkInput(false);
      setLinkUrl('');
    } else {
      const previousUrl = editor.getAttributes('link').href ?? '';
      setLinkUrl(previousUrl);
      setShowLinkInput(true);
    }
  }, [editor, showLinkInput, linkUrl]);

  const handleHeading = useCallback(
    (level: 1 | 2 | 3) => {
      if (!editor) return;
      editor.chain().focus().toggleHeading({ level }).run();
    },
    [editor]
  );

  if (!editor) return null;

  return (
    <div className={cn('border-border bg-card overflow-hidden rounded-xl border', className)}>
      {/* Toolbar */}
      <div className="border-border bg-muted/30 flex flex-wrap items-center gap-0.5 border-b px-3 py-2">
        {/* Text formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title="Strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Headings */}
        <ToolbarButton
          onClick={() => handleHeading(1)}
          isActive={editor.isActive('heading', { level: 1 })}
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => handleHeading(2)}
          isActive={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => handleHeading(3)}
          isActive={editor.isActive('heading', { level: 3 })}
          title="Heading 3"
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Ordered List"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Link */}
        <ToolbarButton onClick={handleLink} isActive={editor.isActive('link')} title="Link">
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>

        {/* Image */}
        <ToolbarButton onClick={handleImageUrl} title="Insert Image URL">
          <ImageIcon className="h-4 w-4" />
        </ToolbarButton>
        <button
          type="button"
          onClick={handleImageUpload}
          disabled={uploadingImage}
          className="text-muted-foreground hover:bg-muted hover:text-foreground flex h-8 items-center gap-1 rounded-md px-2 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          title="Upload Image"
        >
          {uploadingImage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          <span className="hidden sm:inline">{uploadingImage ? 'Uploading…' : 'Upload'}</span>
        </button>

        <ToolbarDivider />

        {/* Image alignment */}
        <ToolbarButton
          onClick={() => editor.chain().focus().updateAttributes('image', { align: 'left' }).run()}
          isActive={
            editor.isActive('image') &&
            editor.getAttributes('image').align === 'left'
          }
          title="Align Left"
        >
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().updateAttributes('image', { align: 'center' }).run()}
          isActive={
            editor.isActive('image') &&
            editor.getAttributes('image').align === 'center'
          }
          title="Align Center"
        >
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().updateAttributes('image', { align: 'right' }).run()}
          isActive={
            editor.isActive('image') &&
            editor.getAttributes('image').align === 'right'
          }
          title="Align Right"
        >
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Clear formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          title="Clear Formatting"
        >
          <RemoveFormatting className="h-4 w-4" />
        </ToolbarButton>

        {/* Undo/Redo */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
        >
          <Undo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
        >
          <Redo2 className="h-4 w-4" />
        </ToolbarButton>
      </div>

      {/* Link URL input */}
      {showLinkInput && (
        <div className="border-border bg-muted/20 flex items-center gap-2 border-b px-3 py-2">
          <LinkIcon className="text-muted-foreground h-4 w-4" />
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://example.com"
            className="placeholder:text-muted-foreground/50 flex-1 bg-transparent text-sm focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleLink();
              if (e.key === 'Escape') {
                setShowLinkInput(false);
                setLinkUrl('');
              }
            }}
            autoFocus
          />
          <button
            type="button"
            onClick={handleLink}
            className="rounded-md bg-emerald-500 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-600"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={() => {
              setShowLinkInput(false);
              setLinkUrl('');
            }}
            className="text-muted-foreground hover:text-foreground rounded-md px-3 py-1 text-xs font-medium"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Editor content */}
      <EditorContent editor={editor} placeholder={placeholder} />

      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
