/**
 * Coerce a raw SQL aggregate into a number.
 *
 * Postgres's `COUNT(*)` and `SUM(...)` are `bigint`/`numeric`, and the driver
 * returns those as **strings** to avoid precision loss. Interpolating one
 * straight into arithmetic therefore concatenates instead of adding
 * (`0 + "1000"` → `"01000"`), which surfaces as absurdly large totals.
 *
 * Apply this to every aggregate read out of a raw `db.execute(sql\`...\`)` or a
 * `sql<number>` select before using it in a calculation or sending it to a
 * client that will do arithmetic on it.
 */
export function toNum(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}
