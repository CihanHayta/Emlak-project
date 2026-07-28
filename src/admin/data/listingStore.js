/**
 * Admin-side listings store.
 *
 * Seeded once from the public site's static data/properties.js (so the
 * "İlanlar" admin page has something to browse/edit immediately), then
 * persisted independently in localStorage — same read/write + change-event
 * pattern as customerStore.js / appointmentStore.js.
 *
 * IMPORTANT boundary: edits/creates here only affect the admin panel. The
 * public marketing site keeps reading data/properties.js directly, so a
 * listing created here won't appear on /satilik or /kiralik yet. Wiring
 * that up for real means either (a) merging this store into
 * data/properties.js's getters, or (b) — the real fix — replacing
 * data/properties.js with actual API calls once a backend exists. Kept
 * separate for now so the public site's data model stays simple and
 * doesn't grow a localStorage dependency.
 */
import { PROPERTIES } from "../../data/properties";

const STORAGE_KEY = "sahin-admin-listings";
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

// The public site's PROPERTIES don't carry a `createdAt` (they're static
// sample data), but the "bu ilan N aydır satılmadı" reminder needs one — so
// seeding gives each a spread-out synthetic age instead of "just now" for
// all 253 of them. A couple of ids are pinned to a specific age so the
// demo Satıcı customer (see customerStore.js) has a listing old enough to
// actually trigger the reminder.
const AGE_OVERRIDE_MONTHS = { "satilik-1": 3, "kiralik-2": 2 };

function seedListings() {
  return PROPERTIES.map((property, index) => ({
    ...property,
    createdAt: Date.now() - (AGE_OVERRIDE_MONTHS[property.id] ?? (index * 13) % 8) * MONTH_MS,
  }));
}

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fall through to seed
  }
  const seeded = seedListings();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  return seeded;
}

function writeAll(listings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(listings));
  window.dispatchEvent(new CustomEvent("listingstore:change"));
}

/** All listings (satılık + kiralık), newest-created first. */
export function getListings() {
  return [...readAll()].reverse();
}

export function getListingById(id) {
  return readAll().find((l) => l.id === id) ?? null;
}

export function addListing(data) {
  const listing = {
    id: crypto.randomUUID(),
    listingNo: String(Math.floor(100000 + Math.random() * 900000)),
    images: data.image ? [data.image] : [],
    createdAt: Date.now(),
    ...data,
  };
  writeAll([...readAll(), listing]);
  return listing;
}

export function updateListing(id, updates) {
  writeAll(readAll().map((l) => (l.id === id ? { ...l, ...updates } : l)));
}

export function deleteListing(id) {
  writeAll(readAll().filter((l) => l.id !== id));
}

export function subscribeToListings(callback) {
  window.addEventListener("listingstore:change", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("listingstore:change", callback);
    window.removeEventListener("storage", callback);
  };
}
