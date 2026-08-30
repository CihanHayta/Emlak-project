/**
 * "Bu listeyi en son ne zaman ziyaret ettim" izleyicisi — Sidebar'daki
 * Başvurular/Müşteriler rozetlerinin "Yeni" durumundaki kayıt sayısı yerine
 * gerçek okundu/okunmadı mantığıyla çalışmasını sağlar: sayfa açılınca
 * `markSeen(key)` çağrılır, rozet o andan sonra oluşan kayıtları sayar.
 * localStorage + custom event, notificationStore.js'teki aynı desenin
 * küçük bir kopyası (Sidebar ile sayfalar arasında doğrudan bir React
 * state bağlantısı yok, event bu yüzden gerekiyor).
 */
const EVENT_NAME = "sahin-admin-lastseen-change";

function storageKey(key) {
  return `sahin-admin-lastseen-${key}`;
}

export function getLastSeen(key) {
  const raw = localStorage.getItem(storageKey(key));
  return raw ? Number(raw) : 0;
}

export function markSeen(key) {
  localStorage.setItem(storageKey(key), String(Date.now()));
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function subscribeToLastSeen(callback) {
  window.addEventListener(EVENT_NAME, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT_NAME, callback);
    window.removeEventListener("storage", callback);
  };
}
