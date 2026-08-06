// server/src/middleware/tenant.middleware.js
//
// `authMiddleware`'den SONRA bağlanır (route zincirinde ondan sonra gelir).
import { ApiError } from "../utils/ApiError.js";
import { getTenantById } from "../services/tenant.service.js";

/**
 * `req.user`'dan (authMiddleware'in doldurduğu) `req.context`'i üretir —
 * service/repository katmanlarının gördüğü tek şey budur, asla ham `req.user`
 * değil. Tenant'ın durumu `cancelled` ise erişimi keser.
 */
export async function tenantMiddleware(req, _res, next) {
  if (!req.user?.tenantId) return next(ApiError.forbidden("Hesabınız bir emlak ofisine bağlı değil."));

  const tenant = await getTenantById(req.user.tenantId);
  if (!tenant) return next(ApiError.forbidden("Ofis bulunamadı."));
  if (tenant.status === "cancelled") {
    return next(ApiError.forbidden("Bu hesabın aboneliği iptal edilmiş."));
  }

  req.context = {
    tenantId: req.user.tenantId,
    userId: req.user.uid,
    role: req.user.role,
    // Owner'ın "Ayarlar > Yetkiler" sayfasından özelleştirdiği rol->izin
    // override'ı — bkz. authorize.middleware.js. Yoksa null, o zaman
    // authorize() BASE_PERMISSIONS'taki varsayılana döner.
    rolePermissions: tenant.rolePermissions ?? null,
  };
  next();
}
