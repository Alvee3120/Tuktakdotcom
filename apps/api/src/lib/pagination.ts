/**
 * Parse and clamp pagination query params for list endpoints.
 * Prevents NaN offsets (from `?page=abc`) and unbounded limits from
 * crashing D1 queries or hammering the database.
 *
 * @param raw Value from a request query string (or undefined).
 * @param fallback Default value when the input is missing/invalid.
 * @param max Maximum allowed value (applied last).
 */
export function toPage(raw: string | undefined, fallback = 1, max = 100000): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? Math.min(Math.floor(n), max) : fallback;
}

/**
 * Convenience wrapper that reads `page`/`limit` query params and returns
 * clamped `{ page, limit, offset }` values safe to pass to D1.
 */
export function parsePagination(
  query: Record<string, string | undefined>,
  defaults: { page?: number; limit?: number } = {}
): { page: number; limit: number; offset: number } {
  const page = toPage(query.page, defaults.page ?? 1);
  const limit = toPage(query.limit, defaults.limit ?? 20, 100);
  return { page, limit, offset: (page - 1) * limit };
}
