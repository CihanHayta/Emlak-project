// server/src/services/mediaUpload.helpers.js
//
// property.postgres.service.js VE vehicle.postgres.service.js'in Aşama 6
// (presigned upload) mantığında paylaştığı SAF fonksiyonlar — mime/boyut
// doğrulaması ve object_key üretimi iki domain'de de birebir aynı, tek bir
// yerde tutulması "iki yerde birbirinden sessizce sapabilecek aynı kural"
// riskini ortadan kaldırıyor. UPLOAD_LIMITS, upload.service.js'teki (Firebase
// dönemi) AYNI sınırlar — mekanik bir taşıma, yeni bir kural icat edilmedi.
import { randomUUID } from "node:crypto";
import { UPLOAD_LIMITS } from "../config/constants.js";
import { ApiError } from "../utils/ApiError.js";

const EXTENSION_BY_MIME_TYPE = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "application/pdf": "pdf",
};

/**
 * `kind`: "image" | "video" | "document". `fileSize` opsiyonel (presign
 * anında istemcinin İDDİA ettiği boyut — kesin doğrulama confirm adımında
 * R2'nin kendi HeadObject yanıtına göre AYRICA yapılır, bkz.
 * storage.client.js#headObject'in kendi yorumu).
 */
export function assertValidUpload(kind, mimeType, fileSize) {
  const limits = UPLOAD_LIMITS[kind];
  if (!limits) throw ApiError.validation(`Bilinmeyen medya türü: "${kind}". Beklenen: image, video, document.`);
  if (!limits.mimeTypes.includes(mimeType)) {
    throw ApiError.validation(`Desteklenmeyen dosya türü: ${mimeType}. İzin verilenler: ${limits.mimeTypes.join(", ")}`);
  }
  if (fileSize && fileSize > limits.maxSizeBytes) {
    throw ApiError.validation(`Dosya çok büyük — izin verilen üst sınır: ${Math.round(limits.maxSizeBytes / (1024 * 1024))}MB.`);
  }
}

/**
 * `properties/{propertyId}/{kind}/{uuid}.{ext}` / `vehicles/{vehicleId}/{kind}/{uuid}.{ext}`
 * — orijinal brief'in Aşama 8'inde istenen, kayıt-başına gruplu klasör yapısı
 * (Aşama 2'de tenant-başına-bucket kararıyla düşen `tenants/{id}/` önekinin
 * YERİNE geçiyor). Kullanıcının orijinal dosya adı ASLA kullanılmaz — her
 * zaman rastgele UUID, path traversal/tahmin saldırılarını engellemek için
 * (bkz. crypto.randomUUID, tahmin edilemez).
 */
export function buildObjectKey(namespace, recordId, kind, mimeType) {
  const extension = EXTENSION_BY_MIME_TYPE[mimeType] ?? "bin";
  return `${namespace}/${recordId}/${kind}/${randomUUID()}.${extension}`;
}

/**
 * IDOR koruması: confirm adımına gelen `objectKey`nin GERÇEKTEN presign
 * adımında BU kayıt için üretilmiş bir key olduğunu doğrular — aksi halde
 * bir kullanıcı, kendi ilanına, BAŞKA bir ilan/tenant için üretilmiş
 * (örn. daha önce görmüş olduğu) bir object_key'i "confirm" ederek
 * bağlayabilirdi. Namespace + recordId object_key'e GÖMÜLÜ olduğu için bu
 * kontrol tek bir string prefix karşılaştırmasıyla yapılabiliyor.
 */
export function assertObjectKeyBelongsToRecord(objectKey, namespace, recordId) {
  const expectedPrefix = `${namespace}/${recordId}/`;
  if (typeof objectKey !== "string" || !objectKey.startsWith(expectedPrefix)) {
    throw ApiError.forbidden("Bu object_key bu kayda ait değil.");
  }
}
