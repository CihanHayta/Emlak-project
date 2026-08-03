// server/src/models/tenant.model.js
import { withCreateFields } from "./base.model.js";

/**
 * `tenants` — istisna koleksiyon: kendi kendine bir `tenantId` alanı YOK
 * (dokümanın kendi `id`'si zaten tenant kimliğidir). Diğer tüm ortak alanlar
 * (createdAt/updatedAt/deletedAt/createdBy/updatedBy) yine geçerli.
 */
export function createDefaultTenant({ name, slug, ownerUserId, phone = null, taxNumber = null }) {
  return withCreateFields({
    name,
    slug,
    ownerUserId,
    plan: { name: "trial", limits: { users: 5, properties: 100, storageMb: 5000 } },
    // Plan limitlerine karşı her istekte sayım yapmak yerine denormalize
    // edilmiş kullanım sayaçları — bkz. tenant.service.js#assertStorageWithinLimit.
    usage: { users: 1, properties: 0, storageBytes: 0 },
    status: "trial", // trial | active | past_due | cancelled
    trialEndsAt: null,
    phone,
    taxNumber,
    // Instagram OAuth bağlantısı — bkz. services/instagramOAuth.service.js.
    // Henüz bağlanmamışsa null; accessToken her zaman şifreli tutulur
    // (bkz. utils/crypto.util.js).
    instagram: null,
    // WhatsApp Embedded Signup bağlantısı — bkz. services/whatsappOAuth.service.js.
    // Aynı şifreleme kuralı geçerli.
    whatsapp: null,
  });
}
