import { getListingById } from "../data/listingStore";

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * For a "Satıcı" (seller) customer linked to one of their own listings:
 * how many full months has that listing been sitting unsold/unrented?
 * Returns `null` if the customer isn't a seller, isn't linked to a listing,
 * or the listing hasn't been up for a full month yet.
 *
 * Used both on the customer card (a persistent inline banner) and by
 * useStaleListingReminders (a one-time toast/notification per month
 * milestone) — see lib/useStaleListingReminders.js.
 */
export function getStaleListingInfo(customer) {
  if (customer.role !== "Satıcı" || !customer.sellingListingId) return null;
  const listing = getListingById(customer.sellingListingId);
  if (!listing?.createdAt) return null;

  const monthsElapsed = Math.floor((Date.now() - listing.createdAt) / MONTH_MS);
  if (monthsElapsed < 1) return null;

  return { listing, monthsElapsed };
}
