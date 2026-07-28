/**
 * Helpers for "type as digits, see thousand separators" number inputs
 * (budget fields, etc). Backed by a plain `type="text"` input instead of
 * `type="number"` — text inputs don't get the native up/down spinner
 * arrows, and they let us show Turkish-style "3.500.000" formatting as the
 * user types instead of a bare unformatted number.
 */

/** Strips everything but digits — call this in onChange before storing state. */
export function parseDigits(value) {
  return value.replace(/\D/g, "");
}

/** Formats a raw digit string as "3.500.000" for display. */
export function formatThousands(digits) {
  if (!digits) return "";
  return Number(digits).toLocaleString("tr-TR");
}
