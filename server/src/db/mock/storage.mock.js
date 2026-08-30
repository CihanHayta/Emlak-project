// server/src/db/mock/storage.mock.js
//
// STORAGE_MODE=mock iken kullanılan sahte R2 — dosyayı GERÇEKTEN diske
// yazar, gerçek bir dosya yükleme akışını R2 kurulmadan da uçtan uca test
// edilebilir kılar. Bu deployment TEK-KİRACILI (kendi bucket'ına sahip) —
// bucket içi bir tenant önekine gerek yok, anahtar doğrudan `{kind}/{uuid}.{ext}`.
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../../config/env.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const MOCK_R2_ROOT = path.resolve(__dirname, "../../../.mock-r2");

// Gerçek R2 (S3), PutObjectCommand'daki ContentType'ı nesneyle birlikte
// SAKLAR ve HeadObjectCommand'da geri döner — mock'un `headObject`'inin
// bunu DOĞRU taklit edebilmesi için ham baytların yanına küçük bir
// ".meta.json" sidecar dosyası yazılıyor (gerçek R2'de böyle bir dosya
// yok, bu SADECE mock'un kendi iç defteri).
function metaPath(fullPath) {
  return `${fullPath}.meta.json`;
}

async function upload(buffer, objectKey, metadata) {
  const fullPath = path.join(MOCK_R2_ROOT, objectKey);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, buffer);
  if (metadata?.contentType) {
    await fs.writeFile(metaPath(fullPath), JSON.stringify({ contentType: metadata.contentType }));
  }
  return { url: `http://localhost:${env.port}/mock-r2/${objectKey}`, objectKey, contentType: metadata?.contentType };
}

async function deleteFile(objectKey) {
  const fullPath = path.join(MOCK_R2_ROOT, objectKey);
  await fs.rm(fullPath, { force: true });
  await fs.rm(metaPath(fullPath), { force: true });
}

async function getSignedUrl(objectKey) {
  // Mock modda gerçek bir presigned URL yok — dosya zaten doğrudan servis
  // ediliyor, aynı public URL'i döneriz (firebase mock'undaki desenin aynısı).
  return `http://localhost:${env.port}/mock-r2/${objectKey}`;
}

/**
 * Aşama 6 — gerçek R2'deki presigned PUT'un mock karşılığı. app.js'teki
 * `PUT /mock-r2-upload/:objectKey(*)` route'una (STORAGE_MODE=mock iken
 * bağlanır) işaret eder — frontend gerçek akıştaki AYNI kod yolunu
 * (`fetch(uploadUrl, {method:'PUT', body:file})`) mock modda da test
 * edebilsin diye. Süre/imza kavramı yok (mock'ta güvenlik zaten simüle
 * edilmiyor), sadece arayüz uyumluluğu için `expirySeconds` parametresi kabul edilir.
 */
async function getUploadUrl(objectKey) {
  return `http://localhost:${env.port}/mock-r2-upload/${objectKey}`;
}

async function headObject(objectKey) {
  const fullPath = path.join(MOCK_R2_ROOT, objectKey);
  try {
    const stat = await fs.stat(fullPath);
    let contentType = null;
    try {
      contentType = JSON.parse(await fs.readFile(metaPath(fullPath), "utf8")).contentType;
    } catch {
      // Sidecar yoksa (upload metadata'sız yapıldıysa) contentType null kalır — gerçek R2'de de ContentType hiç verilmeden PUT edilebilir.
    }
    return { contentLength: stat.size, contentType };
  } catch (error) {
    if (error.code === "ENOENT") {
      const notFound = new Error(`Mock R2: "${objectKey}" bulunamadı.`);
      notFound.name = "NotFound";
      throw notFound;
    }
    throw error;
  }
}

function getPublicUrl(objectKey) {
  return `http://localhost:${env.port}/mock-r2/${objectKey}`;
}

export const mockR2Storage = { upload, deleteFile, getSignedUrl, getUploadUrl, headObject, getPublicUrl };
