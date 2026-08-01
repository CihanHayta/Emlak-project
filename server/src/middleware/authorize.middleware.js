// server/src/middleware/authorize.middleware.js
import { ApiError } from "../utils/ApiError.js";

// Rol bazlı taban izin kümesi. `owner`/`admin` her şeyi yapabilir; `agent`
// kendi kaydıyla sınırlıdır (bu sınır burada değil, repository katmanındaki
// scopeFilter'da uygulanır — burası sadece "bu rol bu route'a girebilir mi?").
const BASE_PERMISSIONS = {
  owner: ["*"],
  admin: ["*"],
  agent: [
    "properties:read", "properties:write",
    "customers:read", "customers:write",
    "appointments:read", "appointments:write",
    "conversations:read", "conversations:write",
    "leads:read", "leads:write",
    "uploads:write",
  ],
  assistant: [
    "properties:read",
    "customers:read",
    "appointments:read", "appointments:write",
    "conversations:read",
    "leads:read",
    "uploads:write",
  ],
  viewer: ["properties:read", "customers:read", "appointments:read", "leads:read"],
};

/**
 * Route'a rol bazlı erişim kapısı: `authorize("customers:write")`.
 * `tenantMiddleware`'den sonra bağlanmalı (req.context.role'e ihtiyaç duyar).
 * Kullanıcının ek `permissions[]`'ı varsa (bkz. users koleksiyonu) bu taban
 * kümenin ÜZERİNE eklenir, hiçbir zaman kısıtlamaz.
 */
export function authorize(requiredPermission) {
  return function authorizeMiddleware(req, _res, next) {
    const role = req.context?.role;
    const base = BASE_PERMISSIONS[role] ?? [];
    const extra = req.user?.permissions ?? [];
    const allowed = base.includes("*") || base.includes(requiredPermission) || extra.includes(requiredPermission);

    if (!allowed) return next(ApiError.forbidden());
    next();
  };
}
