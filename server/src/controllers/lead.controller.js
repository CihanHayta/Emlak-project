// server/src/controllers/lead.controller.js
import * as leadService from "../services/lead.service.js";
import { getTenantById } from "../services/tenant.service.js";
import { sendSuccess } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

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
  const { tenantId, name, phone, message, context } = req.body;
  if (!tenantId) throw ApiError.validation("tenantId zorunlu.");
  if (!name || !phone) throw ApiError.validation("Ad ve telefon zorunlu.");

  const tenant = await getTenantById(tenantId);
  if (!tenant) throw ApiError.notFound("Geçersiz tenant.");

  const publicContext = { tenantId, userId: null, role: "public" };
  const lead = await leadService.createLead(publicContext, { name, phone, message, context });
  sendSuccess(res, { data: { id: lead.id }, status: 201 });
}
