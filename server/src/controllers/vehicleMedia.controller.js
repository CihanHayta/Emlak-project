// server/src/controllers/vehicleMedia.controller.js
//
// Aşama 6 — vehicle.postgres.service.js'e bağlı YENİ bir controller (Firestore
// tabanlı vehicle.controller.js'e HİÇ dokunulmadı, ayrı bir dosya). Bu proje
// araç ekspertiz sistemi olduğu için (fotoğraf/video/ekspertiz raporu/servis
// belgesi) bu domain'in medya akışı öncelikli — propertyMedia.controller.js
// birebir aynı desende, sadece property'ye bağlı.
import * as vehicleService from "../services/vehicle.postgres.service.js";
import { sendSuccess } from "../utils/ApiResponse.js";

export async function listVehicleMediaController(req, res) {
  const media = await vehicleService.listVehicleMedia(req.context, req.params.vehicleId);
  sendSuccess(res, { data: media });
}

/** 1. adım: presigned upload URL iste. */
export async function createUploadIntentController(req, res) {
  const intent = await vehicleService.createVehicleMediaUploadIntent(req.context, req.params.vehicleId, req.body);
  sendSuccess(res, { data: intent, status: 201 });
}

/** 2. adım: dosya R2'ye yüklendikten SONRA çağrılır, R2'de gerçekten doğrulanıp DB'ye yazılır. */
export async function confirmUploadController(req, res) {
  const media = await vehicleService.confirmVehicleMediaUpload(req.context, req.params.vehicleId, req.body);
  sendSuccess(res, { data: media, status: 201 });
}

export async function setCoverController(req, res) {
  const media = await vehicleService.setCoverVehicleMedia(req.context, req.params.vehicleId, req.body.mediaId);
  sendSuccess(res, { data: media });
}

export async function reorderController(req, res) {
  await vehicleService.reorderVehicleMedia(req.context, req.params.vehicleId, req.body.orderedMediaIds);
  sendSuccess(res, { data: { ok: true } });
}

export async function deleteMediaController(req, res) {
  await vehicleService.deleteVehicleMedia(req.context, req.params.vehicleId, req.params.mediaId);
  sendSuccess(res, { data: { ok: true } });
}
