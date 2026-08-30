/**
 * Funnel (kampanya sayfası) data store — diğer store'larla (customerStore,
 * appointmentStore...) aynı cache+subscribe deseni.
 */
import { apiClient } from "../../lib/apiClient";

let cache = [];
let loadPromise = null;
const listeners = new Set();

function notify() {
  listeners.forEach((callback) => callback());
}

async function refresh() {
  try {
    cache = await apiClient.get("/funnels");
  } catch (error) {
    console.error("Funnel'lar yüklenemedi:", error);
    cache = [];
  }
  notify();
}

function ensureLoaded() {
  if (!loadPromise) loadPromise = refresh();
  return loadPromise;
}

/** Tüm funnel'lar, en yeni önce. */
export function getFunnels() {
  ensureLoaded();
  return [...cache].sort((a, b) => (b.createdAt?._seconds ?? 0) - (a.createdAt?._seconds ?? 0));
}

export function getFunnelById(id) {
  return cache.find((f) => f.id === id) ?? null;
}

export async function addFunnel(data) {
  const created = await apiClient.post("/funnels", data);
  cache = [...cache, created];
  notify();
  return created;
}

export async function updateFunnel(id, updates) {
  const updated = await apiClient.patch(`/funnels/${id}`, updates);
  cache = cache.map((f) => (f.id === id ? updated : f));
  notify();
  return updated;
}

export async function deleteFunnel(id) {
  await apiClient.delete(`/funnels/${id}`);
  cache = cache.filter((f) => f.id !== id);
  notify();
}

export function subscribeToFunnels(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}
