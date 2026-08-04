// server/src/controllers/funnel.controller.js
import * as funnelService from "../services/funnel.service.js";
import { getTenantById } from "../services/tenant.service.js";
import { sendSuccess } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

// --- Admin (kimlik doğrulamalı) ---

export async function listFunnelsController(req, res) {
  const funnels = await funnelService.listFunnels(req.context);
  sendSuccess(res, { data: funnels });
}

export async function getFunnelController(req, res) {
  const funnel = await funnelService.getFunnel(req.context, req.params.id);
  sendSuccess(res, { data: funnel });
}

export async function createFunnelController(req, res) {
  const funnel = await funnelService.createFunnel(req.context, req.body);
  sendSuccess(res, { data: funnel, status: 201 });
}

export async function updateFunnelController(req, res) {
  const funnel = await funnelService.updateFunnel(req.context, req.params.id, req.body);
  sendSuccess(res, { data: funnel });
}

export async function deleteFunnelController(req, res) {
  await funnelService.deleteFunnel(req.context, req.params.id);
  sendSuccess(res, { data: { ok: true } });
}

// --- Public (kimlik doğrulaması YOK — kampanya sayfası çağırır, bkz.
// routes/publicFunnel.routes.js. lead.controller.js'in public uç
// noktasıyla aynı desen: tenantId query/body'den gelir.) ---

export async function getPublicFunnelController(req, res) {
  const { tenantId } = req.query;
  if (!tenantId) throw ApiError.validation("tenantId zorunlu.");

  const tenant = await getTenantById(tenantId);
  if (!tenant) throw ApiError.notFound("Geçersiz tenant.");

  const publicContext = { tenantId, userId: null, role: "public" };
  const funnel = await funnelService.getPublicFunnelBySlug(publicContext, req.params.slug);
  if (!funnel) throw ApiError.notFound("Kampanya sayfası bulunamadı.");
  sendSuccess(res, { data: funnel });
}
