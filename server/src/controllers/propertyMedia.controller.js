// server/src/controllers/propertyMedia.controller.js
// vehicleMedia.controller.js ile birebir aynı desen, property.postgres.service.js'e bağlı.
import * as propertyService from "../services/property.postgres.service.js";
import { sendSuccess } from "../utils/ApiResponse.js";

export async function listPropertyMediaController(req, res) {
  const media = await propertyService.listPropertyMedia(req.context, req.params.propertyId);
  sendSuccess(res, { data: media });
}

export async function createUploadIntentController(req, res) {
  const intent = await propertyService.createPropertyMediaUploadIntent(req.context, req.params.propertyId, req.body);
  sendSuccess(res, { data: intent, status: 201 });
}

export async function confirmUploadController(req, res) {
  const media = await propertyService.confirmPropertyMediaUpload(req.context, req.params.propertyId, req.body);
  sendSuccess(res, { data: media, status: 201 });
}

export async function setCoverController(req, res) {
  const media = await propertyService.setCoverPropertyMedia(req.context, req.params.propertyId, req.body.mediaId);
  sendSuccess(res, { data: media });
}

export async function reorderController(req, res) {
  await propertyService.reorderPropertyMedia(req.context, req.params.propertyId, req.body.orderedMediaIds);
  sendSuccess(res, { data: { ok: true } });
}

export async function deleteMediaController(req, res) {
  await propertyService.deletePropertyMedia(req.context, req.params.propertyId, req.params.mediaId);
  sendSuccess(res, { data: { ok: true } });
}
