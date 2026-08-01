// server/src/models/user.model.js
import { withCreateFields } from "./base.model.js";

/**
 * `users` — doküman ID'si Firebase Auth `uid`'idir (bkz. repositories/user.repository.js).
 * `tenantId` burada zorunlu ve normal bir alan (brief'teki "tenants ve users
 * hariç" istisnası, users'ın `uid`'i kendi doküman kimliği olarak
 * kullanmasıyla ilgili — tenantId alanı yine var ve filtrelenir).
 */
export function createDefaultUser({ tenantId, email, displayName = null, photoUrl = null, role }) {
  return withCreateFields({
    tenantId,
    email,
    phone: null,
    displayName,
    photoUrl,
    role, // owner | admin | agent | assistant | viewer
    permissions: [],
    status: "active", // active | invited | suspended
    lastLoginAt: null,
  });
}
