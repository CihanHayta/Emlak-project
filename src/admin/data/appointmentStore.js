/**
 * Randevular (appointments) data store — now backed by the real backend
 * (server/, Firestore) instead of localStorage, same cache+subscribe
 * pattern as customerStore.js. Every exported function keeps its original
 * name/shape so consumers needed only the async-write changes (await on
 * add/update/delete) — reads stay a synchronous cache lookup.
 *
 * `listingId` still references an id from the public site's
 * data/properties.js — that hasn't moved to the backend yet, so the
 * listing enrichment (`.listing` on each appointment) stays a frontend-side
 * merge here, same as before. `customerId` references customerStore.js
 * (already backend-backed).
 */
import { getPropertyById } from "../../data/properties";
import { apiClient } from "../../lib/apiClient";

let cache = [];
let loadPromise = null;
const listeners = new Set();

function notify() {
  listeners.forEach((callback) => callback());
}

function withListing(appointment) {
  return { ...appointment, listing: getPropertyById(appointment.listingId) ?? null };
}

async function refresh() {
  try {
    cache = await apiClient.get("/appointments");
  } catch (error) {
    console.error("Randevular yüklenemedi:", error);
    cache = [];
  }
  notify();
}

function ensureLoaded() {
  if (!loadPromise) loadPromise = refresh();
  return loadPromise;
}

/** All appointments, soonest first, each enriched with its listing's info. */
export function getAppointments() {
  ensureLoaded();
  return cache.map(withListing).sort((a, b) => a.dateTime - b.dateTime);
}

export function getAppointmentById(id) {
  const found = cache.find((a) => a.id === id);
  return found ? withListing(found) : null;
}

export async function addAppointment(data) {
  const created = await apiClient.post("/appointments", data);
  cache = [...cache, created];
  notify();
  return withListing(created);
}

export async function updateAppointment(id, updates) {
  const updated = await apiClient.patch(`/appointments/${id}`, updates);
  cache = cache.map((a) => (a.id === id ? updated : a));
  notify();
  return withListing(updated);
}

export async function deleteAppointment(id) {
  await apiClient.delete(`/appointments/${id}`);
  cache = cache.filter((a) => a.id !== id);
  notify();
}

export function subscribeToAppointments(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}
