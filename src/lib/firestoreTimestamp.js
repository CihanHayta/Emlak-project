/**
 * The backend stores `createdAt`/`updatedAt`/`deletedAt` as real Firestore
 * Timestamps (see server/src/models/base.model.js) — over JSON they arrive
 * as `{ _seconds, _nanoseconds }`, not a plain number like `Date.now()`
 * (which is still what freshly-generated fields like a timeline entry's
 * `.at` use). This normalizes either shape to epoch milliseconds.
 */
export function toMillis(value) {
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "object" && value._seconds != null) {
    return value._seconds * 1000 + Math.round((value._nanoseconds ?? 0) / 1e6);
  }
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}
