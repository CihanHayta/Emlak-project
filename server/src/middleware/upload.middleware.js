// server/src/middleware/upload.middleware.js
import multer from "multer";
import { UPLOAD_LIMITS } from "../config/constants.js";
import { ApiError } from "../utils/ApiError.js";

// Disk'e hiç yazmıyoruz — buffer bellekte tutulur, doğrudan Firebase
// Storage'a gönderilir (bkz. services/upload.service.js, Faz 4). Bu yüzden
// projede src/uploads/ diye bir klasör YOK ve olmamalı.
const storage = multer.memoryStorage();

/**
 * `kind`: "image" | "video" | "document" — UPLOAD_LIMITS'teki boyut/mime
 * kurallarını uygular. Reddedilen dosya, multer'ın kendi hata mekanizması
 * yerine bizim ApiError/error.middleware zincirimize düşer.
 */
export function uploadMiddleware(kind, fieldName = "file") {
  const limits = UPLOAD_LIMITS[kind];
  if (!limits) throw new Error(`Bilinmeyen upload türü: "${kind}"`);

  const uploader = multer({
    storage,
    limits: { fileSize: limits.maxSizeBytes },
    fileFilter(_req, file, cb) {
      if (!limits.mimeTypes.includes(file.mimetype)) {
        cb(ApiError.validation(`Desteklenmeyen dosya türü: ${file.mimetype}. İzin verilenler: ${limits.mimeTypes.join(", ")}`));
        return;
      }
      cb(null, true);
    },
  }).single(fieldName);

  return function handleUpload(req, res, next) {
    uploader(req, res, (err) => {
      if (!err) return next();
      if (err.code === "LIMIT_FILE_SIZE") {
        return next(ApiError.validation(`Dosya çok büyük — izin verilen üst sınır: ${Math.round(limits.maxSizeBytes / (1024 * 1024))}MB.`));
      }
      next(err);
    });
  };
}
