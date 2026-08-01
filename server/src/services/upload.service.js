// server/src/services/upload.service.js
import { randomUUID } from "node:crypto";
import { getStorageClient } from "../firebase/storage.client.js";
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

/**
 * `kind`: "image" | "video" | "document" — sadece storage yolunu ayırmak için.
 * Her dosya yükleyen tenant'ın kendi klasörü altına yazılır
 * (`tenants/{tenantId}/{kind}/{uuid}.{ext}`) — hem farklı firmaların
 * dosyalarının Storage'da karışmaması hem de bir tenant silindiğinde tüm
 * dosyalarının tek bir prefix altında kolayca bulunup silinebilmesi için.
 */
export async function uploadFile({ tenantId, buffer, mimeType, kind }) {
  await assertStorageWithinLimit(tenantId, buffer.length);

  const extension = EXTENSION_BY_MIME_TYPE[mimeType] ?? "bin";
  const storagePath = `tenants/${tenantId}/${kind}/${randomUUID()}.${extension}`;
  const storage = await getStorageClient();
  const result = await storage.upload(buffer, storagePath, { contentType: mimeType });

  await recordStorageUsage(tenantId, buffer.length);
  return result;
}
