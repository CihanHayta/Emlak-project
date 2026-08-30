/**
 * Admin-side vehicles store — listingStore.js ile birebir aynı desen
 * (backend'e bağlı cache+subscribe), sadece "/vehicles" uç noktasını kullanır.
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
    cache = await apiClient.get("/vehicles");
  } catch (error) {
    console.error("Araçlar yüklenemedi:", error);
    cache = [];
  }
  notify();
}

function ensureLoaded() {
  if (!loadPromise) loadPromise = refresh();
  return loadPromise;
}

/** Tüm araçlar, en yeni oluşturulan önce. */
export function getVehicles() {
  ensureLoaded();
  return [...cache].sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
}

export function getVehicleById(id) {
  ensureLoaded();
  return cache.find((v) => v.id === id) ?? null;
}

export async function addVehicle(data) {
  const created = await apiClient.post("/vehicles", data);
  cache = [...cache, created];
  notify();
  return created;
}

export async function updateVehicle(id, updates) {
  const updated = await apiClient.patch(`/vehicles/${id}`, updates);
  cache = cache.map((v) => (v.id === id ? updated : v));
  notify();
  return updated;
}

export async function deleteVehicle(id) {
  await apiClient.delete(`/vehicles/${id}`);
  cache = cache.filter((v) => v.id !== id);
  notify();
}

export function subscribeToVehicles(callback) {
  listeners.add(callback);
  ensureLoaded();
  return () => listeners.delete(callback);
}
