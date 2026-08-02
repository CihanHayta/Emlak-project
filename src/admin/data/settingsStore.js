/**
 * Ayarlar (Settings) store: the role -> permission matrix shown on the
 * "Yetkiler" tab. Still localStorage-only/cosmetic — the actual permission
 * enforcement lives server-side in server/src/middleware/authorize.middleware.js
 * and isn't wired to this UI (kullanıcı hesapları artık userStore.js +
 * gerçek backend üzerinden yönetiliyor, bkz. Settings.jsx).
 */
import { USER_ROLES, ROLE_PERMISSIONS } from "./constants";

const PERMISSIONS_KEY = "sahin-admin-role-permissions";

export const ALL_PERMISSIONS = ["İlan Yönetimi", "Müşteri Yönetimi", "Randevu Yönetimi", "Kullanıcı Yönetimi", "Raporlar"];

function readPermissions() {
  try {
    const raw = localStorage.getItem(PERMISSIONS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fall through to seed
  }
  localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(ROLE_PERMISSIONS));
  return ROLE_PERMISSIONS;
}

export function getRolePermissions() {
  return readPermissions();
}

export function togglePermission(role, permission) {
  const current = readPermissions();
  const rolePerms = current[role] ?? [];
  const next = {
    ...current,
    [role]: rolePerms.includes(permission) ? rolePerms.filter((p) => p !== permission) : [...rolePerms, permission],
  };
  localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("settingsstore:change"));
}

export function subscribeToSettings(callback) {
  window.addEventListener("settingsstore:change", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("settingsstore:change", callback);
    window.removeEventListener("storage", callback);
  };
}

export { USER_ROLES };
