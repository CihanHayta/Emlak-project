/**
 * Admin-side listings store — backed by the real backend (server/,
 * Firestore + Firebase Storage for photos/videos), same cache+subscribe
 * pattern as customerStore.js/appointmentStore.js. Every exported function
 * keeps its original name/shape so consumers only needed the async-write
 * changes (await on add/update/delete) — reads stay a synchronous cache
 * lookup.
 */
import { apiClient } from "../../lib/apiClient";
import { toMillis } from "../../lib/firestoreTimestamp";

let cache = [];
let loadPromise = null;
const listeners = new Set();

function notify() {
  listeners.forEach((callback) => callback());
}

async function refresh() {
  try {
    cache = await apiClient.get("/properties");
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

/** All listings, newest-created first. */
export function getListings() {
  ensureLoaded();
  return [...cache].sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
}

export function getListingById(id) {
  ensureLoaded();
  return cache.find((l) => l.id === id) ?? null;
}

export async function addListing(data) {
  const created = await apiClient.post("/properties", data);
  cache = [...cache, created];
  notify();
  return created;
}

export async function updateListing(id, updates) {
  const updated = await apiClient.patch(`/properties/${id}`, updates);
  cache = cache.map((l) => (l.id === id ? updated : l));
  notify();
  return updated;
}

export async function deleteListing(id) {
  await apiClient.delete(`/properties/${id}`);
  cache = cache.filter((l) => l.id !== id);
  notify();
}

export function subscribeToListings(callback) {
  listeners.add(callback);
  ensureLoaded();
  return () => listeners.delete(callback);
}
