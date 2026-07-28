/**
 * Shared "lead capture" store between the public site and the admin panel.
 *
 * The public site's forms (service request popup, İletişim page, listing
 * inquiry form — all built on hooks/useInquiryForm.js) and the admin CRM
 * (admin/pages/Customers.jsx) are part of the SAME app, so they can share
 * browser storage directly: a form submitted on the public site shows up
 * immediately in the admin's "Gelen Formlar" inbox, no backend required.
 *
 * This is a real (not decorative) integration for demo purposes, but it's
 * still just localStorage — once a real backend exists, swap the read/write
 * functions below for API calls and nothing that calls this module needs to
 * change.
 */
import { addNotification } from "../admin/data/notificationStore";

const STORAGE_KEY = "sahin-emlak-incoming-leads";

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeAll(leads) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
  // Notify any open tab/component (including the current one) that leads changed.
  window.dispatchEvent(new CustomEvent("leadstore:change"));
}

/** All incoming leads, newest first. */
export function getLeads() {
  return readAll().sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Records a new lead from a public-site form submission.
 * `context` is a short label for which form/listing it came from, e.g.
 * "Ücretsiz Ekspertiz talebi", "İletişim formu", or a listing title.
 */
export function addLead({ name, phone, message, context }) {
  const lead = {
    id: crypto.randomUUID(),
    name,
    phone,
    message,
    context,
    status: "Yeni",
    createdAt: Date.now(),
  };
  writeAll([...readAll(), lead]);
  // Every incoming form should surface immediately in the admin panel — bell
  // badge, sound, and the Bildirimler list — not just sit quietly in Başvurular.
  addNotification({
    title: "Yeni bir başvuru geldi",
    description: `${name} — ${context ?? "Web sitesi formu"}`,
    type: "form",
  });
  return lead;
}

/** Removes a lead from the inbox — used once it's been turned into a customer card (or dismissed). */
export function removeLead(id) {
  writeAll(readAll().filter((lead) => lead.id !== id));
}

/** Updates a lead's triage status ("Arandı", "Bilgi Bekliyor", ...) while it still sits in the inbox. */
export function updateLeadStatus(id, status) {
  writeAll(readAll().map((lead) => (lead.id === id ? { ...lead, status } : lead)));
}

/**
 * Subscribes to lead changes (new submissions, or leads being converted to
 * customers). Returns an unsubscribe function — pair with useEffect.
 */
export function subscribeToLeads(callback) {
  window.addEventListener("leadstore:change", callback);
  // Also fires on other tabs' changes via the native `storage` event.
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("leadstore:change", callback);
    window.removeEventListener("storage", callback);
  };
}
