// server/src/services/property.postgres.service.js
//
// property.service.js'in (Firestore) PostgreSQL karşılığı — AYNI iş
// kurallarını (yayın görünürlüğü, soft-delete + medya temizliği, İlan
// Eşleşmesi otomasyonu) korur. property.service.js'in KENDİSİ bu dosyada
// DEĞİŞTİRİLMEDİ ama artık controllers/property.controller.js BU dosyaya
// (Postgres) bağlı — bkz. Aşama 11 cutover.
//
// AŞAMA 11: notifyIfPublished/notifyMatchingCustomersForListing hook'u GERİ
// EKLENDİ — automation.service.js artık customers/automationEvents için
// Postgres repository'lerini kullanıyor (bkz. o dosyanın kendi yorumu),
// yani bu otomasyon artık GERÇEKTEN Postgres'teki müşterileri görüyor.
//
// *** BİLEREK DEĞİŞEN DAVRANIŞ ***: `images`/`image`/`videoUrl`/`videoDuration`
// artık properties tablosunda YOK (bkz. migrations, property_media'ya
// ayrıştırıldı) — createProperty/updateProperty'ye bu alanlar gönderilirse
// SESSİZCE YOK SAYILIR (properties tablosuna hiç yazılmaya çalışılmaz).
// Medya artık addPropertyMedia/listPropertyMedia/setCoverPropertyMedia/
// reorderPropertyMedia/deletePropertyMedia ile AYRI yönetiliyor — bu,
// R2'nin object_key/mime_type/boyut gibi bir çıplak URL string'inden asla
// güvenilir biçimde çıkarılamayacak metadata'ya ihtiyaç duymasının doğal
// sonucu.
import { propertyPostgresRepository } from "../repositories/property.postgres.repository.js";
import { propertyMediaPostgresRepository } from "../repositories/propertyMedia.postgres.repository.js";
import { createDefaultProperty } from "../models/property.model.js";
import { withUpdateFields } from "../models/base.model.js";
import { getStorageClient } from "../db/storage.client.js";
import { assertValidUpload, buildObjectKey, assertObjectKeyBelongsToRecord } from "./mediaUpload.helpers.js";
import { notifyMatchingCustomersForListing } from "./automation.service.js";
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../config/logger.js";

const MEDIA_NAMESPACE = "properties";

const MEDIA_ONLY_FIELDS = ["image", "images", "videoUrl", "videoDuration"];

function stripMediaOnlyFields(data) {
  const copy = { ...data };
  for (const field of MEDIA_ONLY_FIELDS) delete copy[field];
  return copy;
}

/** property.service.js#isHiddenFromPublic ile birebir aynı kural. */
function isHiddenFromPublic(property) {
  return property.status === "unpublished";
}

export async function listProperties(context) {
  const properties = await propertyPostgresRepository.findAll(context);
  return context.role === "public" ? properties.filter((p) => !isHiddenFromPublic(p)) : properties;
}

export async function getProperty(context, id) {
  const property = await propertyPostgresRepository.findById(context, id);
  if (!property) throw ApiError.notFound("İlan bulunamadı.");
  if (context.role === "public" && isHiddenFromPublic(property)) throw ApiError.notFound("İlan bulunamadı.");
  return property;
}

/** property.service.js#notifyIfPublished ile birebir aynı — response'u bloklamayan floating promise. */
function notifyIfPublished(context, property) {
  if (property.status === "unpublished") return;
  notifyMatchingCustomersForListing(context, property).catch((error) =>
    logger.error(`İlan eşleşme otomasyonu hatası: tenant=${context.tenantId} property=${property.id} — ${error.message}`),
  );
}

export async function createProperty(context, data) {
  const defaults = stripMediaOnlyFields(createDefaultProperty(data));
  const created = await propertyPostgresRepository.create(context, defaults);
  notifyIfPublished(context, created);
  return created;
}

