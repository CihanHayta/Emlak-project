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

// Gerçek masaüstü bildirimi (tarayıcının Notification API'si) — sekme açık
// kaldığı sürece (odakta olmasa, başka bir sekmede olsan bile) yeni bir
// bildirimde OS seviyesinde bir bildirim balonu çıkar, tıklanınca ilgili
// kayda (ör. müşteri kartına) götürür. Sekme/tarayıcı TAMAMEN kapalıyken
// çalışmaz — bunun için Service Worker tabanlı gerçek push altyapısı
// gerekir, bilerek kapsam dışı (ayrı, çok daha büyük bir iş). İzin tercihi
// localStorage'da tutuluyor ki bir kere izin verilince her sekme
// açılışında tekrar sorulmasın.
const DESKTOP_PREF_KEY = "sahin-admin-desktop-notifications";
let desktopNotificationsEnabled = typeof localStorage !== "undefined" && localStorage.getItem(DESKTOP_PREF_KEY) === "1";

export function getNotificationSupport() {
  return typeof Notification !== "undefined";
}

export function getNotificationPermission() {
  return getNotificationSupport() ? Notification.permission : "unsupported";
}

export function areDesktopNotificationsEnabled() {
  return desktopNotificationsEnabled && getNotificationPermission() === "granted";
}

/** "Bildirimleri Aç" butonuyla çağrılır — tarayıcının izin diyaloğunu açar. */
export async function enableDesktopNotifications() {
  if (!getNotificationSupport()) return false;
  const permission = await Notification.requestPermission();
  desktopNotificationsEnabled = permission === "granted";
  if (desktopNotificationsEnabled) localStorage.setItem(DESKTOP_PREF_KEY, "1");
  return desktopNotificationsEnabled;
}

export function disableDesktopNotifications() {
  desktopNotificationsEnabled = false;
  localStorage.removeItem(DESKTOP_PREF_KEY);
}

function showDesktopNotification(notification) {
  if (!areDesktopNotificationsEnabled()) return;
  try {
    const osNotification = new Notification(notification.title, { body: notification.description, tag: notification.id });
    if (notification.link) {
      // Bildirime tıklayınca sekmeyi öne getirip ilgili kayda (ör. müşteri
      // kartına) git — tam sayfa navigasyonu BİLEREK kullanılıyor
      // (window.location), çünkü bu kod React ağacının dışında çalışıyor,
      // router'ın history nesnesine erişimi yok; hedef sayfa (ör.
      // Customers.jsx) zaten `?id=` parametresini okuyup doğru kartı açacak
      // şekilde kurulu.
      osNotification.onclick = () => {
        window.focus();
        window.location.href = notification.link;
        osNotification.close();
      };
    }
  } catch {
    // Sessizce yut — bildirim tarayıcı/ortam kısıtı yüzünden çıkmazsa akışı bozmasın.
  }
}

/** All notifications, newest first. */
export function getNotifications() {
  return readAll().sort((a, b) => b.at - a.at);
}

export function getUnreadCount() {
  return readAll().filter((n) => !n.read).length;
}

/** `link`: tıklanınca (bildirim listesinde ya da masaüstü bildiriminde) gidilecek yol — ör. `/admin/musteriler?id=<id>`. Yoksa TYPE_ROUTE'daki genel liste sayfasına düşülür (bkz. Notifications.jsx). */
export function addNotification({ title, description, type = "genel", link = null }) {
  const notification = { id: crypto.randomUUID(), title, description, type, link, read: false, at: Date.now() };
  writeAll([...readAll(), notification]);
  playNotificationSound();
  showDesktopNotification(notification);
  return notification;
}

export function markAsRead(id) {
  writeAll(readAll().map((n) => (n.id === id ? { ...n, read: true } : n)));
}

export function markAllAsRead() {
  writeAll(readAll().map((n) => ({ ...n, read: true })));
}

export function deleteNotification(id) {
  writeAll(readAll().filter((n) => n.id !== id));
}

/** Deletes several notifications at once — used by the Bildirimler page's bulk-select toolbar. */
export function deleteNotifications(ids) {
  const idSet = new Set(ids);
  writeAll(readAll().filter((n) => !idSet.has(n.id)));
}

export function deleteAllNotifications() {
  writeAll([]);
}

export function subscribeToNotifications(callback) {
  window.addEventListener("notificationstore:change", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("notificationstore:change", callback);
    window.removeEventListener("storage", callback);
  };
}
