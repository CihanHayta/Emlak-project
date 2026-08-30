// server/src/db/storage.client.js
//
// TEK seçim noktası: hangi Storage implementasyonunun (mock disk / gerçek
// R2) aktif olduğuna sadece burada karar verilir. Üst katmanlar sadece
// `getStorageClient()` çağırır, hangisinin aktif olduğunu hiç bilmez —
// aynı arayüz (`upload/deleteFile/getSignedUrl`) korunuyor. Firestore/
// Firebase Storage kaldırıldı (bkz. docs/ARCHITECTURE.md) — tüm dosya
// depolama artık burada, R2'de.
//
// TEK-KİRACILI mimari: bu deployment sadece BİR müşteriye ait, sadece BİR
// R2 bucket'ına bağlanır — credential'lar doğrudan env değişkenlerinden
// okunuyor. Lazy singleton.
//
// R2, S3 API'siyle uyumlu olduğu için Cloudflare'in kendi dokümantasyonunun
// önerdiği gibi `@aws-sdk/client-s3` kullanılıyor — R2'ye özel bir SDK yok,
// buna ihtiyaç da yok.
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl as presign } from "@aws-sdk/s3-request-presigner";
import { mockR2Storage } from "./mock/storage.mock.js";

let liveClientPromise = null;

function readEnvConfig() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_ENDPOINT, R2_PUBLIC_URL } = process.env;
  const missing = ["R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "R2_ENDPOINT"].filter(
    (key) => !process.env[key],
  );
  if (missing.length > 0) {
    throw new Error(`getStorageClient: STORAGE_MODE=live ama eksik env değişken(ler)i: ${missing.join(", ")}`);
  }
  return {
    accountId: R2_ACCOUNT_ID,
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    bucketName: R2_BUCKET_NAME,
    endpoint: R2_ENDPOINT,
    publicUrl: R2_PUBLIC_URL || null,
  };
}

async function buildLiveStorage() {
  const config = readEnvConfig();
  const s3 = new S3Client({
    region: "auto", // R2'de bölge kavramı yok, S3 SDK'sı yine de bir değer bekliyor
    endpoint: config.endpoint,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  });

  return {
    async upload(buffer, objectKey, metadata) {
      await s3.send(
        new PutObjectCommand({
          Bucket: config.bucketName,
          Key: objectKey,
          Body: buffer,
          ContentType: metadata?.contentType,
        }),
      );
      // Bucket public bir domain'e (custom domain ya da r2.dev) bağlıysa asıl
      // public URL budur — bağlanmadıysa çağıran taraf yerine getSignedUrl
      // kullanmalı (R2'de "makePublic" gibi tek adımlı bir Firebase eşdeğeri
      // yok, public erişim bucket/domain seviyesinde açılır).
      const url = config.publicUrl ? `${config.publicUrl}/${objectKey}` : null;
      return { url, objectKey };
    },
    async deleteFile(objectKey) {
      await s3.send(new DeleteObjectCommand({ Bucket: config.bucketName, Key: objectKey }));
    },
    async getSignedUrl(objectKey, expirySeconds = 900) {
      return presign(s3, new GetObjectCommand({ Bucket: config.bucketName, Key: objectKey }), {
        expiresIn: expirySeconds,
      });
    },
    /**
     * Aşama 6 — presigned UPLOAD URL'i (Aşama 5'teki getSignedUrl bir
     * İNDİRME/GET izin bileti; bu bir YÜKLEME/PUT izin bileti). Secret key
     * hiç frontend'e gitmiyor, sadece bu TEK object_key için kısa süreli bir
     * imza gidiyor — frontend `fetch(uploadUrl, {method:'PUT', body:file,
     * headers:{'Content-Type':contentType}})` ile doğrudan R2'ye yazıyor,
     * backend dosyanın baytlarına hiç dokunmuyor.
     */
    async getUploadUrl(objectKey, { contentType, expirySeconds = 300 } = {}) {
      return presign(
        s3,
        new PutObjectCommand({ Bucket: config.bucketName, Key: objectKey, ContentType: contentType }),
        { expiresIn: expirySeconds },
      );
    },
    /**
     * Confirm adımında "istemci gerçekten yükledi mi, gerçekten iddia ettiği
     * boyut/tipte mi" diye R2'nin KENDİSİNE sorar — istemcinin gönderdiği
     * fileSize/mimeType'a asla körü körüne güvenilmez (bkz. Aşama 6 analizi,
     * "yarım/bozuk kayıt oluşmasın" gereksinimi). Nesne yoksa S3Client bunu
     * bir hata olarak fırlatır (`error.name === "NotFound"`), çağıran taraf
     * bunu "yükleme hiç tamamlanmamış" olarak yorumlamalı.
     */
    async headObject(objectKey) {
      const result = await s3.send(new HeadObjectCommand({ Bucket: config.bucketName, Key: objectKey }));
      return { contentLength: result.ContentLength, contentType: result.ContentType };
    },
    /** confirm adımında DB'ye yazılacak public URL'i üretir — bucket public bir domaine bağlı değilse null (çağıran taraf getSignedUrl'e düşmeli). */
    getPublicUrl(objectKey) {
      return config.publicUrl ? `${config.publicUrl}/${objectKey}` : null;
    },
  };
}

export async function getStorageClient() {
  const mode = process.env.STORAGE_MODE || "mock";
  if (mode === "mock") return mockR2Storage;
  if (!liveClientPromise) liveClientPromise = buildLiveStorage();
  return liveClientPromise;
}
