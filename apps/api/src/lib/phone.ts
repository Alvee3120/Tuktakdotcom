/**
 * Normalize a Bangladeshi phone number to digits-only E.164 without the "+"
 * (e.g. "01712-345678" → "8801712345678"). Returns null when unusable.
 */
export function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('880')) return digits;
  if (digits.startsWith('0')) return `880${digits.slice(1)}`;
  return digits;
}
