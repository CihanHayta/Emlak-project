/**
 * Ayarlar > Yetkiler sekmesi — rol->izin matrisi artık GERÇEK backend
 * yetkilendirmesine bağlı (bkz. server/src/middleware/authorize.middleware.js,
 * server/src/config/permissions.js). Eskiden sadece localStorage'a yazan
 * kozmetik bir referans tablosuydu; artık `tenants/{id}.rolePermissions`'a
 * kaydediyor ve her API isteğinde gerçekten uygulanıyor. Diğer *Store.js
 * dosyalarındaki cache+subscribe deseninin aynısı (bkz. integrationsStore.js).
 */
import { apiClient } from "../../lib/apiClient";

// Backend'deki izin anahtarlarının (properties:read vb.) Türkçe karşılığı —
// bkz. server/src/config/permissions.js#PERMISSION_CATALOG (tek doğruluk
// kaynağı orası; burası sadece görüntü etiketi).
export const PERMISSION_LABELS = {
  "properties:read": "İlanları Görüntüleme",
  "properties:write": "İlan Ekleme/Düzenleme",
  "vehicles:read": "Araçları Görüntüleme",
  "vehicles:write": "Araç Ekleme/Düzenleme",
  "customers:read": "Müşterileri Görüntüleme",
  "customers:write": "Müşteri Ekleme/Düzenleme",
  "appointments:read": "Randevuları Görüntüleme",
  "appointments:write": "Randevu Oluşturma/Düzenleme",
  "conversations:read": "Mesajları Görüntüleme",
  "conversations:write": "Mesaj Gönderme",
  "leads:read": "Başvuruları Görüntüleme",
  "leads:write": "Başvuru İşleme",
  "uploads:write": "Dosya Yükleme",
};

let cache = { rolePermissions: {}, catalog: [], roles: [] };
let loadPromise = null;
const listeners = new Set();

function notify() {
  listeners.forEach((callback) => callback());
}

async function refresh() {
  try {
    cache = await apiClient.get("/tenant/role-permissions");
  } catch (error) {
    console.error("Yetki bilgisi alınamadı:", error);
    cache = { rolePermissions: {}, catalog: [], roles: [] };
  }
  notify();
}

function ensureLoaded() {
  if (!loadPromise) loadPromise = refresh();
  return loadPromise;
}

/** `{ rolePermissions: { agent: [...], assistant: [...] }, catalog: [...], roles: [...] }` */
export function getRolePermissionsState() {
  ensureLoaded();
  return cache;
}

export function subscribeToSettings(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

/** Checkbox tıklanınca — izni ekler/çıkarır, backend'e kaydeder, sonucu (gerçekten kaydedileni) cache'e yazar. */
export async function toggleRolePermission(role, permission) {
  const current = cache.rolePermissions[role] ?? [];
  const next = current.includes(permission) ? current.filter((p) => p !== permission) : [...current, permission];
  const result = await apiClient.patch("/tenant/role-permissions", {
    rolePermissions: { ...cache.rolePermissions, [role]: next },
  });
  cache = { ...cache, rolePermissions: result.rolePermissions };
  notify();
}
