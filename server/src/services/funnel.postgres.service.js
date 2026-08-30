// server/src/services/funnel.postgres.service.js
// funnel.service.js'in (Firestore) PostgreSQL karşılığı — birebir aynı,
// tek fark: uniqueness kontrolü artık HEM servis katmanında (aynı) HEM DB'de
// (`idx_funnels_slug_active` kısmi unique index) çift güvenceli.
import { funnelPostgresRepository } from "../repositories/funnel.postgres.repository.js";
import { createDefaultFunnel } from "../models/funnel.model.js";
import { withUpdateFields } from "../models/base.model.js";
import { slugify } from "../utils/slugify.js";
import { ApiError } from "../utils/ApiError.js";

export async function listFunnels(context) {
  return funnelPostgresRepository.findAll(context);
}

export async function getFunnel(context, id) {
  const funnel = await funnelPostgresRepository.findById(context, id);
  if (!funnel) throw ApiError.notFound("Funnel bulunamadı.");
  return funnel;
}

async function ensureUniqueSlug(context, slug, { excludeId } = {}) {
  const existing = await funnelPostgresRepository.findBySlug(context, slug);
  if (existing && existing.id !== excludeId) {
    throw ApiError.validation(`"${slug}" adresi zaten kullanılıyor, başka bir tane seçin.`);
  }
}

export async function createFunnel(context, data) {
  const slug = slugify(data.slug || data.name);
  if (!slug) throw ApiError.validation("Geçerli bir adres (slug) gerekli.");
  await ensureUniqueSlug(context, slug);
  return funnelPostgresRepository.create(context, createDefaultFunnel({ ...data, slug }));
}

export async function updateFunnel(context, id, data) {
  const updates = { ...data };
  if (updates.slug) {
    updates.slug = slugify(updates.slug);
    await ensureUniqueSlug(context, updates.slug, { excludeId: id });
  }
  return funnelPostgresRepository.update(context, id, withUpdateFields(updates, { actorUserId: context.userId }));
}

export async function deleteFunnel(context, id) {
  return funnelPostgresRepository.softDelete(context, id);
}

export async function getPublicFunnelBySlug(context, slug) {
  const funnel = await funnelPostgresRepository.findBySlug(context, slug);
  if (!funnel || funnel.status !== "published") return null;
  return funnel;
}
