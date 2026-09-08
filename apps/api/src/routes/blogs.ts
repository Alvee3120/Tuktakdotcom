import { Hono } from 'hono';
import { and, eq, desc } from 'drizzle-orm';

import type { Env } from '@/types/env';
import type { AuthVariables } from '@/middleware/auth';
import { createDb, blogPosts } from '@/db';

const blogApp = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// Public: list published posts
blogApp.get('/', async (c) => {
  c.header('Cache-Control', 'public, max-age=0, must-revalidate');
  const db = createDb();
  const posts = await db
    .select({
      id: blogPosts.id,
      title: blogPosts.title,
      slug: blogPosts.slug,
      excerpt: blogPosts.excerpt,
      image: blogPosts.image,
      author: blogPosts.author,
      tags: blogPosts.tags,
      publishedAt: blogPosts.publishedAt,
      createdAt: blogPosts.createdAt,
    })
    .from(blogPosts)
    .where(eq(blogPosts.isPublished, true))
    .orderBy(desc(blogPosts.publishedAt))
    .limit(100);
  return c.json({ success: true, data: posts });
});

// Public: single post by slug (only published posts)
blogApp.get('/:slug', async (c) => {
  const db = createDb();
  const slug = c.req.param('slug');
  const [post] = await db
    .select()
    .from(blogPosts)
    .where(and(eq(blogPosts.slug, slug), eq(blogPosts.isPublished, true)));
  if (!post) return c.json({ error: 'Post not found' }, 404);
  return c.json({ success: true, data: post });
});

export { blogApp };
