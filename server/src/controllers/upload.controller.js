// server/src/controllers/upload.controller.js
import { uploadFile } from "../services/upload.service.js";
import { sendSuccess } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

async function handleUpload(req, res, kind) {
  if (!req.file) throw ApiError.validation("Yüklenecek dosya bulunamadı.");
  const result = await uploadFile({
    tenantId: req.context.tenantId,
    buffer: req.file.buffer,
    mimeType: req.file.mimetype,
    kind,
  });
  sendSuccess(res, { data: result, status: 201 });
}

export const uploadImage = (req, res) => handleUpload(req, res, "image");
export const uploadVideo = (req, res) => handleUpload(req, res, "video");
export const uploadDocument = (req, res) => handleUpload(req, res, "document");
