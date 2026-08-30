// server/src/services/funnel.service.js
import { funnelRepository } from "../repositories/funnel.repository.js";
import { createDefaultFunnel } from "../models/funnel.model.js";
import { withUpdateFields } from "../models/base.model.js";
import { slugify } from "../utils/slugify.js";
import { ApiError } from "../utils/ApiError.js";

// --- Admin (kimlik doğrulamalı) ---

export async function listFunnels(context) {
  return funnelRepository.findAll(context);
}

export async function getFunnel(context, id) {
  const funnel = await funnelRepository.findById(context, id);
  if (!funnel) throw ApiError.notFound("Funnel bulunamadı.");
  return funnel;
}

async function ensureUniqueSlug(context, slug, { excludeId } = {}) {
  const existing = await funnelRepository.findBySlug(context, slug);
  if (existing && existing.id !== excludeId) {
    throw ApiError.validation(`"${slug}" adresi zaten kullanılıyor, başka bir tane seçin.`);
  }
}

export async function createFunnel(context, data) {
  const slug = slugify(data.slug || data.name);
  if (!slug) throw ApiError.validation("Geçerli bir adres (slug) gerekli.");
  await ensureUniqueSlug(context, slug);
  return funnelRepository.create(context, createDefaultFunnel({ ...data, slug }));
}

export async function updateFunnel(context, id, data) {
  const updates = { ...data };
  if (updates.slug) {
    updates.slug = slugify(updates.slug);
    await ensureUniqueSlug(context, updates.slug, { excludeId: id });
  }
  return funnelRepository.update(context, id, withUpdateFields(updates, { actorUserId: context.userId }));
}

export async function deleteFunnel(context, id) {
  return funnelRepository.softDelete(context, id);
}

// --- Public (kimlik doğrulaması YOK — kampanya sayfası bunu çağırır) ---

/** Yayınlanmamış (draft) bir funnel'ı public'e sızdırmaz — bulunamadı gibi davranır. */
export async function getPublicFunnelBySlug(context, slug) {
  const funnel = await funnelRepository.findBySlug(context, slug);
  if (!funnel || funnel.status !== "published") return null;
  return funnel;
}
