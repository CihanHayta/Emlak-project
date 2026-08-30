// server/src/services/vehicle.postgres.service.js
// vehicle.service.js'in (Firestore) PostgreSQL karşılığı — property.postgres.service.js
// ile AYNI desen (medya ayrı tabloya ayrıştı, `images`/`videoUrl`/`documents`/
// `expertiseReportUrl` artık vehicles tablosunda YOK, sessizce yok sayılır).
//
// `adminNotes` HÂLÂ vehicles tablosunun kendi sütunu (media DEĞİL) — bu
// yüzden public sanitizasyonu (vehicle.service.js#toPublicVehicle) burada
// da AYNEN korunuyor. `documents` medyasının public'e sızmaması artık AYRICA
// vehicle_media'nın `visibility` sütunuyla sorgu seviyesinde de garanti
// (bkz. vehicleMediaPostgresRepository#listByVehicle{includeAdminOnly:false}).
import { vehiclePostgresRepository } from "../repositories/vehicle.postgres.repository.js";
import { vehicleMediaPostgresRepository } from "../repositories/vehicleMedia.postgres.repository.js";
import { createDefaultVehicle } from "../models/vehicle.model.js";
import { withUpdateFields } from "../models/base.model.js";
import { getStorageClient } from "../db/storage.client.js";
import { assertValidUpload, buildObjectKey, assertObjectKeyBelongsToRecord } from "./mediaUpload.helpers.js";
import { ApiError } from "../utils/ApiError.js";

const MEDIA_NAMESPACE = "vehicles";

const MEDIA_ONLY_FIELDS = [
  "image",
  "images",
  "imageCategories",
  "videoUrl",
  "videoDuration",
  "expertiseReportUrl",
  "expertiseReportName",
  "documents",
];
const ADMIN_ONLY_SCALAR_FIELDS = ["adminNotes"];

function stripMediaOnlyFields(data) {
  const copy = { ...data };
  for (const field of MEDIA_ONLY_FIELDS) delete copy[field];
  return copy;
}

function toPublicVehicle(vehicle) {
  const sanitized = { ...vehicle };
  for (const field of ADMIN_ONLY_SCALAR_FIELDS) delete sanitized[field];
  return sanitized;
}

function sanitizeForContext(context, vehicle) {
  return context.role === "public" ? toPublicVehicle(vehicle) : vehicle;
}

function isHiddenFromPublic(vehicle) {
  return vehicle.status === "unpublished";
}

const EXPERTISE_CATEGORY = "ekspertiz"; // VehicleMediaSection.jsx#EXPERTISE_CATEGORY ile AYNI sabit.

/**
 * BUG DÜZELTMESİ (property.postgres.service.js#withGalleryFields ile AYNI
 * kök sebep/çözüm — bkz. o dosyanın yorumu): `image`/`images`/`videoUrl`/
 * `expertiseReportUrl`/`expertiseReportName` artık `vehicles` tablosunda
 * YOK (vehicle_media'ya ayrıştırıldı), ama VehicleDetail.jsx/PropertyCard.jsx/
 * Listings sayfaları hâlâ bu düz alanları bekliyor. Okuma anında iki tabloyu
 * birleştiren KÜÇÜK bir katman — vehicle_media TEK doğruluk kaynağı olmaya
 * devam ediyor, burada hiçbir şey YAZILMIYOR.
 */
function toGalleryFields(mediaList) {
  const images = mediaList.filter((m) => m.kind === "image").map((m) => m.url); // listByVehicle zaten position ASC sıralı döner
  const cover = mediaList.find((m) => m.isCover && m.kind === "image");
  const video = mediaList.find((m) => m.kind === "video");
  const expertiseDoc = mediaList.find((m) => m.kind === "document" && m.category === EXPERTISE_CATEGORY);
  return {
    images,
    image: cover?.url ?? images[0] ?? "",
    videoUrl: video?.url ?? null,
    expertiseReportUrl: expertiseDoc?.url ?? null,
    expertiseReportName: expertiseDoc?.documentLabel ?? null,
  };
}

