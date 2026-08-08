// server/src/controllers/vehicle.controller.js
import * as vehicleService from "../services/vehicle.service.js";
import { getTenantById } from "../services/tenant.service.js";
import { sendSuccess } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

export async function listVehiclesController(req, res) {
  const vehicles = await vehicleService.listVehicles(req.context);
  sendSuccess(res, { data: vehicles });
}

export async function getVehicleController(req, res) {
  const vehicle = await vehicleService.getVehicle(req.context, req.params.id);
  sendSuccess(res, { data: vehicle });
}

export async function createVehicleController(req, res) {
  const created = await vehicleService.createVehicle(req.context, req.body);
  sendSuccess(res, { data: created, status: 201 });
}

export async function updateVehicleController(req, res) {
  const updated = await vehicleService.updateVehicle(req.context, req.params.id, req.body);
  sendSuccess(res, { data: updated });
}

export async function deleteVehicleController(req, res) {
  await vehicleService.deleteVehicle(req.context, req.params.id);
  sendSuccess(res, { data: { ok: true } });
}

// --- Public (kimlik doğrulaması yok) — property.controller.js'in
// listPublicPropertiesController/getPublicPropertyController'ıyla birebir
// aynı desen, bkz. o dosyanın yorumu.
export async function listPublicVehiclesController(req, res) {
  const { tenantId } = req.query;
  if (!tenantId) throw ApiError.validation("tenantId zorunlu.");
  const tenant = await getTenantById(tenantId);
  if (!tenant) throw ApiError.notFound("Geçersiz tenant.");

  const publicContext = { tenantId, userId: null, role: "public" };
  const vehicles = await vehicleService.listVehicles(publicContext);
  sendSuccess(res, { data: vehicles });
}

export async function getPublicVehicleController(req, res) {
  const { tenantId } = req.query;
  if (!tenantId) throw ApiError.validation("tenantId zorunlu.");

  const publicContext = { tenantId, userId: null, role: "public" };
  const vehicle = await vehicleService.getVehicle(publicContext, req.params.id);
  sendSuccess(res, { data: vehicle });
}
