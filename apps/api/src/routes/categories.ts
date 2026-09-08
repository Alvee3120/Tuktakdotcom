import { zValidator } from '@hono/zod-validator';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';

import { createDb } from '@/db';
import { categories } from '@/db/schema';
import type { Env } from '@/types/env';
import { categorySlugSchema } from '@/validators/catalog';

/** Category routes — public endpoints */
export const categoryRoutes = new Hono<{ Bindings: Env }>();

/**
 * GET /api/categories
 * List all active categories (flat or tree).
 */
categoryRoutes.get('/', async (c) => {
  c.header('Cache-Control', 'public, max-age=0, must-revalidate');
  const db = createDb();

  const allCategories = await db
    .select()
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(categories.sortOrder);

  return c.json({ success: true, data: allCategories });
});

/**
 * GET /api/categories/tree
 * Get categories as a nested tree structure.
 */
categoryRoutes.get('/tree', async (c) => {
  const db = createDb();

  const allCategories = await db
    .select()
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(categories.sortOrder);

  // Build tree structure
  const categoryMap = new Map<
    string,
    (typeof allCategories)[number] & { children: typeof allCategories }
  >();
  const roots: ((typeof allCategories)[number] & { children: typeof allCategories })[] = [];

  for (const cat of allCategories) {
    categoryMap.set(cat.id, { ...cat, children: [] });
  }

  for (const cat of allCategories) {
    const node = categoryMap.get(cat.id)!;
    if (cat.parentId && categoryMap.has(cat.parentId)) {
      categoryMap.get(cat.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return c.json({ success: true, data: roots });
});

/**
 * GET /api/categories/:slug
 * Get a single category by slug.
 */
categoryRoutes.get('/:slug', zValidator('param', categorySlugSchema), async (c) => {
  const { slug } = c.req.valid('param');
  const db = createDb();

  const result = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);

  const category = result[0];
  if (!category) {
    return c.json({ error: 'Category not found' }, 404);
  }

  return c.json({ success: true, data: category });
});
