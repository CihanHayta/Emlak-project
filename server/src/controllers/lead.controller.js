// server/src/controllers/lead.controller.js
import * as leadService from "../services/lead.service.js";
import { getTenantById } from "../services/tenant.service.js";
import { sendSuccess } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { normalizeTrPhone, formatTrPhoneForDisplay } from "../utils/phone.js";

// --- Admin (kimlik doğrulamalı) ---

export async function listLeadsController(req, res) {
  const leads = await leadService.listLeads(req.context);
  sendSuccess(res, { data: leads });
}

export async function updateLeadStatusController(req, res) {
  const lead = await leadService.updateLeadStatus(req.context, req.params.id, req.body.status);
  sendSuccess(res, { data: lead });
}

export async function deleteLeadController(req, res) {
  await leadService.deleteLead(req.context, req.params.id);
  sendSuccess(res, { data: { ok: true } });
}

// --- Public (kimlik doğrulaması YOK — public site'ın form/servis
// popup'ları çağırır, bkz. routes/publicLead.routes.js) ---

export async function createPublicLeadController(req, res) {
  // Alanların varlığı/şekli artık createPublicLeadValidator'da doğrulanıyor
  // (bkz. routes/publicLead.routes.js) — buraya sadece temiz veri düşer.
  const { tenantId, name, phone, message, context, funnelId } = req.body;

  const tenant = await getTenantById(tenantId);
  if (!tenant) throw ApiError.notFound("Geçersiz tenant.");

  // Ne yazarsa yazsın ("5551234567", "+90 555 123 45 67", ...) kayıtta hep
  // aynı okunabilir biçimde durur — admin panelde tutarlı görünür.
  const normalizedPhone = formatTrPhoneForDisplay(normalizeTrPhone(phone));

  const publicContext = { tenantId, userId: null, role: "public" };
  const lead = await leadService.createLead(publicContext, { name, phone: normalizedPhone, message, context, funnelId });
  sendSuccess(res, { data: { id: lead.id }, status: 201 });
}
