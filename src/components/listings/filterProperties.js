import { toMillis } from "../../lib/firestoreTimestamp";

/** The "no filter applied" state for the Şehir/Semt/Mahalle/Tip/İlan No filter bar. */
export const EMPTY_FILTERS = { province: "İstanbul", district: "", neighborhood: "", type: "", listingNo: "" };

/**
 * Applies the Şehir/Semt/Mahalle/Tip/İlan No filters (from
 * ListingFilterBar) to a list of properties. An empty value for any filter
 * means "don't filter on this" — e.g. district="Esenyurt" + type="Müstakil"
 * narrows down to just Esenyurt's detached houses.
 *
 * The sample listings (data/properties.js) predate the "Şehir" field and
 * don't carry an explicit `province` — they're all İstanbul, so a missing
 * province is treated as İstanbul rather than excluded.
 *
 * İlan No matches as a substring so visitors don't have to type the exact
 * full number.
 */
export function filterProperties(properties, filters) {
  const { province, district, neighborhood, type, listingNo } = filters;
  const query = listingNo.trim();

  return properties.filter((property) => {
    if (province && (property.province ?? "İstanbul") !== province) return false;
    if (district && property.district !== district) return false;
    if (neighborhood && property.neighborhood !== neighborhood) return false;
    if (type && property.type !== type) return false;
    if (query && !property.listingNo.includes(query)) return false;
    return true;
  });
}

export const SORT_OPTIONS = [
  { value: "newest", label: "En Yeni İlanlar" },
  { value: "oldest", label: "En Eski İlanlar" },
  { value: "price-asc", label: "Fiyat (Düşükten Yükseğe)" },
  { value: "price-desc", label: "Fiyat (Yüksekten Düşüğe)" },
];
export const DEFAULT_SORT = "newest";

/** `property.price` is a display string ("2.750.000 TL", "22.000 TL / Aylık") -- strip everything but digits to sort numerically. */
function parsePriceNumber(priceText) {
  const digits = (priceText ?? "").replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

/**
 * `createdAt` comes straight from Firestore now, which serializes
 * Timestamps as `{_seconds,_nanoseconds}` over JSON — not a number `Date`
 * arithmetic can subtract directly. `toMillis()` normalizes that (and
 * plain numbers/ISO strings, for anything created before this) to epoch ms.
 */
export function sortProperties(properties, sortBy) {
  const sorted = [...properties];
  switch (sortBy) {
    case "oldest":
      return sorted.sort((a, b) => toMillis(a.createdAt) - toMillis(b.createdAt));
    case "price-asc":
      return sorted.sort((a, b) => parsePriceNumber(a.price) - parsePriceNumber(b.price));
    case "price-desc":
      return sorted.sort((a, b) => parsePriceNumber(b.price) - parsePriceNumber(a.price));
    case "newest":
    default:
      return sorted.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
  }
}
