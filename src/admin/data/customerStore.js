/**
 * Müşteriler (CRM) data store — now backed by the real backend (server/,
 * Firestore) instead of localStorage. Every exported function keeps the
 * exact same name/shape it had before (see git history) so every consumer
 * (CustomerCard, CustomerSheet, Customers.jsx, Dashboard.jsx, SalesPipeline,
 * AppointmentFormDialog's customer picker, CommandPalette, matchCustomers.js,
 * staleListing.js...) needed ZERO changes for reads.
 *
 * The one thing that couldn't stay identical: localStorage was synchronous,
 * an HTTP API isn't. Reads (`getCustomers()`) still return instantly from an
 * in-memory cache — same "useState(getCustomers()) + subscribeToCustomers"
 * pattern as before, the cache just now gets *populated* by an async fetch
 * instead of a synchronous localStorage read. Writes (`addCustomer` etc.)
 * are now `async` and must be `await`ed — those call sites DID need a
 * one-line change.
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
    cache = await apiClient.get("/customers");
  } catch (error) {
    console.error("Müşteriler yüklenemedi:", error);
    cache = [];
  }
  notify();
}

function ensureLoaded() {
  if (!loadPromise) loadPromise = refresh();
  return loadPromise;
}

/** All customer cards, newest first. Triggers the initial load on first call; returns the (possibly still-empty) cache immediately. */
export function getCustomers() {
  ensureLoaded();
  return [...cache].sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
}

export function getCustomerById(id) {
  return cache.find((c) => c.id === id) ?? null;
}

/** Creates a new customer card (manual entry, or converted from an incoming lead). */
export async function addCustomer(data) {
  const created = await apiClient.post("/customers", data);
  cache = [...cache, created];
  notify();
  return created;
}

/** Updates an existing customer card (notes, status, tags, budget, ...). */
export async function updateCustomer(id, updates) {
  const updated = await apiClient.patch(`/customers/${id}`, updates);
  cache = cache.map((c) => (c.id === id ? updated : c));
  notify();
  return updated;
}

/** Appends one timeline entry (e.g. "Randevu oluşturuldu") to a customer's history. */
export async function addTimelineEntry(id, label) {
  const updated = await apiClient.post(`/customers/${id}/timeline`, { label });
  cache = cache.map((c) => (c.id === id ? updated : c));
  notify();
  return updated;
}

export async function deleteCustomer(id) {
  await apiClient.delete(`/customers/${id}`);
  cache = cache.filter((c) => c.id !== id);
  notify();
}

/** Subscribes to customer data changes — pair with useEffect. */
export function subscribeToCustomers(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}
