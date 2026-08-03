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
} from "../repositories/tenant.repository.js";
import { createDefaultTenant } from "../models/tenant.model.js";
import { slugify } from "../utils/slugify.js";
import { ApiError } from "../utils/ApiError.js";

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

export async function createTenantForOwner({ name, ownerUserId, phone }) {
  const slug = await generateUniqueSlug(name);
  const data = createDefaultTenant({ name, slug, ownerUserId, phone });
  return createTenant(data);
}
