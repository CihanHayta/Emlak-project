/**
 * Ekip üyeleri (Danışman/Personel) — gerçek backend (server/, Firestore +
 * Firebase Auth) üzerinden, cache+subscribe pattern (appointmentStore.js ile
 * aynı yaklaşım). Sadece admin (owner) bu uçlara erişebilir — bkz.
 * server/src/routes/user.routes.js.
 */
import { apiClient } from "../../lib/apiClient";

// Backend rol string'i <-> Ayarlar sayfasında gösterilen Türkçe etiket.
// Login.jsx'teki ROLE_TABS ile aynı eşleme.
export const ROLE_LABELS = { owner: "Admin", agent: "Danışman", assistant: "Personel", viewer: "Kısıtlı" };
// "viewer" (Kısıtlı — her şeyi sadece okur, hiçbir yazma izni yok) izin
// motorunda hep tanımlıydı ama bu ekrandan hiç atanamıyordu (2026-08-13'e
// kadar) — server/src/services/user.service.js#ASSIGNABLE_ROLES ile
// birlikte güncellendi.
export const ASSIGNABLE_ROLES = ["agent", "assistant", "viewer"];

let cache = [];
let loadPromise = null;
const listeners = new Set();

function notify() {
  listeners.forEach((callback) => callback());
}

async function refresh() {
  try {
    cache = await apiClient.get("/users");
  } catch (error) {
    console.error("Kullanıcılar yüklenemedi:", error);
    cache = [];
  }
  notify();
}

function ensureLoaded() {
  if (!loadPromise) loadPromise = refresh();
  return loadPromise;
}

export function getUsers() {
  ensureLoaded();
  return cache;
}

export async function addUser(data) {
  const created = await apiClient.post("/users", data);
  cache = [...cache, created];
  notify();
  return created;
}

export async function updateUser(id, updates) {
  const updated = await apiClient.patch(`/users/${id}`, updates);
  cache = cache.map((u) => (u.id === id ? updated : u));
  notify();
  return updated;
}

export async function deleteUser(id) {
  await apiClient.delete(`/users/${id}`);
  cache = cache.filter((u) => u.id !== id);
  notify();
}

export function subscribeToUsers(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}
