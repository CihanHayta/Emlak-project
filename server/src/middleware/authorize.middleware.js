// server/src/middleware/authorize.middleware.js
import { ApiError } from "../utils/ApiError.js";
import { BASE_PERMISSIONS } from "../config/permissions.js";

/**
 * Route'a rol bazlı erişim kapısı: `authorize("customers:write")`.
 * `tenantMiddleware`'den sonra bağlanmalı (req.context.role'e ihtiyaç duyar).
 * Kullanıcının ek `permissions[]`'ı varsa (bkz. users koleksiyonu) bu taban
 * kümenin ÜZERİNE eklenir, hiçbir zaman kısıtlamaz.
 *
 * `req.context.rolePermissions` — tenant'ın "Ayarlar > Yetkiler"
 * sayfasından özelleştirdiği rol->izin override'ı (bkz.
 * tenant.middleware.js, tenant.service.js#getTenantRolePermissions). Bir rol
 * için override VARSA `BASE_PERMISSIONS`'ın yerine geçer (üstüne eklemez);
 * yoksa `BASE_PERMISSIONS`'taki varsayılan kullanılır. `owner`/`admin`
 * BİLEREK override'a hiç bakmaz — kilitlenme riskine karşı her zaman "*".
 */
export function authorize(requiredPermission) {
  return function authorizeMiddleware(req, _res, next) {
    const role = req.context?.role;
    if (role === "owner" || role === "admin") return next();

    const override = req.context?.rolePermissions?.[role];
    const base = override ?? BASE_PERMISSIONS[role] ?? [];
    const extra = req.user?.permissions ?? [];
    const allowed = base.includes("*") || base.includes(requiredPermission) || extra.includes(requiredPermission);

    if (!allowed) return next(ApiError.forbidden());
    next();
  };
}
