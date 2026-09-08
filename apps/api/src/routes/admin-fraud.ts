import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { desc, eq, gte, isNotNull, or, sql } from 'drizzle-orm';

import type { Env } from '@/types/env';
import type { AuthVariables } from '@/middleware/auth';
import { createDb } from '@/db';
import * as schema from '@/db/schema';
import { fetchCourierReport } from '@/lib/fraud-check';
import { normalizePhone } from '@/lib/phone';
import { parsePagination } from '@/lib/pagination';

/**
 * Admin fraud-protection routes — mounted inside adminApp at /api/admin/fraud,
 * so the requireAuth + requireRole('admin','moderator') guard already applies.
 */
export const fraudRoutes = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// ── Blocklist ──
const addBlockSchema = z.object({
  type: z.enum(['phone', 'ip']),
  value: z.string().min(3).max(100),
  reason: z.string().max(500).nullable().optional(),
});

fraudRoutes.get('/blocklist', async (c) => {
  const db = createDb();
  const rows = await db
    .select()
    .from(schema.blocklist)
    .orderBy(desc(schema.blocklist.createdAt))
    .limit(1000);
  return c.json({ success: true, data: rows });
});

fraudRoutes.post('/blocklist', zValidator('json', addBlockSchema), async (c) => {
  const db = createDb();
  const body = c.req.valid('json');
  const value = body.type === 'phone' ? normalizePhone(body.value) : body.value.trim();
  if (!value) return c.json({ error: 'Invalid value' }, 400);
  const now = new Date().toISOString();
  const [entry] = await db
    .insert(schema.blocklist)
    .values({
      id: crypto.randomUUID(),
      type: body.type,
      value,
      reason: body.reason ?? null,
      createdAt: now,
    })
    .onConflictDoUpdate({
      target: [schema.blocklist.type, schema.blocklist.value],
      set: { reason: body.reason ?? null },
    })
    .returning();
  return c.json({ success: true, data: entry }, 201);
});

fraudRoutes.delete('/blocklist/:id', async (c) => {
  const db = createDb();
  const { id } = c.req.param();
  const deleted = await db.delete(schema.blocklist).where(eq(schema.blocklist.id, id)).returning();
  if (deleted.length === 0) return c.json({ error: 'Entry not found' }, 404);
  return c.json({ success: true, message: 'Entry removed' });
});

// ── Courier phone lookup (cache-first, 24h TTL) ──
fraudRoutes.get('/courier-check', async (c) => {
  const phone = c.req.query('phone');
  if (!phone || phone.replace(/\D/g, '').length < 10) {
    return c.json({ error: 'A valid phone number is required' }, 400);
  }
  const db = createDb();
  const report = await fetchCourierReport(db, phone);
  return c.json({ success: true, data: report });
});

// ── Risky orders overview ──
fraudRoutes.get('/overview', async (c) => {
  const db = createDb();
  const { page, limit, offset } = parsePagination(c.req.query());

  const riskyWhere = or(gte(schema.orders.riskScore, 40), isNotNull(schema.orders.riskFlags));
  const [rows, [countRow]] = await Promise.all([
    db
      .select({
        id: schema.orders.id,
        orderNumber: schema.orders.orderNumber,
        status: schema.orders.status,
        total: schema.orders.total,
        paymentMethod: schema.orders.paymentMethod,
        riskScore: schema.orders.riskScore,
        riskFlags: schema.orders.riskFlags,
        createdAt: schema.orders.createdAt,
        customerName: schema.users.name,
        customerEmail: schema.users.email,
        customerImage: schema.users.image,
        customerPhone: schema.addresses.phone,
      })
      .from(schema.orders)
      .leftJoin(schema.users, eq(schema.orders.userId, schema.users.id))
      .leftJoin(schema.addresses, eq(schema.orders.shippingAddressId, schema.addresses.id))
      .where(riskyWhere)
      .orderBy(desc(schema.orders.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(schema.orders)
      .where(riskyWhere),
  ]);

  const total = countRow?.count ?? 0;
  return c.json({
    success: true,
    data: rows,
    meta: { total, page, totalPages: Math.ceil(total / limit), limit },
  });
});
