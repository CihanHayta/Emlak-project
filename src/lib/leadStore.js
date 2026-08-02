/**
 * Shared "lead capture" store between the public site and the admin panel
 * — now backed by the real backend (server/, Firestore) instead of
 * localStorage, so a lead submitted from ANY visitor's device actually
 * shows up in the admin panel. (The old localStorage version only worked
 * as a live demo because both "sides" happened to share one browser.)
 *
 * `addLead` (called from the public site — İletişim, ServiceRequestModal,
 * the listing inquiry form — all unauthenticated) hits a public endpoint;
 * everything else (admin triage, on Başvurular) requires the session cookie
 * and goes through the same apiClient every other migrated store uses.
 */
import { apiClient } from "./apiClient";
import { toMillis } from "./firestoreTimestamp";

const TENANT_ID = import.meta.env.VITE_TENANT_ID;

let cache = [];
let loadPromise = null;
const listeners = new Set();

function notify() {
  listeners.forEach((callback) => callback());
}

async function refresh() {
  try {
    cache = await apiClient.get("/leads");
  } catch (error) {
    console.error("Başvurular yüklenemedi:", error);
    cache = [];
  }
  notify();
}

function ensureLoaded() {
  if (!loadPromise) loadPromise = refresh();
  return loadPromise;
}

/**
 * Force a re-fetch from the backend (not just a cache read) — used by
 * useIncomingLeadAlerts.js to actually notice a lead submitted by a visitor
 * while the admin panel is open, since the cache otherwise only updates on
 * this browser's own mutations.
 */
export async function refreshLeads() {
  return refresh();
}

/** All incoming leads, newest first. */
export function getLeads() {
  ensureLoaded();
  return [...cache].sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
}

/**
 * Records a new lead from a public-site form submission.
 * `context` is a short label for which form/listing it came from, e.g.
 * "Ücretsiz Ekspertiz talebi", "İletişim formu", or a listing title.
 */
export async function addLead({ name, phone, message, context }) {
  if (!TENANT_ID) {
    throw new Error("VITE_TENANT_ID tanımlı değil — .env dosyasını kontrol edin.");
  }
  return apiClient.post("/public/leads", { tenantId: TENANT_ID, name, phone, message, context });
}

/** Removes a lead from the inbox — used once it's been turned into a customer card (or dismissed). */
export async function removeLead(id) {
  await apiClient.delete(`/leads/${id}`);
  cache = cache.filter((lead) => lead.id !== id);
  notify();
}

/** Updates a lead's triage status ("Arandı", "Bilgi Bekliyor", ...) while it still sits in the inbox. */
export async function updateLeadStatus(id, status) {
  const updated = await apiClient.patch(`/leads/${id}/status`, { status });
  cache = cache.map((lead) => (lead.id === id ? updated : lead));
  notify();
}

/**
 * Subscribes to lead changes (new submissions, or leads being converted to
 * customers). Returns an unsubscribe function — pair with useEffect.
 */
export function subscribeToLeads(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}
