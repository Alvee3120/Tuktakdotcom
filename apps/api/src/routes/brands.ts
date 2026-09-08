import { zValidator } from '@hono/zod-validator';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';

import { createDb } from '@/db';
import { brands } from '@/db/schema';
import type { Env } from '@/types/env';
import { brandSlugSchema } from '@/validators/catalog';

/** Brand routes — public endpoints */
export const brandRoutes = new Hono<{ Bindings: Env }>();

/**
 * GET /api/brands
 * List all active brands.
 */
brandRoutes.get('/', async (c) => {
  c.header('Cache-Control', 'public, max-age=0, must-revalidate');
  const db = createDb();

  const allBrands = await db
    .select()
    .from(brands)
    .where(eq(brands.isActive, true))
    .orderBy(brands.name);

  return c.json({ success: true, data: allBrands });
});

/**
 * GET /api/brands/:slug
 * Get a single brand by slug.
 */
brandRoutes.get('/:slug', zValidator('param', brandSlugSchema), async (c) => {
  const { slug } = c.req.valid('param');
  const db = createDb();

  const result = await db.select().from(brands).where(eq(brands.slug, slug)).limit(1);

  const brand = result[0];
  if (!brand) {
    return c.json({ error: 'Brand not found' }, 404);
  }

  return c.json({ success: true, data: brand });
});
