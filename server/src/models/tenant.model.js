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
    // Facebook Sayfası bağlantısı — Instagram reklam (Lead Ads) formlarından
    // gelen başvuruları çekmek için (bkz. services/metaLeadAds.service.js).
    // Aynı şifreleme kuralı geçerli.
    facebookPage: null,
    // Bu tenant'ın KENDİ Firebase projesi (kendi Google hesabı/faturası) —
    // bağlanana kadar null, bu sırada o tenant'a ait hiçbir repository
    // sorgusu çalışmaz (bkz. firebase/admin.js#fetchTenantFirebaseConfig).
    // Şekli: { projectId, clientEmail, storageBucket, encryptedPrivateKey }
    // — sadece encryptedPrivateKey şifreli (bkz. utils/crypto.util.js),
    // diğerleri sır değil (aynı instagram/whatsapp alanlarındaki desen).
    firebase: null,
    // Owner'ın "Ayarlar > Yetkiler" sayfasından özelleştirdiği rol->izin
    // override'ı — bkz. config/permissions.js, authorize.middleware.js.
    // Boşsa (null) her rol için BASE_PERMISSIONS'taki varsayılan kullanılır.
    // Şekli: { agent: ["properties:read", ...], assistant: [...] }
    rolePermissions: null,
    // Otomasyonlar sayfası — bkz. services/automation.service.js.
    // listingMatch/appointmentReminder proaktif (işletme-başlatan) mesajlar
    // olduğu için Meta'nın onayladığı bir WhatsApp Template'i gerektirir —
    // templateStatus onaylanana kadar (ve reddedilirse) sistem mesajı
    // hazırlar ama GÖNDERMEZ, admin panelinde "tek tıkla gönder" (wa.me
    // linki) olarak düşer — asla onaysız otomatik gönderim denenmez (Meta
    // hesabın askıya alınması riski). offHoursReply REAKTİF (müşterinin
    // kendi mesajına cevap, 24 saatlik pencere zaten açık) olduğu için
    // hiç template gerekmez, açılır açılmaz aktif olur.
    automations: {
      listingMatch: { enabled: false, templateStatus: "not_submitted", templateName: null, templateMetaId: null },
      appointmentReminder: { enabled: false, hoursBefore: 2, templateStatus: "not_submitted", templateName: null, templateMetaId: null },
      offHoursReply: {
        enabled: false,
        businessHours: { startHour: 9, endHour: 18, days: [1, 2, 3, 4, 5] }, // days: 0=Pazar...6=Cumartesi
        replyText: "Merhaba! Mesajınız için teşekkürler, çalışma saatlerimizde size dönüş yapacağız.",
      },
    },
  });
}
