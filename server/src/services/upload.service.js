// server/src/services/upload.service.js
//
// GERİ GETİRİLDİ (bkz. git log — "no callers" varsayımı yanlıştı, bkz.
// middleware/upload.middleware.js'in başındaki not): `ListingForm.jsx`
// (ilan foto/video) ve `FunnelForm.jsx` (kampanya görsel/video) hâlâ bu
// genel yükleme ucuna bağlı. Hedef artık Firebase Storage DEĞİL, R2
// (bkz. db/storage.client.js) — tek-kiracılı mimaride tenant öneki de
// kalktı (bkz. DATA-MODEL.md'deki R2 object key kuralı).
import { randomUUID } from "node:crypto";
import { getStorageClient } from "../db/storage.client.js";
import { assertStorageWithinLimit, recordStorageUsage } from "./tenant.service.js";

const EXTENSION_BY_MIME_TYPE = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

/** `kind`: "image" | "video" | "document" — sadece object key'in önekini belirler. */
export async function uploadFile({ tenantId, buffer, mimeType, kind }) {
  await assertStorageWithinLimit(tenantId, buffer.length);

  const extension = EXTENSION_BY_MIME_TYPE[mimeType] ?? "bin";
  const objectKey = `${kind}/${randomUUID()}.${extension}`;
  const storage = await getStorageClient();
  const result = await storage.upload(buffer, objectKey, { contentType: mimeType });

  await recordStorageUsage(tenantId, buffer.length);
  return result;
}
