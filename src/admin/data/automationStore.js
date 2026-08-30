/**
 * Otomasyonlar sayfası için data store — customerStore.js ile aynı
 * cache+subscribe deseni. Ayarlar (`settings`) ve aktivite kaydı (`events`)
 * ayrı ayrı cache'leniyor, ikisi de owner-only uçlar (bkz.
 * server/src/routes/automation.routes.js).
 */
import { apiClient } from "../../lib/apiClient";

let settingsCache = null;
let settingsLoadPromise = null;
let eventsCache = [];
let eventsLoadPromise = null;
const listeners = new Set();

// Otomasyon olayları (job'ların sunucu tarafında ürettiği uyarılar) kullanıcı
// hiçbir şey yapmadan, arka planda oluşur — sayfa açık kalsa bile kendiliğinden
// yenilenmezse kullanıcı "hiç çalışmıyor" sanır (canlıda yaşandı: backend
// aslında düzgün çalışıyordu, sadece liste F5 atılmadan güncellenmiyordu).
// Bu yüzden sayfada en az bir dinleyici (Automations.jsx) VARKEN periyodik
// olarak yeniden çekiyoruz; sayfadan ayrılınca (dinleyici kalmayınca) durup
// gereksiz istek atmıyoruz.
const EVENTS_POLL_INTERVAL_MS = 15_000;
let pollTimer = null;

function startEventsPolling() {
  if (pollTimer) return;
  pollTimer = setInterval(refreshEvents, EVENTS_POLL_INTERVAL_MS);
}

function stopEventsPolling() {
  if (!pollTimer) return;
  clearInterval(pollTimer);
  pollTimer = null;
}

function notify() {
  listeners.forEach((callback) => callback());
}

async function refreshSettings() {
  try {
    settingsCache = await apiClient.get("/automations/settings");
  } catch (error) {
    console.error("Otomasyon ayarları yüklenemedi:", error);
    settingsCache = null;
  }
  notify();
}

async function refreshEvents() {
  try {
    eventsCache = await apiClient.get("/automations/events");
  } catch (error) {
    console.error("Otomasyon geçmişi yüklenemedi:", error);
    eventsCache = [];
  }
  notify();
}

/** İlk çağrıda yüklemeyi başlatır, o ana kadarki (muhtemelen boş) cache'i hemen döner. */
export function getAutomationSettings() {
  if (!settingsLoadPromise) settingsLoadPromise = refreshSettings();
  return settingsCache;
}

export function getAutomationEvents() {
  if (!eventsLoadPromise) eventsLoadPromise = refreshEvents();
  return eventsCache;
}

/** `updates` kısmi olabilir ama her değişen alt-otomasyon TAM obje olarak gönderilmeli (bkz. tenant.service.js#setTenantAutomations). */
export async function updateAutomationSettings(updates) {
  settingsCache = await apiClient.patch("/automations/settings", updates);
  notify();
  return settingsCache;
}

export async function submitAutomationTemplate(type) {
  settingsCache = await apiClient.post(`/automations/templates/${type}/submit`);
  notify();
  return settingsCache;
}

export async function refreshTemplateStatus(type) {
  settingsCache = await apiClient.get(`/automations/templates/${type}/status`);
  notify();
  return settingsCache;
}

export async function markAutomationEventSent(id) {
  await apiClient.post(`/automations/events/${id}/mark-sent`);
  await refreshEvents();
}

export function subscribeToAutomations(callback) {
  listeners.add(callback);
  startEventsPolling();
  return () => {
    listeners.delete(callback);
    if (listeners.size === 0) stopEventsPolling();
  };
}
