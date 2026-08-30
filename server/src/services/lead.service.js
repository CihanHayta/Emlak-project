// server/src/services/lead.service.js
import { leadRepository } from "../repositories/lead.repository.js";
import { createDefaultLead } from "../models/lead.model.js";
import { withUpdateFields } from "../models/base.model.js";
import { ApiError } from "../utils/ApiError.js";
import { notifyNewLead } from "./automation.service.js";
import { logger } from "../config/logger.js";

export async function listLeads(context) {
  return leadRepository.findAll(context);
}

/**
 * `context.userId` `null` olabilir — public site'tan (kimliksiz) gelen bir
 * form gönderimi de bunu çağırır (bkz. controllers/lead.controller.js'in
 * createPublicLeadController'ı). BaseRepository sadece tenantId'yi zorunlu
 * kılar, userId'yi değil.
 *
 * "Yeni Lead Karşılama" otomasyonu (bkz. automation.service.js#notifyNewLead)
 * response'u bloklamadan (floating promise, `.catch(logger.error)`) tetiklenir
 * — property.service.js#notifyIfPublished ile AYNI felsefe. Otomasyon
 * açıksa ve müşteri gerçekten oluşturulduysa, lead "Müşteri Oldu" olarak
 * işaretlenir (manuel dönüştürme akışıyla — Basvurular.jsx#handleConvertLead
 * — birebir aynı davranış).
 */
export async function createLead(context, data) {
  const lead = await leadRepository.create(context, createDefaultLead(data));
  notifyNewLead(context, lead)
    .then((customer) => customer && updateLeadStatus(context, lead.id, "Müşteri Oldu"))
    .catch((error) => logger.error(`Yeni lead karşılama otomasyonu hatası: tenant=${context.tenantId} lead=${lead.id} — ${error.message}`));
  return lead;
}

export async function updateLeadStatus(context, id, status) {
  const existing = await leadRepository.findById(context, id);
  if (!existing) throw ApiError.notFound("Başvuru bulunamadı.");
  return leadRepository.update(context, id, withUpdateFields({ status }, { actorUserId: context.userId }));
}

export async function deleteLead(context, id) {
  return leadRepository.softDelete(context, id);
}
