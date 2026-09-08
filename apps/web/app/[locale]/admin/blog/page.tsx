'use client';

import { Plus, Search, Edit3, Trash2, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  useAdminBlogPosts,
  useCreateBlogPost,
  useUpdateBlogPost,
  useDeleteBlogPost,
} from '@/hooks/useAdmin';

type FormState = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  image: string;
  author: string;
  tags: string;
  isPublished: boolean;
};

const emptyForm: FormState = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  image: '',
  author: 'Tuktak',
  tags: '',
  isPublished: false,
};

export default function AdminBlogPage() {
  const { data, isLoading } = useAdminBlogPosts();
  const createPost = useCreateBlogPost();
  const updatePost = useUpdateBlogPost();
  const deletePost = useDeleteBlogPost();
  const posts = data?.data ?? [];

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (post: (typeof posts)[0]) => {
    setEditingId(post.id);
    setForm({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt ?? '',
      content: post.content,
      image: post.image ?? '',
      author: post.author,
      tags: post.tags ?? '',
      isPublished: post.isPublished,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.slug) return;
    try {
      if (editingId) {
        await updatePost.mutateAsync({ id: editingId, data: form });
        toast.success('Post updated');
      } else {
        await createPost.mutateAsync(form);
        toast.success('Post created');
      }
      setDialogOpen(false);
    } catch {
      toast.error('Failed to save');
    }
  };

  const togglePublish = async (post: (typeof posts)[0]) => {
    await updatePost.mutateAsync({ id: post.id, data: { isPublished: !post.isPublished } });
    toast.success(post.isPublished ? 'Post unpublished' : 'Post published');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this post?')) return;
    await deletePost.mutateAsync(id);
    toast.success('Post deleted');
  };

  const filtered = search
    ? posts.filter(
        (p) =>
          p.title.toLowerCase().includes(search.toLowerCase()) ||
          (p.tags ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : posts;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading-xl font-bold">Blog Posts</h1>
          <p className="text-body-sm text-muted-foreground mt-0.5">{posts.length} posts</p>
        </div>
        <PremiumButton
          variant="primary"
          size="sm"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={openNew}
        >
          New Post
        </PremiumButton>
      </div>

      <div className="relative max-w-sm">
        <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Search posts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="border-border flex flex-col items-center rounded-xl border border-dashed py-16 text-center">
          <p className="text-muted-foreground text-sm font-medium">No posts found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((post) => (
            <div
              key={post.id}
              className="border-border bg-card hover:border-primary/20 flex items-center justify-between rounded-xl border p-4 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{post.title}</p>
                  <Badge
                    variant={post.isPublished ? 'default' : 'secondary'}
                    className="text-[9px]"
                  >
                    {post.isPublished ? 'Published' : 'Draft'}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  /blog/{post.slug} · {post.author} ·{' '}
                  {new Date(post.createdAt).toLocaleDateString()}
                  {post.tags && <span> · {post.tags}</span>}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => togglePublish(post)}
                  className="text-muted-foreground hover:bg-muted flex h-8 w-8 items-center justify-center rounded"
                  title={post.isPublished ? 'Unpublish' : 'Publish'}
                >
                  {post.isPublished ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </button>
                <button
                  onClick={() => openEdit(post)}
                  className="text-muted-foreground hover:bg-primary/10 hover:text-primary flex h-8 w-8 items-center justify-center rounded"
                  title="Edit"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(post.id)}
                  className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive flex h-8 w-8 items-center justify-center rounded"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Post' : 'New Blog Post'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      title: e.target.value,
                      slug: editingId
                        ? form.slug
                        : e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, '-')
                            .replace(/^-|-$/g, ''),
                    })
                  }
                  placeholder="Post title"
                />
              </div>
              <div className="space-y-1">
                <Label>Slug</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="post-slug"
                  className="font-mono text-xs"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Excerpt</Label>
              <Textarea
                value={form.excerpt}
                onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                rows={2}
                placeholder="Short summary..."
              />
            </div>
            <div className="space-y-1">
              <Label>Content (HTML/markdown)</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={10}
                placeholder="Write your blog content here..."
                className="font-mono text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Image URL</Label>
                <Input
                  value={form.image}
                  onChange={(e) => setForm({ ...form, image: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-1">
                <Label>Author</Label>
                <Input
                  value={form.author}
                  onChange={(e) => setForm({ ...form, author: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Tags (comma separated)</Label>
              <Input
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="tech, gadgets, reviews"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
                className="border-border rounded"
              />
              Publish immediately
            </label>
            <PremiumButton
              variant="primary"
              onClick={handleSave}
              disabled={createPost.isPending || updatePost.isPending || !form.title || !form.slug}
              className="w-full"
            >
              {createPost.isPending || updatePost.isPending
                ? 'Saving...'
                : editingId
                  ? 'Save Changes'
                  : 'Create Post'}
            </PremiumButton>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
