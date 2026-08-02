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
  // Personel: randevu oluşturma/silme, müşteri oluşturma + satış hattı
  // (pipeline) üzerinde çalışma (customer update), mesajlaşma — Danışman
  // (agent) ile aynı asgari yetkiler. Sadece Ayarlar (kullanıcı yönetimi)
  // admin'e özel kalır — bkz. userRouter'ın authorize("users:*") kapısı.
  assistant: [
    "properties:read",
    "customers:read", "customers:write",
    "appointments:read", "appointments:write",
    "conversations:read", "conversations:write",
    // leads:write gerekli — Başvurular ekranından randevu oluşturmak ya da
    // bir başvuruyu müşteriye çevirmek, o lead'in durumunu da günceller
    // (bkz. Basvurular.jsx#handleAppointmentSaved/handleConvertLead);
    // sadece leads:read olsaydı randevu OLUŞUR ama ardından gelen durum
    // güncellemesi 403 alır (yaşanan hata tam olarak buydu).
    "leads:read", "leads:write",
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
