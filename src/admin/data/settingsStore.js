/**
 * Ayarlar (Settings) store: admin users + the role -> permission matrix.
 * Same localStorage + change-event pattern as the other admin stores.
 */
import { USER_ROLES, ROLE_PERMISSIONS } from "./constants";

const USERS_KEY = "sahin-admin-users";
const PERMISSIONS_KEY = "sahin-admin-role-permissions";

export const ALL_PERMISSIONS = ["İlan Yönetimi", "Müşteri Yönetimi", "Randevu Yönetimi", "Kullanıcı Yönetimi", "Raporlar"];

const SEED_USERS = [
  { id: "user-1", name: "Admin", email: "admin@sahinemlak.com", role: "Admin" },
  { id: "user-2", name: "Elif Korkmaz", email: "elif@sahinemlak.com", role: "Danışman" },
  { id: "user-3", name: "Burak Aydın", email: "burak@sahinemlak.com", role: "Personel" },
];

function readUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fall through to seed
  }
  localStorage.setItem(USERS_KEY, JSON.stringify(SEED_USERS));
  return SEED_USERS;
}

function writeUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  window.dispatchEvent(new CustomEvent("settingsstore:change"));
}

export function getUsers() {
  return readUsers();
}

export function addUser(data) {
  const user = { id: crypto.randomUUID(), role: "Personel", ...data };
  writeUsers([...readUsers(), user]);
  return user;
}

export function updateUser(id, updates) {
  writeUsers(readUsers().map((u) => (u.id === id ? { ...u, ...updates } : u)));
}

export function deleteUser(id) {
  writeUsers(readUsers().filter((u) => u.id !== id));
}

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
