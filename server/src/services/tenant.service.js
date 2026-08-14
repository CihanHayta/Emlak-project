// server/src/services/tenant.service.js
import {
  findTenantById,
  findTenantBySlug,
  createTenant,
  incrementTenantUsage,
  updateTenantInstagram,
  findTenantByInstagramAccountId,
  findTenantsWithExpiringInstagramToken,
  updateTenantWhatsapp,
  findTenantByWhatsappWabaId,
  findTenantsWithExpiringWhatsappToken,
  updateTenantFacebookPage,
  findTenantByFacebookPageId,
  updateTenantFirebase,
  findTenantsWithFirebaseConnected,
  updateTenantRolePermissions,
  updateTenantAutomations,
} from "../repositories/tenant.repository.js";
import { createDefaultTenant, DEFAULT_AUTOMATIONS } from "../models/tenant.model.js";
import { slugify } from "../utils/slugify.js";
import { ApiError } from "../utils/ApiError.js";
import { encryptToken } from "../utils/crypto.util.js";
import { env } from "../config/env.js";
import { BASE_PERMISSIONS, CUSTOMIZABLE_ROLES, PERMISSION_CATALOG } from "../config/permissions.js";

export async function getTenantById(id) {
  return findTenantById(id);
}

/** Instagram webhook'u, kimliksiz gelen olayın hangi tenant'a ait olduğunu `entry.id` (IG hesap id'si) üzerinden bulmak için kullanır. */
export async function getTenantByInstagramAccountId(igAccountId) {
  return findTenantByInstagramAccountId(igAccountId);
}

export async function connectTenantInstagram(tenantId, data) {
  await updateTenantInstagram(tenantId, data);
}

export async function disconnectTenantInstagram(tenantId) {
  await updateTenantInstagram(tenantId, null);
}

/** Token yenileme işi (bkz. jobs/instagramTokenRefresh.job.js) için. */
export async function getTenantsWithExpiringInstagramToken(beforeTimestamp) {
  return findTenantsWithExpiringInstagramToken(beforeTimestamp);
}

/** WhatsApp webhook'u, kimliksiz gelen olayın hangi tenant'a ait olduğunu `entry.id` (WABA id'si) üzerinden bulmak için kullanır. */
export async function getTenantByWhatsappWabaId(wabaId) {
  return findTenantByWhatsappWabaId(wabaId);
}

export async function connectTenantWhatsapp(tenantId, data) {
  await updateTenantWhatsapp(tenantId, data);
}

export async function disconnectTenantWhatsapp(tenantId) {
  await updateTenantWhatsapp(tenantId, null);
}

/** Token yenileme işi (bkz. jobs/whatsappTokenRefresh.job.js) için. */
export async function getTenantsWithExpiringWhatsappToken(beforeTimestamp) {
  return findTenantsWithExpiringWhatsappToken(beforeTimestamp);
}

/** Meta Lead Ads webhook'u, kimliksiz gelen olayın hangi tenant'a ait olduğunu `entry.id` (Facebook Sayfa id'si) üzerinden bulmak için kullanır. */
export async function getTenantByFacebookPageId(pageId) {
  return findTenantByFacebookPageId(pageId);
}

export async function connectTenantFacebookPage(tenantId, data) {
  await updateTenantFacebookPage(tenantId, data);
}

export async function disconnectTenantFacebookPage(tenantId) {
  await updateTenantFacebookPage(tenantId, null);
}

/**
 * Tenant'ı KENDİ Firebase projesine bağlar — `serviceAccountJson` müşterinin
 * kendi Google hesabında oluşturduğu projenin "Yeni özel anahtar oluştur"
 * JSON'u (ham, `firebase-admin`'in beklediği `project_id`/`client_email`/
 * `private_key` alan adlarıyla). Bundan sonra bu tenant'a ait HER repository
 * sorgusu bu projeye gider (bkz. base.repository.js, firebase/admin.js).
 * `bootstrap-owner.js`'ten (yeni müşteri kurulumu) çağrılır.
 */
export async function connectTenantFirebaseProject(tenantId, { serviceAccountJson, storageBucket }) {
  const projectId = serviceAccountJson?.project_id;
  const clientEmail = serviceAccountJson?.client_email;
  const privateKey = serviceAccountJson?.private_key;
  if (!projectId || !clientEmail || !privateKey) {
    throw ApiError.validation("Geçersiz service account JSON — project_id/client_email/private_key eksik.");
  }
  if (!storageBucket) throw ApiError.validation("storageBucket zorunlu.");

  const encryptedPrivateKey = encryptToken(privateKey);
  await updateTenantFirebase(tenantId, { projectId, clientEmail, storageBucket, encryptedPrivateKey });

  // Bu tenant için önceden cache'lenmiş (yanlış/eski) bir Firebase App varsa
  // düşür — key rotasyonunda veya ilk bağlantıdan hemen sonra aynı process
  // içinde tekrar kullanılırsa güncel bilgiyle yeniden kurulsun diye.
  if (env.firebaseMode !== "mock") {
    const { invalidateTenantFirebaseApp } = await import("../firebase/admin.js");
    invalidateTenantFirebaseApp(tenantId);
  }
}

/** Yedekleme işi için (bkz. jobs/backupTenants.job.js). */
export async function getTenantsWithFirebaseConnected() {
  return findTenantsWithFirebaseConnected();
}

/**
 * Ayarlar > Yetkiler sayfası için: her özelleştirilebilir rolün ŞU ANKİ
 * etkin izin listesini döner (tenant override'ı varsa o, yoksa
 * BASE_PERMISSIONS'taki varsayılan) — sayfa hep "gerçek, o an uygulanan"
 * durumu göstersin diye, ayrı bir "henüz kaydedilmemiş taslak" kavramı yok.
 */
