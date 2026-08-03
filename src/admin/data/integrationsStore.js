/**
 * Instagram bağlantı durumu — Ayarlar > Entegrasyonlar sekmesi için. Diğer
 * *Store.js dosyalarındaki cache+subscribe deseninin aynısı (bkz.
 * conversationStore.js), ama tek bir durum nesnesi olduğu için liste yok.
 */
import { apiClient, API_URL } from "../../lib/apiClient";

let cache = { connected: false };
let loadPromise = null;
const listeners = new Set();

function notify() {
  listeners.forEach((callback) => callback());
}

async function refresh() {
  try {
    cache = await apiClient.get("/instagram/status");
  } catch (error) {
    console.error("Instagram bağlantı durumu alınamadı:", error);
    cache = { connected: false };
  }
  notify();
}

function ensureLoaded() {
  if (!loadPromise) loadPromise = refresh();
  return loadPromise;
}

export function getInstagramStatus() {
  ensureLoaded();
  return cache;
}

export async function refreshInstagramStatus() {
  await refresh();
}

export function subscribeToInstagramStatus(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

/** "Instagram Hesabını Bağla" butonu — gerçek bir tarayıcı yönlendirmesi, fetch değil (OAuth akışı bunu gerektiriyor). */
export function goToInstagramConnect() {
  window.location.href = `${API_URL}/instagram/oauth/start`;
}

export async function disconnectInstagram() {
  await apiClient.post("/instagram/disconnect");
  cache = { connected: false };
  notify();
}

// ---- WhatsApp (ayrı durum nesnesi, Instagram'la aynı desen) ----

let whatsappCache = { connected: false };
let whatsappLoadPromise = null;
const whatsappListeners = new Set();

function notifyWhatsapp() {
  whatsappListeners.forEach((callback) => callback());
}

async function refreshWhatsapp() {
  try {
    whatsappCache = await apiClient.get("/whatsapp/status");
  } catch (error) {
    console.error("WhatsApp bağlantı durumu alınamadı:", error);
    whatsappCache = { connected: false };
  }
  notifyWhatsapp();
}

export function getWhatsappStatus() {
  if (!whatsappLoadPromise) whatsappLoadPromise = refreshWhatsapp();
  return whatsappCache;
}

export function subscribeToWhatsappStatus(callback) {
  whatsappListeners.add(callback);
  return () => whatsappListeners.delete(callback);
}

/** Embedded Signup popup'ı tamamlanınca (bkz. admin/lib/whatsappEmbeddedSignup.js) çağrılır. */
export async function connectWhatsapp({ code, wabaId, phoneNumberId }) {
  whatsappCache = await apiClient.post("/whatsapp/connect", { code, wabaId, phoneNumberId });
  notifyWhatsapp();
}

/** Elle bağlama formu (Business Verification tamamlanana kadar kullanılan asıl yol) — bkz. Settings.jsx#WhatsAppManualConnectDialog. */
export async function connectWhatsappManual({ accessToken, wabaId, phoneNumberId, displayPhoneNumber }) {
  whatsappCache = await apiClient.post("/whatsapp/connect-manual", { accessToken, wabaId, phoneNumberId, displayPhoneNumber });
  notifyWhatsapp();
}

export async function disconnectWhatsapp() {
  await apiClient.post("/whatsapp/disconnect");
  whatsappCache = { connected: false };
  notifyWhatsapp();
}