export async function updateProperty(context, id, updates) {
  const previous = await propertyPostgresRepository.findById(context, id);
  const safeUpdates = withUpdateFields(stripMediaOnlyFields(updates), { actorUserId: context.userId });
  const updated = await propertyPostgresRepository.update(context, id, safeUpdates);
  // Sadece taslak -> yayın GEÇİŞİNDE bildir — zaten yayındaki bir ilanın her
  // güncellemesinde tekrar tekrar bildirim gitmesin diye (property.service.js ile aynı kural).
  if (previous?.status === "unpublished" && updated.status === "published") {
    notifyIfPublished(context, updated);
  }
  return updated;
}

/**
 * Property satırı soft-delete edilir (Firestore versiyonuyla tutarlı — yanlış
 * silinen bir ilan geri getirilebilir). property_media satırları da AYNI
 * transaction'da soft-delete edilir (bkz. propertyMediaPostgresRepository ——
 * hayır, ayrı bir transaction gerekmiyor çünkü ikisi de basit UPDATE'ler ve
 * media satırlarının soft-delete'i property'nin soft-delete'ine bağımlı değil,
 * media_id bazında bağımsız çalışabilir). R2'deki gerçek dosyalar DB
 * işlemleri BAŞARIYLA bittikten SONRA, best-effort silinir — property.service.js'in
 * orijinal `.catch(() => {})` davranışıyla AYNI risk kabulü: bir dosya
 * silme hatası property'nin silinmiş sayılmasını ASLA engellemez (aksi halde
 * bir R2 hatası kullanıcının "sil" isteğini tamamen bloklardı), olası sonuç
 * en kötü ihtimalle R2'de yetim bir dosya — orijinal koddaki AYNI kabul edilebilir risk.
 */
export async function deleteProperty(context, id) {
  await getProperty(context, id); // varlık + tenant sahipliği + görünürlük kontrolü (IDOR)
  const media = await propertyMediaPostgresRepository.listByProperty(context.tenantId, id);

  const deleted = await propertyPostgresRepository.softDelete(context, id);
  for (const item of media) {
    // eslint-disable-next-line no-await-in-loop -- birkaç medya dosyası, sıralı silme yeterli (orijinal property.service.js ile aynı desen).
    await propertyMediaPostgresRepository.softDelete(context.tenantId, id, item.id);
  }

  const storage = await getStorageClient();
  for (const item of media) {
    // eslint-disable-next-line no-await-in-loop
    await storage.deleteFile(item.objectKey).catch(() => {});
  }

  return deleted;
}

// --- property_media ---
//
// *** IDOR SÖZLEŞMESİ ***: propertyMediaPostgresRepository'nin KENDİSİ
// property_id'nin context.tenantId'ye ait olduğunu KONTROL ETMEZ (bkz. o
// dosyanın kendi yorumu) — bu kontrol burada, HER fonksiyonun ilk satırında
// `getProperty(context, propertyId)` çağrılarak yapılıyor. `getProperty`
// zaten tenant-scoped `findById` kullanıyor (base.postgres.repository.js)
// ve bulunamazsa/başka tenant'a aitse ApiError.notFound fırlatıyor — yani
// tenant B, tenant A'nın property'sine medya eklemeye/silmeye/sıralamaya
// çalışırsa "İlan bulunamadı" alır, property_media tablosuna hiç dokunulmaz.

export async function listPropertyMedia(context, propertyId) {
  await getProperty(context, propertyId); // IDOR kontrolü
  return propertyMediaPostgresRepository.listByProperty(context.tenantId, propertyId);
}

/**
 * Aşama 6 — 1. adım: "bu dosyayı yüklemek istiyorum" isteği. R2'ye HİÇ dosya
 * gitmedi, DB'ye HİÇ satır yazılmadı — sadece kısa süreli bir yükleme izni
 * (presigned URL) üretilir. Frontend bunu alıp dosyayı DOĞRUDAN R2'ye PUT
 * eder, backend bayt akışına hiç dokunmaz (bkz. db/storage.client.js#getUploadUrl'in
 * kendi yorumu).
 */
