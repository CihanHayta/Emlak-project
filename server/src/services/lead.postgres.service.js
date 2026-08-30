// server/src/services/lead.postgres.service.js
// lead.service.js'in (Firestore) PostgreSQL karşılığı.
//
// AŞAMA 11: "Yeni Lead Karşılama" otomasyonu (notifyNewLead) GERİ EKLENDİ —
// automation.service.js artık customers/automationEvents için Postgres
// repository'lerini kullanıyor (bkz. o dosyanın yorumu).
import { leadPostgresRepository } from "../repositories/lead.postgres.repository.js";
import { createDefaultLead } from "../models/lead.model.js";
import { withUpdateFields } from "../models/base.model.js";
import { notifyNewLead } from "./automation.service.js";
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../config/logger.js";

export async function listLeads(context) {
  return leadPostgresRepository.findAll(context);
}

export async function updateLeadStatus(context, id, status) {
  const existing = await leadPostgresRepository.findById(context, id);
  if (!existing) throw ApiError.notFound("Başvuru bulunamadı.");
  return leadPostgresRepository.update(context, id, withUpdateFields({ status }, { actorUserId: context.userId }));
}

/**
 * funnelId artık GERÇEK foreign key — appointment.postgres.service.js#normalizeReferenceFields
 * ile aynı gerekçe (boş string "seçim yok" NULL'a normalize edilir).
 *
 * "Yeni Lead Karşılama" otomasyonu lead.service.js ile BİREBİR aynı desen:
 * response'u bloklamayan floating promise (`.catch(logger.error)`) — otomasyon
 * açıksa ve müşteri gerçekten oluşturulduysa, lead "Müşteri Oldu" olarak işaretlenir.
 */
export async function createLead(context, data) {
  const defaults = createDefaultLead(data);
  if (defaults.funnelId === "") defaults.funnelId = null;
  const lead = await leadPostgresRepository.create(context, defaults);

  notifyNewLead(context, lead)
    .then((customer) => customer && updateLeadStatus(context, lead.id, "Müşteri Oldu"))
    .catch((error) =>
      logger.error(`Yeni lead karşılama otomasyonu hatası: tenant=${context.tenantId} lead=${lead.id} — ${error.message}`),
    );

  return lead;
}

export async function deleteLead(context, id) {
  return leadPostgresRepository.softDelete(context, id);
}
