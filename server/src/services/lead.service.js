// server/src/services/lead.service.js
import { leadRepository } from "../repositories/lead.repository.js";
import { createDefaultLead } from "../models/lead.model.js";
import { withUpdateFields } from "../models/base.model.js";
import { ApiError } from "../utils/ApiError.js";

export async function listLeads(context) {
  return leadRepository.findAll(context);
}

/**
 * `context.userId` `null` olabilir — public site'tan (kimliksiz) gelen bir
 * form gönderimi de bunu çağırır (bkz. controllers/lead.controller.js'in
 * createPublicLeadController'ı). BaseRepository sadece tenantId'yi zorunlu
 * kılar, userId'yi değil.
 *
 * NOT: eski (localStorage) sürüm her yeni lead'de admin bildirim çanına
 * (notificationStore) da yazıyordu — bildirimler henüz Firestore'a
 * taşınmadığı için bu bağlantı şimdilik kesildi. Notifications taşınınca
 * buraya eklenecek.
 */
export async function createLead(context, data) {
  return leadRepository.create(context, createDefaultLead(data));
}

export async function updateLeadStatus(context, id, status) {
  const existing = await leadRepository.findById(context, id);
  if (!existing) throw ApiError.notFound("Başvuru bulunamadı.");
  return leadRepository.update(context, id, withUpdateFields({ status }, { actorUserId: context.userId }));
}

export async function deleteLead(context, id) {
  return leadRepository.softDelete(context, id);
}