export async function createPropertyMediaUploadIntent(context, propertyId, { kind, mimeType, fileSize }) {
  await getProperty(context, propertyId); // IDOR + varlık kontrolü
  assertValidUpload(kind, mimeType, fileSize);

  const objectKey = buildObjectKey(MEDIA_NAMESPACE, propertyId, kind, mimeType);
  const storage = await getStorageClient();
  const expiresIn = 300;
  const uploadUrl = await storage.getUploadUrl(objectKey, { contentType: mimeType, expirySeconds: expiresIn });
  return { uploadUrl, objectKey, expiresIn };
}

/**
 * Aşama 6 — 2. adım: frontend "yükledim" dedikten SONRA çağrılır. İstemcinin
 * hiçbir iddiasına (boyut/tip) körü körüne güvenilmez — R2'nin KENDİSİNE
 * (`headObject`) sorulur, gerçek sonuç DB'ye o şekilde yazılır. Dosya R2'de
 * yoksa (yükleme hiç tamamlanmadıysa) hiçbir DB satırı OLUŞTURULMAZ — "yarım/
 * bozuk kayıt" sınıfı bir hata burada yapısal olarak imkânsız.
 */
export async function confirmPropertyMediaUpload(context, propertyId, input) {
  await getProperty(context, propertyId); // IDOR kontrolü
  assertObjectKeyBelongsToRecord(input.objectKey, MEDIA_NAMESPACE, propertyId);

  const storage = await getStorageClient();
  let head;
  try {
    head = await storage.headObject(input.objectKey);
  } catch (error) {
    if (error.name === "NotFound") {
      throw ApiError.validation("Dosya R2'de bulunamadı — yükleme tamamlanmamış olabilir, tekrar deneyin.");
    }
    throw error;
  }
  assertValidUpload(input.kind, head.contentType ?? input.mimeType, head.contentLength);

  return addPropertyMedia(context, propertyId, {
    kind: input.kind,
    objectKey: input.objectKey,
    url: storage.getPublicUrl(input.objectKey),
    mimeType: head.contentType ?? input.mimeType,
    fileSize: head.contentLength,
    width: input.width ?? null,
    height: input.height ?? null,
    videoDurationSeconds: input.videoDurationSeconds ?? null,
  });
}

export async function addPropertyMedia(context, propertyId, mediaInput) {
  await getProperty(context, propertyId); // IDOR kontrolü

  const existing = await propertyMediaPostgresRepository.listByProperty(context.tenantId, propertyId);
  const position = mediaInput.position ?? existing.length;
  const isCover = mediaInput.isCover ?? existing.length === 0; // ilk yüklenen foto otomatik kapak olur

  const created = await propertyMediaPostgresRepository.create(context.tenantId, propertyId, {
    ...mediaInput,
    position,
    isCover: false, // önce false ekle, kapaksa setCover ile ata — aynı anda iki kapak oluşmasını (unique index çakışması) önler
  });

  if (isCover) {
    return propertyMediaPostgresRepository.setCover(context.tenantId, propertyId, created.id);
  }
  if (mediaInput.kind === "video") {
    await propertyPostgresRepository.update(context, propertyId, { hasVideo: true });
  }
  return created;
}

export async function setCoverPropertyMedia(context, propertyId, mediaId) {
  await getProperty(context, propertyId); // IDOR kontrolü
  return propertyMediaPostgresRepository.setCover(context.tenantId, propertyId, mediaId);
}

export async function reorderPropertyMedia(context, propertyId, orderedMediaIds) {
  await getProperty(context, propertyId); // IDOR kontrolü
  return propertyMediaPostgresRepository.reorder(context.tenantId, propertyId, orderedMediaIds);
}

export async function deletePropertyMedia(context, propertyId, mediaId) {
  await getProperty(context, propertyId); // IDOR kontrolü
  const deleted = await propertyMediaPostgresRepository.softDelete(context.tenantId, propertyId, mediaId);
  if (!deleted) throw ApiError.notFound("Medya bulunamadı.");

  const storage = await getStorageClient();
  await storage.deleteFile(deleted.objectKey).catch(() => {});

  const remaining = await propertyMediaPostgresRepository.listByProperty(context.tenantId, propertyId);
  if (!remaining.some((item) => item.kind === "video")) {
    await propertyPostgresRepository.update(context, propertyId, { hasVideo: false });
  }
  return deleted;
}