async function withGalleryFields(context, vehicle) {
  const media = await vehicleMediaPostgresRepository.listByVehicle(context.tenantId, vehicle.id, {
    includeAdminOnly: context.role !== "public",
  });
  return { ...vehicle, ...toGalleryFields(media) };
}

export async function listVehicles(context) {
  const vehicles = await vehiclePostgresRepository.findAll(context);
  const visible = context.role === "public" ? vehicles.filter((v) => !isHiddenFromPublic(v)) : vehicles;
  // Liste görünümü için de galeri alanları gerekiyor (kapak fotoğrafı) —
  // property.postgres.service.js#listProperties'teki AYNI basitlik/performans
  // kararı (N ayrı sorgu, bu ölçekte kabul edilebilir).
  const withMedia = await Promise.all(visible.map((vehicle) => withGalleryFields(context, vehicle)));
  return withMedia.map((vehicle) => sanitizeForContext(context, vehicle));
}

export async function getVehicle(context, id) {
  const vehicle = await vehiclePostgresRepository.findById(context, id);
  if (!vehicle) throw ApiError.notFound("Araç bulunamadı.");
  if (context.role === "public" && isHiddenFromPublic(vehicle)) throw ApiError.notFound("Araç bulunamadı.");
  return sanitizeForContext(context, await withGalleryFields(context, vehicle));
}

export async function createVehicle(context, data) {
  const created = await vehiclePostgresRepository.create(context, stripMediaOnlyFields(createDefaultVehicle(data)));
  // Yeni oluşturulan bir aracın henüz medyası yoktur ama tutarlılık için
  // (frontend cache'i — admin/data/vehicleStore.js) burada da galeri
  // alanları (boş) ekleniyor.
  return withGalleryFields(context, created);
}

export async function updateVehicle(context, id, updates) {
  const updated = await vehiclePostgresRepository.update(context, id, withUpdateFields(stripMediaOnlyFields(updates), { actorUserId: context.userId }));
  return withGalleryFields(context, updated);
}

/** property.postgres.service.js#deleteProperty ile birebir aynı sıralama/risk kabulü. */
export async function deleteVehicle(context, id) {
  await getVehicle(context, id); // varlık + tenant sahipliği kontrolü (IDOR)
  const media = await vehicleMediaPostgresRepository.listByVehicle(context.tenantId, id);

  const deleted = await vehiclePostgresRepository.softDelete(context, id);
  for (const item of media) {
    // eslint-disable-next-line no-await-in-loop -- birkaç medya/belge dosyası, sıralı silme yeterli.
    await vehicleMediaPostgresRepository.softDelete(context.tenantId, id, item.id);
  }

  const storage = await getStorageClient();
  for (const item of media) {
    // eslint-disable-next-line no-await-in-loop
    await storage.deleteFile(item.objectKey).catch(() => {});
  }

  return deleted;
}

// --- vehicle_media --- (propertyMedia'daki AYNI IDOR sözleşmesi geçerli: her
// fonksiyon önce getVehicle(context, vehicleId) ile tenant sahipliğini doğrular.)

export async function listVehicleMedia(context, vehicleId) {
  await getVehicle(context, vehicleId);
  return vehicleMediaPostgresRepository.listByVehicle(context.tenantId, vehicleId, {
    includeAdminOnly: context.role !== "public",
  });
}

/**
 * Aşama 6 — 1. adım (property.postgres.service.js#createPropertyMediaUploadIntent
 * ile birebir aynı desen — araç fotoğrafı/videosu/ekspertiz raporu/servis
 * belgesi hepsi AYNI mekanizmadan geçer, `kind` ayrımı UPLOAD_LIMITS'i seçer).
 */
