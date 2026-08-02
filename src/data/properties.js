/**
 * Public-site listings — backed by the real backend (server/, Firestore),
 * not static sample data anymore. Same cache+subscribe pattern as every
 * other migrated store (see admin/data/customerStore.js): every getter
 * below stays a synchronous cache read (so existing call sites didn't need
 * to change), backed by an async fetch against the unauthenticated
 * `/public/properties` endpoint that starts the first time any getter is
 * called.
 *
 * Because the fetch is async, a component that calls one of these getters
 * on its very first render (before the fetch resolves) gets an empty
 * result — anything that needs to *react* to the data arriving must also
 * call `subscribeToProperties` in a `useEffect` and re-render on change
 * (every page that reads listings does this — see Satilik.jsx/Kiralik.jsx/
 * Home.jsx/PropertyDetail.jsx/Footer.jsx/etc).
 */
import { apiClient } from "../lib/apiClient";

const TENANT_ID = import.meta.env.VITE_TENANT_ID;

let cache = [];
let loadPromise = null;
const listeners = new Set();

function notify() {
  listeners.forEach((callback) => callback());
}

async function refresh() {
  if (!TENANT_ID) {
    console.error("VITE_TENANT_ID tanımlı değil — .env dosyasını kontrol edin.");
    cache = [];
    notify();
    return;
  }
  try {
    cache = await apiClient.get(`/public/properties?tenantId=${TENANT_ID}`);
  } catch (error) {
    console.error("İlanlar yüklenemedi:", error);
    cache = [];
  }
  notify();
}

function ensureLoaded() {
  if (!loadPromise) loadPromise = refresh();
  return loadPromise;
}

/** Subscribes to listing changes (first load resolving, or a later refresh). Returns an unsubscribe function. */
export function subscribeToProperties(callback) {
  listeners.add(callback);
  ensureLoaded();
  return () => listeners.delete(callback);
}

/** All listings, regardless of category — used e.g. by the homepage's "Tüm İlanlar" section and the footer preview grid. */
export function getAllProperties() {
  ensureLoaded();
  return cache;
}

/** All "satılık" (for-sale) listings, homepage + listing page share this. */
export function getSaleProperties() {
  ensureLoaded();
  return cache.filter((p) => p.category === "satilik");
}

/** All "kiralık" (for-rent) listings, homepage + listing page share this. */
export function getRentProperties() {
  ensureLoaded();
  return cache.filter((p) => p.category === "kiralik");
}

/**
 * Listings with a video tour, used by the homepage carousels.
 * - `getFeaturedVideos("satilik")` -> the "Satılık Evler" row (Daire + Müstakil).
 * - `getFeaturedVideos("satilik", "Arsa")` -> the "Satılık Arsalar" row.
 * Land listings are excluded from the plain (no `type` arg) call so they
 * don't show up twice — once in "Evler" and again in "Arsalar".
 */
export function getFeaturedVideos(category, type) {
  ensureLoaded();
  return cache.filter(
    (p) => p.category === category && p.hasVideo && (type ? p.type === type : p.type !== "Arsa"),
  );
}

/** Looks up a single listing by id — used by the listing detail page. */
export function getPropertyById(id) {
  ensureLoaded();
  return cache.find((p) => p.id === id) ?? null;
}

/**
 * "Benzer İlanlar" (similar listings) for the detail page sidebar: same
 * category (satılık/kiralık) as `property`, preferring the same type
 * (Daire/Müstakil/Arsa) and district first, then relaxing district, then
 * type, so there's always a decent number of suggestions.
 */
export function getSimilarProperties(property, limit = 8) {
  ensureLoaded();
  const others = cache.filter((p) => p.id !== property.id && p.category === property.category);
  const sameTypeSameDistrict = others.filter((p) => p.type === property.type && p.district === property.district);
  const sameTypeOtherDistrict = others.filter((p) => p.type === property.type && p.district !== property.district);
  const otherType = others.filter((p) => p.type !== property.type);
  return [...sameTypeSameDistrict, ...sameTypeOtherDistrict, ...otherType].slice(0, limit);
}
