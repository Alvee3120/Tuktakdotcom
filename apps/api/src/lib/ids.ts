/**
 * Generate a compact 24-char hex id. Kept deliberately short for order numbers,
 * review/address ids, etc. ~96 bits of entropy per id is ample for these tables.
 */
export function newId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 24);
}