export async function getTenantRolePermissions(tenantId) {
  const tenant = await findTenantById(tenantId);
  if (!tenant) throw ApiError.forbidden("Ofis bulunamadı.");
  const overrides = tenant.rolePermissions ?? {};
  const effective = {};
  for (const role of CUSTOMIZABLE_ROLES) {
    effective[role] = overrides[role] ?? BASE_PERMISSIONS[role] ?? [];
  }
  return effective;
}

/**
 * Ayarlar > Yetkiler sayfasından kaydedilince çağrılır. Sadece
 * CUSTOMIZABLE_ROLES'taki roller ve PERMISSION_CATALOG'daki izinler kabul
 * edilir — owner/admin'i kısıtlamaya ya da entegrasyon/kullanıcı yönetimi
 * gibi hassas izinleri (tenant:manage, users:*) bu yoldan açmaya karşı
 * (bkz. config/permissions.js).
 */
export async function setTenantRolePermissions(tenantId, rolePermissions) {
  if (!rolePermissions || typeof rolePermissions !== "object" || Array.isArray(rolePermissions)) {
    throw ApiError.validation("Geçersiz izin verisi.");
  }

  const sanitized = {};
  for (const [role, perms] of Object.entries(rolePermissions)) {
    if (!CUSTOMIZABLE_ROLES.includes(role)) {
      throw ApiError.validation(`"${role}" rolünün izinleri buradan değiştirilemez.`);
    }
    if (!Array.isArray(perms) || perms.some((p) => !PERMISSION_CATALOG.includes(p))) {
      throw ApiError.validation(`"${role}" için geçersiz izin listesi.`);
    }
    sanitized[role] = perms;
  }

  await updateTenantRolePermissions(tenantId, sanitized);
}

/**
 * Bir dosya yüklemeden ÖNCE çağrılır: tenant'ın `plan.limits.storageMb`'ını
 * aşıp aşmayacağını kontrol eder, aşıyorsa `TENANT_QUOTA_EXCEEDED` fırlatır.
 * Diğer limitler (users/properties) bugün henüz hiçbir yerden çağrılmıyor
 * çünkü onları tetikleyecek akışlar (Personel daveti, İlan oluşturma
 * backend'i) henüz yok — bu fonksiyon o akışlar eklendiğinde aynı desenle
 * (`assertUsersWithinLimit`, `assertPropertiesWithinLimit`) genişletilebilir.
 */
export async function assertStorageWithinLimit(tenantId, additionalBytes) {
  const tenant = await findTenantById(tenantId);
  if (!tenant) throw ApiError.forbidden("Ofis bulunamadı.");

  const limitBytes = (tenant.plan?.limits?.storageMb ?? Infinity) * 1024 * 1024;
  const usedBytes = tenant.usage?.storageBytes ?? 0;

  if (usedBytes + additionalBytes > limitBytes) {
    throw ApiError.quotaExceeded(
      `Depolama limitinize ulaştınız (${tenant.plan?.limits?.storageMb} MB). Daha fazla dosya yüklemek için planınızı yükseltin.`,
    );
  }
}

export async function recordStorageUsage(tenantId, deltaBytes) {
  await incrementTenantUsage(tenantId, "storageBytes", deltaBytes);
}

/** Aynı isimden birden fazla ofis kaydolursa slug çakışmasını "-2", "-3" ekleyerek çözer. */
async function generateUniqueSlug(name) {
  const base = slugify(name);
  let slug = base;
  let suffix = 1;
  // eslint-disable-next-line no-await-in-loop -- sıralı çalışması gereken bir çakışma kontrolü, paralelleştirilemez.
  while (await findTenantBySlug(slug)) {
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
  return slug;
}

/**
 * Otomasyonlar sayfası için: tenant'ın şu anki ayarlarını döner.
 * `tenant.automations ?? DEFAULT_AUTOMATIONS` ŞART — bu alan 2026-08-14'te
 * eklendi, ondan ÖNCE oluşturulmuş tenant'larda (bkz. tenant.model.js'in
 * DEFAULT_AUTOMATIONS yorumu) hiç yok, `undefined` sessizce Otomasyonlar
 * sayfasını kırardı (canlıda yakalandı).
 */
export async function getTenantAutomations(tenantId) {
  const tenant = await findTenantById(tenantId);
  if (!tenant) throw ApiError.forbidden("Ofis bulunamadı.");
  return tenant.automations ?? DEFAULT_AUTOMATIONS;
}

/**
 * Otomasyonlar sayfasından toggle/ayar değişince çağrılır. `updates`
 * kısmi olabilir (ör. sadece `listingMatch.enabled`) — mevcut ayarların
 * (yoksa DEFAULT_AUTOMATIONS'ın) üzerine SIĞ (shallow, tek seviye)
 * birleştirilir; her alt-otomasyon kendi içinde tam bir obje olarak
 * gönderilmeli (frontend zaten formu hep tam obje olarak tutuyor, bkz.
 * Automations.jsx).
 */
export async function setTenantAutomations(tenantId, updates) {
  const tenant = await findTenantById(tenantId);
  if (!tenant) throw ApiError.forbidden("Ofis bulunamadı.");
  const merged = { ...(tenant.automations ?? DEFAULT_AUTOMATIONS), ...updates };
  await updateTenantAutomations(tenantId, merged);
  return merged;
}

export async function createTenantForOwner({ name, ownerUserId, phone }) {
  const slug = await generateUniqueSlug(name);
  const data = createDefaultTenant({ name, slug, ownerUserId, phone });
  return createTenant(data);
}
