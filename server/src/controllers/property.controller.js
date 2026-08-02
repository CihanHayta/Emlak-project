// server/src/controllers/property.controller.js
import * as propertyService from "../services/property.service.js";
import { getTenantById } from "../services/tenant.service.js";
import { sendSuccess } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

export async function listPropertiesController(req, res) {
  const properties = await propertyService.listProperties(req.context);
  sendSuccess(res, { data: properties });
}

export async function getPropertyController(req, res) {
  const property = await propertyService.getProperty(req.context, req.params.id);
  sendSuccess(res, { data: property });
}

export async function createPropertyController(req, res) {
  const created = await propertyService.createProperty(req.context, req.body);
  sendSuccess(res, { data: created, status: 201 });
}

export async function updatePropertyController(req, res) {
  const updated = await propertyService.updateProperty(req.context, req.params.id, req.body);
  sendSuccess(res, { data: updated });
}

export async function deletePropertyController(req, res) {
  await propertyService.deleteProperty(req.context, req.params.id);
  sendSuccess(res, { data: { ok: true } });
}

// --- Public (kimlik doğrulaması yok) — public site'ın Satılık/Kiralık/Ana
// Sayfa/İlan Detay ekranları bunu çağırır. tenantId query param'dan gelir
// (frontend VITE_TENANT_ID'den okur) — bkz. publicLead.routes.js'teki aynı
// desen.
export async function listPublicPropertiesController(req, res) {
  const { tenantId } = req.query;
  if (!tenantId) throw ApiError.validation("tenantId zorunlu.");
  const tenant = await getTenantById(tenantId);
  if (!tenant) throw ApiError.notFound("Geçersiz tenant.");

  const publicContext = { tenantId, userId: null, role: "public" };
  const properties = await propertyService.listProperties(publicContext);
  sendSuccess(res, { data: properties });
}

export async function getPublicPropertyController(req, res) {
  const { tenantId } = req.query;
  if (!tenantId) throw ApiError.validation("tenantId zorunlu.");

  const publicContext = { tenantId, userId: null, role: "public" };
  const property = await propertyService.getProperty(publicContext, req.params.id);
  sendSuccess(res, { data: property });
}
