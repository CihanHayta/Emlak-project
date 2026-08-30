/**
 * Formats a TR phone number AS THE USER TYPES it — "05551234567" becomes
 * "0555 123 45 67" — so every phone field in the app (public forms, admin
 * customer card) looks the same without the visitor having to type spaces
 * themselves. Purely cosmetic; the backend still validates/normalizes the
 * real value (see server/src/utils/phone.js).
 */
export function formatPhoneInput(value) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  if (digits.length <= 9) return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 9)} ${digits.slice(9, 11)}`;
}
