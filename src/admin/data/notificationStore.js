/**
 * Bildirimler (notification center) store — the persistent list behind the
 * topbar's bell icon/badge and the Bildirimler page. Separate from the
 * ephemeral `sonner` toasts: a toast is "I saw this just now", this store
 * is "here's everything that happened, read or not."
 */
import { playNotificationSound } from "../lib/playNotificationSound";

const STORAGE_KEY = "sahin-admin-notifications";

function minutesAgo(minutes) {
  return Date.now() - minutes * 60 * 1000;
}

const SEED_NOTIFICATIONS = [
  {
    id: "notif-1",
    title: "Yeni bir randevu talebi var",
    description: "Ahmet Kaya, Müstakil Villa Turu için randevu oluşturdu.",
    type: "randevu",
    read: false,
    at: minutesAgo(50),
  },
  {
    id: "notif-2",
    title: "Yeni müşteri formu geldi",
    description: "İletişim formu üzerinden yeni bir talep alındı.",
    type: "form",
    read: false,
    at: minutesAgo(180),
  },
  {
    id: "notif-3",
    title: "İlan güncellendi",
    description: "\"Deniz Manzaralı Daire\" ilanının fiyatı güncellendi.",
    type: "ilan",
    read: true,
    at: minutesAgo(1440),
  },
];

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fall through to seed
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_NOTIFICATIONS));
  return SEED_NOTIFICATIONS;
}

function writeAll(notifications) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  window.dispatchEvent(new CustomEvent("notificationstore:change"));
}

/** All notifications, newest first. */
export function getNotifications() {
  return readAll().sort((a, b) => b.at - a.at);
}

export function getUnreadCount() {
  return readAll().filter((n) => !n.read).length;
}

export function addNotification({ title, description, type = "genel" }) {
  const notification = { id: crypto.randomUUID(), title, description, type, read: false, at: Date.now() };
  writeAll([...readAll(), notification]);
  playNotificationSound();
  return notification;
}

export function markAsRead(id) {
  writeAll(readAll().map((n) => (n.id === id ? { ...n, read: true } : n)));
}

export function markAllAsRead() {
  writeAll(readAll().map((n) => ({ ...n, read: true })));
}

export function subscribeToNotifications(callback) {
  window.addEventListener("notificationstore:change", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("notificationstore:change", callback);
    window.removeEventListener("storage", callback);
  };
}
