// server/src/utils/phone.js

/**
 * Frontend telefonları serbest metin olarak tutuyor (örn. "0555 123 45 67",
 * bkz. docs/backend/faz0-frontend-envanteri.md — customer.phone). Backend'e
 * girerken E.164'e (+905551234567) normalize ediyoruz ki arama/karşılaştırma
 * güvenilir olsun; ekranda göstermek için `formatTrPhoneForDisplay` tersini yapar.
 *
 * Sadece TR (+90) mobil/sabit hat kapsıyor — yurt dışı numara desteği yok,
 * kapsam bunu gerektirmiyor.
 */
export function normalizeTrPhone(input) {
  if (!input) return null;
  const digits = String(input).replace(/\D/g, "");

  if (digits.length === 10 && digits.startsWith("5")) return `+90${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `+90${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith("90")) return `+${digits}`;
  if (digits.length === 13 && digits.startsWith("900")) return null; // yaygın yazım hatası: fazladan 0

  return null;
}

export function isValidTrPhone(input) {
  return normalizeTrPhone(input) !== null;
}

/** +905551234567 -> "0555 123 45 67" (frontend'in gösterdiği biçim) */
export function formatTrPhoneForDisplay(e164) {
  if (!e164 || !e164.startsWith("+90")) return e164 ?? "";
  const local = e164.slice(3); // 5551234567
  return `0${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6, 8)} ${local.slice(8, 10)}`;
}
