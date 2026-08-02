// server/src/services/tenant.service.js
import { findTenantById, findTenantBySlug, createTenant, incrementTenantUsage, listAllTenants } from "../repositories/tenant.repository.js";
import { createDefaultTenant } from "../models/tenant.model.js";
import { slugify } from "../utils/slugify.js";
import { ApiError } from "../utils/ApiError.js";

export async function getTenantById(id) {
  return findTenantById(id);
}

/**
 * Instagram/WhatsApp webhook'ları gibi kimliksiz gelen olaylarda "hangi
 * tenant'a ait" bilgisi Meta'dan gelmez — bu proje tek-kiracılı olarak
 * kurulduğundan (bkz. docs/ARCHITECTURE.md), o TEK tenant'ı bulmak için
 * kullanılır. Birden fazla ya da sıfır tenant varsa (beklenmeyen bir
 * durum) açıkça hata fırlatır, sessizce yanlış bir tenant'a yazmaz.
 */
export async function getSingleTenant() {
  const tenants = await listAllTenants();
  if (tenants.length !== 1) {
    throw new Error(`Tek-kiracılı kurulum bekleniyor ama ${tenants.length} tenant bulundu.`);
  }
  return tenants[0];
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
