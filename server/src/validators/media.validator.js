// server/src/validators/media.validator.js
//
// property.validator.js/vehicle.validator.js'in Aşama 6 karşılığı —
// vehicleMedia.routes.js VE propertyMedia.routes.js'in ikisi de kullanıyor
// (medya isteklerinin şekli iki domain'de aynı, sadece hangi tabloya
// yazıldığı farklı).
import { body } from "express-validator";

const MEDIA_KINDS = ["image", "video", "document"];
const VISIBILITIES = ["public", "admin_only"];

export const createUploadIntentValidator = [
  body("kind").isString().trim().isIn(MEDIA_KINDS).withMessage('Tür "image", "video" veya "document" olmalı.'),
  body("mimeType").isString().trim().notEmpty().withMessage("MIME type zorunlu."),
  body("fileSize").optional().isInt({ min: 1 }).withMessage("Dosya boyutu pozitif bir tam sayı olmalı.").toInt(),
];

export const confirmUploadValidator = [
  body("objectKey").isString().trim().notEmpty().withMessage("object_key zorunlu."),
  body("kind").isString().trim().isIn(MEDIA_KINDS).withMessage('Tür "image", "video" veya "document" olmalı.'),
  body("mimeType").optional().isString().trim(),
  body("width").optional().isInt({ min: 1 }).toInt(),
  body("height").optional().isInt({ min: 1 }).toInt(),
  body("videoDurationSeconds").optional().isFloat({ min: 0 }).toFloat(),
  // Sadece araç medyası kullanıyor (property_media'da bu sütunlar yok) —
  // property tarafında gönderilirse addPropertyMedia'ya hiç ulaşmadan
  // sessizce yok sayılır, doğrulama zararsız.
  body("category").optional().isString().trim(),
  body("visibility").optional().isString().trim().isIn(VISIBILITIES).withMessage('Görünürlük "public" veya "admin_only" olmalı.'),
  body("documentLabel").optional().isString().trim(),
];

export const reorderMediaValidator = [
  body("orderedMediaIds").isArray({ min: 1 }).withMessage("orderedMediaIds boş olmayan bir dizi olmalı."),
  body("orderedMediaIds.*").isString().trim().notEmpty(),
];

export const setCoverMediaValidator = [body("mediaId").isString().trim().notEmpty().withMessage("mediaId zorunlu.")];
