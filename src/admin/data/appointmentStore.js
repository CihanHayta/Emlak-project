/**
 * Randevular (appointments) data store — same localStorage + change-event
 * pattern as customerStore.js / lib/leadStore.js.
 *
 * `listingId` references an id from the public site's data/properties.js,
 * so an appointment can show real listing info (title, location, photo)
 * without duplicating it here. `customerId` references customerStore.js.
 */
import { getPropertyById } from "../../data/properties";

const STORAGE_KEY = "sahin-admin-appointments";

// Appointment date/times are generated relative to "now" (rather than
// hard-coded calendar dates) so the demo data always looks like a sensible,
// near-term schedule — and so the "remind 2 hours before" logic always has
// something to actually demonstrate on.
function atOffset(daysFromNow, hour, minute) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, minute, 0, 0);
  return d.getTime();
}

function inMinutes(minutes) {
  return Date.now() + minutes * 60 * 1000;
}

const SEED_APPOINTMENTS = [
  {
    id: "appt-1",
    customerId: "cust-1",
    listingId: "satilik-3",
    dateTime: atOffset(2, 14, 0),
    status: "Beklemede",
    note: "Evi görmek istiyor.",
  },
  {
    id: "appt-2",
    customerId: "cust-2",
    listingId: "satilik-1",
    dateTime: atOffset(2, 16, 30),
    status: "Onaylandı",
    note: "Balkon ve otopark hakkında bilgi aldı.",
  },
  {
    id: "appt-3",
    customerId: "cust-3",
    listingId: "satilik-4",
    dateTime: atOffset(-1, 11, 0),
    status: "Tamamlandı",
    note: "İlanı beğendi, teklif verecek.",
  },
  {
    id: "appt-4",
    customerId: "cust-4",
    listingId: "kiralik-1",
    dateTime: atOffset(3, 13, 0),
    status: "Beklemede",
    note: "Ailesiyle birlikte gelecek.",
  },
  {
    id: "appt-5",
    customerId: "cust-5",
    listingId: "kiralik-3",
    dateTime: atOffset(3, 15, 30),
    status: "İptal Edildi",
    note: "Müşteri iptal etti.",
  },
  {
    // Deliberately close to "now" (see useUpcomingAppointmentReminders) so a
    // fresh install of the admin panel can immediately demo the "randevudan
    // 2 saat önce hatırlat" reminder toast without waiting for real time to pass.
    id: "appt-6",
    customerId: "cust-6",
    listingId: "kiralik-2",
    dateTime: inMinutes(90),
    status: "Onaylandı",
    note: "Metroya yakın olması önemli, bugün teyit etti.",
  },
];

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fall through to seed
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_APPOINTMENTS));
  return SEED_APPOINTMENTS;
}

function writeAll(appointments) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appointments));
  window.dispatchEvent(new CustomEvent("appointmentstore:change"));
}

/** All appointments, soonest first, each enriched with its listing's info. */
export function getAppointments() {
  return readAll()
    .map((appt) => ({ ...appt, listing: getPropertyById(appt.listingId) ?? null }))
    .sort((a, b) => a.dateTime - b.dateTime);
}

export function getAppointmentById(id) {
  return getAppointments().find((a) => a.id === id) ?? null;
}

export function addAppointment(data) {
  const appointment = { id: crypto.randomUUID(), status: "Beklemede", note: "", ...data };
  writeAll([...readAll(), appointment]);
  return appointment;
}

export function updateAppointment(id, updates) {
  writeAll(readAll().map((a) => (a.id === id ? { ...a, ...updates } : a)));
}

export function deleteAppointment(id) {
  writeAll(readAll().filter((a) => a.id !== id));
}

export function subscribeToAppointments(callback) {
  window.addEventListener("appointmentstore:change", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("appointmentstore:change", callback);
    window.removeEventListener("storage", callback);
  };
}
