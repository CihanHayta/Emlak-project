// server/src/models/tenant.model.js
import { withCreateFields } from "./base.model.js";

/**
 * Otomasyonlar sayfası — bkz. services/automation.service.js.
 * listingMatch/appointmentReminder proaktif (işletme-başlatan) mesajlar
 * olduğu için Meta'nın onayladığı bir WhatsApp Template'i gerektirir —
 * templateStatus onaylanana kadar (ve reddedilirse) sistem mesajı hazırlar
 * ama GÖNDERMEZ, admin panelinde "tek tıkla gönder" (wa.me linki) olarak
 * düşer — asla onaysız otomatik gönderim denenmez (Meta hesabın askıya
 * alınması riski). offHoursReply REAKTİF (müşterinin kendi mesajına
 * cevap, 24 saatlik pencere zaten açık) olduğu için hiç template
 * gerekmez, açılır açılmaz aktif olur.
 *
 * EXPORT EDİLDİ ve `tenant.service.js#getTenantAutomations`'ta da
 * fallback olarak kullanılıyor — bu alan BUGÜN (2026-08-14) eklendi, ondan
 * ÖNCE oluşturulmuş tenant dokümanlarında (ör. gerçek "Şahin Emlak"
 * tenant'ı) `automations` alanı hiç yok. Sadece burada, `createDefaultTenant`
 * içinde tanımlansaydı, mevcut tenant'lar için `tenant.automations` hep
 * `undefined` kalır, Otomasyonlar sayfası boş/kırık bir yanıt alırdı
 * (canlıda 2026-08-14'te yakalandı).
 */
// `templateBodyText: null` -> automation.service.js'teki SABİT varsayılan
// metin kullanılır; owner Otomasyonlar sayfasından kendi metnini yazınca
// buraya dolar. `templateVersion` her "Şablonu Gönder"de artırılır — Meta
// aynı isimde bir şablonu İKİNCİ kez kabul etmiyor (ör. metni düzeltip
// tekrar göndermek istendiğinde), bu yüzden gerçek Meta şablon adı
// `{{baseAd}}_v{{templateVersion}}` şeklinde kuruluyor (bkz.
// automation.service.js#submitWhatsappTemplate) — owner kaç kez
// düzenleyip yeniden gönderirse göndersin asla çakışmaz.
export const DEFAULT_AUTOMATIONS = {
  listingMatch: { enabled: false, templateStatus: "not_submitted", templateName: null, templateMetaId: null, templateBodyText: null, templateVersion: 0 },
  appointmentReminder: { enabled: false, hoursBefore: 2, templateStatus: "not_submitted", templateName: null, templateMetaId: null, templateBodyText: null, templateVersion: 0 },
  offHoursReply: {
    enabled: false,
    businessHours: { startHour: 9, endHour: 18, days: [1, 2, 3, 4, 5] }, // days: 0=Pazar...6=Cumartesi
    replyText: "Merhaba! Mesajınız için teşekkürler, çalışma saatlerimizde size dönüş yapacağız.",
  },
  // Müşteri size yazdı, siz henüz cevap vermediniz, Meta'nın 24 saatlik
  // ücretsiz mesajlaşma penceresi kapanmak üzere — REAKTİF değil, size
  // (agent'a) İÇSEL bir uyarı, hiç dış API/onay gerektirmez. `offHoursReply.businessHours`'ı
  // AYNEN paylaşır (ayrı bir çalışma saati alanı YOK, tek bir "ne zaman
  // çalışıyoruz" tanımı yeterli) — sadece mesai içindeyken uyarır, mesai
  // dışında zaten elinizden bir şey gelmez.
  windowClosingAlert: { enabled: false, hoursBefore: 2 },
  // Yeni bir lead (web formu/kampanya/Instagram Reklam) geldiğinde: otomatik
  // CRM müşterisi oluşturulur, size içsel bir "yeni lead" bildirimi düşer,
  // müşteriye ilk karşılama mesajı gider. PROAKTİF (müşteri henüz size
  // yazmadı) olduğu için listingMatch/appointmentReminder gibi Meta Template
  // onayı gerektirir — bkz. automation.service.js#notifyNewLead. Instagram/
  // WhatsApp DM'leri bu otomasyonun KAPSAMI DIŞINDA (onlar hiç `lead`
  // oluşturmuyor, ayrı bir akış — bkz. Mesajlar sayfası).
  newLeadWelcome: { enabled: false, templateStatus: "not_submitted", templateName: null, templateMetaId: null, templateBodyText: null, templateVersion: 0 },
  // İKİ aşamayı birden İÇSEL olarak izler (bkz. automation.service.js#checkLeadResponseAlerts):
  // (1) bir BAŞVURU (lead) belirlenen süre içinde bir müşteri kartına
  //     dönüşmezse — BİLEREK newLeadWelcome'dan BAĞIMSIZ, o otomasyon
  //     kapalıyken de çalışır, çünkü doğrudan `leads` koleksiyonunu izler;
  // (2) müşteri kartı ZATEN oluşmuş ama durumu hâlâ "Yeni"den ilerlemediyse
  //     (aranmadı/işlem yapılmadı) — sadece "Yeni" aşamasını izler.
  // `minutesThreshold`: İLK uyarıya kadar geçen süre. `repeatMinutes`:
  // durum hâlâ "Yeni"yse bundan sonra KAÇ DAKİKADA BİR TEKRAR uyarılsın —
  // agent gerçekten unuttuysa hatırlatma süresiz devam eder, tek seferlik
  // bir not değildir. windowClosingAlert gibi hiç dış API çağrısı yok, hiç
  // template gerekmez.
  leadResponseAlert: { enabled: false, minutesThreshold: 10, repeatMinutes: 30 },
};

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
    automations: DEFAULT_AUTOMATIONS,
  });
}