export async function createVehicleMediaUploadIntent(context, vehicleId, { kind, mimeType, fileSize }) {
  await getVehicle(context, vehicleId); // IDOR + varlık kontrolü
  assertValidUpload(kind, mimeType, fileSize);

  const objectKey = buildObjectKey(MEDIA_NAMESPACE, vehicleId, kind, mimeType);
  const storage = await getStorageClient();
  const expiresIn = 300;
  const uploadUrl = await storage.getUploadUrl(objectKey, { contentType: mimeType, expirySeconds: expiresIn });
  return { uploadUrl, objectKey, expiresIn };
}

/**
 * Aşama 6 — 2. adım. `visibility`/`category`/`documentLabel` — vehicle.model.js'in
 * kendi kuralı (ekspertiz raporu public, servis/tramer/garanti belgeleri
 * admin-only) burada YENİDEN üretilmiyor, `addVehicleMedia`'ya olduğu gibi
 * devrediliyor — bu ayrım zaten `uploads:write` yetkisi gerektiren, sadece
 * ekip üyelerinin eriştiği bir form alanı (aynı Firestore döneminde olduğu gibi).
 */
export async function confirmVehicleMediaUpload(context, vehicleId, input) {
  await getVehicle(context, vehicleId); // IDOR kontrolü
  assertObjectKeyBelongsToRecord(input.objectKey, MEDIA_NAMESPACE, vehicleId);

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

  return addVehicleMedia(context, vehicleId, {
    kind: input.kind,
    objectKey: input.objectKey,
    url: storage.getPublicUrl(input.objectKey),
    mimeType: head.contentType ?? input.mimeType,
    fileSize: head.contentLength,
    width: input.width ?? null,
    height: input.height ?? null,
    videoDurationSeconds: input.videoDurationSeconds ?? null,
    category: input.category ?? null,
    visibility: input.visibility ?? (input.kind === "document" ? "admin_only" : "public"),
    documentLabel: input.documentLabel ?? null,
  });
}

export async function addVehicleMedia(context, vehicleId, mediaInput) {
  await getVehicle(context, vehicleId);

  const existing = await vehicleMediaPostgresRepository.listByVehicle(context.tenantId, vehicleId);
  const position = mediaInput.position ?? existing.length;
  const isCover = mediaInput.isCover ?? (mediaInput.kind === "image" && !existing.some((m) => m.isCover));

  const created = await vehicleMediaPostgresRepository.create(context.tenantId, vehicleId, {
    ...mediaInput,
    position,
    isCover: false,
  });

  if (isCover) {
    return vehicleMediaPostgresRepository.setCover(context.tenantId, vehicleId, created.id);
  }
  if (mediaInput.kind === "video") {
    await vehiclePostgresRepository.update(context, vehicleId, { hasVideo: true });
  }
  return created;
}

export async function setCoverVehicleMedia(context, vehicleId, mediaId) {
  await getVehicle(context, vehicleId);
  return vehicleMediaPostgresRepository.setCover(context.tenantId, vehicleId, mediaId);
}

export async function reorderVehicleMedia(context, vehicleId, orderedMediaIds) {
  await getVehicle(context, vehicleId);
  return vehicleMediaPostgresRepository.reorder(context.tenantId, vehicleId, orderedMediaIds);
}

export async function deleteVehicleMedia(context, vehicleId, mediaId) {
  await getVehicle(context, vehicleId);
  const deleted = await vehicleMediaPostgresRepository.softDelete(context.tenantId, vehicleId, mediaId);
  if (!deleted) throw ApiError.notFound("Medya bulunamadı.");

  const storage = await getStorageClient();
  await storage.deleteFile(deleted.objectKey).catch(() => {});

  const remaining = await vehicleMediaPostgresRepository.listByVehicle(context.tenantId, vehicleId);
  if (!remaining.some((item) => item.kind === "video")) {
    await vehiclePostgresRepository.update(context, vehicleId, { hasVideo: false });
  }
  return deleted;
}
