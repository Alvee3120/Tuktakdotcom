/**
 * Build a Map keyed by a function over each row — the standard "attach related
 * rows to a list" index. Equivalent to `new Map(rows.map(r => [key(r), r]))`.
 */
export function indexBy<T, K>(rows: readonly T[], key: (row: T) => K): Map<K, T> {
  return new Map(rows.map((row) => [key(row), row]));
}
