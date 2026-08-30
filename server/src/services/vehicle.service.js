// server/src/services/vehicle.service.js
import { vehicleRepository } from "../repositories/vehicle.repository.js";
import { createDefaultVehicle } from "../models/vehicle.model.js";
import { withUpdateFields } from "../models/base.model.js";
import { getStorageClient } from "../firebase/storage.client.js";
import { ApiError } from "../utils/ApiError.js";

// `documents` (servis kaydı/tramer belgesi/garanti belgesi/diğer — ruhsat
// gibi kişisel bilgi içerebilir) ve `adminNotes` ASLA public'e (ziyaretçiye
// açık araç detay sayfasına) sızmamalı — controller'ların `role: "public"`
// context'iyle çağırdığı her yerde burada, TEK bir yerde temizleniyor.
// `expertiseReportUrl`/`expertiseReportName` BİLEREK burada YOK — ekspertiz
// raporu public (km yanında gösterilir, bkz. vehicle.model.js'in yorumu).
const ADMIN_ONLY_FIELDS = ["documents", "adminNotes"];

function toPublicVehicle(vehicle) {
  const sanitized = { ...vehicle };
  for (const field of ADMIN_ONLY_FIELDS) delete sanitized[field];
  return sanitized;
}

/** `context.role === "public"` ise admin-only alanları temizler — bkz. ADMIN_ONLY_FIELDS. */
function sanitizeForContext(context, vehicle) {
  return context.role === "public" ? toPublicVehicle(vehicle) : vehicle;
}

/**
 * "unpublished" (yayından kaldırıldı) durumundaki bir araç public'te
 * TAMAMEN yoktur — soft-delete edilmiş gibi davranılır (listede görünmez,
 * detay sayfası "bulunamadı" döner). "reserved"/"sold" ise hâlâ görünür
 * (yaygın emlak/araç ilan pratiği — "satıldı" rozetiyle gösterilir),
 * sadece "unpublished" gizlenir.
 */
function isHiddenFromPublic(vehicle) {
  return vehicle.status === "unpublished";
}

export async function listVehicles(context) {
  const vehicles = await vehicleRepository.findAll(context);
  const visible = context.role === "public" ? vehicles.filter((v) => !isHiddenFromPublic(v)) : vehicles;
  return visible.map((vehicle) => sanitizeForContext(context, vehicle));
}

export async function getVehicle(context, id) {
  const vehicle = await vehicleRepository.findById(context, id);
  if (!vehicle) throw ApiError.notFound("Araç bulunamadı.");
  if (context.role === "public" && isHiddenFromPublic(vehicle)) throw ApiError.notFound("Araç bulunamadı.");
  return sanitizeForContext(context, vehicle);
}

export async function createVehicle(context, data) {
  return vehicleRepository.create(context, createDefaultVehicle(data));
}

export async function updateVehicle(context, id, updates) {
  return vehicleRepository.update(context, id, withUpdateFields(updates, { actorUserId: context.userId }));
}

/** property.service.js#extractStoragePath ile birebir aynı desen — bkz. o dosyanın yorumu. */
function extractStoragePath(url, tenantId) {
  if (!url) return null;
  const marker = `tenants/${tenantId}/`;
  const index = url.indexOf(marker);
  return index === -1 ? null : url.slice(index);
}

/**
 * property.service.js#deleteProperty ile aynı desen (soft-delete kayıt,
 * gerçek silme dosyalar) — fotoğraf/video'ya EK olarak ekspertiz raporu
 * PDF'i ve diğer belgeler de (documents[]) gerçekten silinir, aksi halde
 * "silinmiş" bir araca ait dosyalar Storage'da sonsuza kadar kalırdı.
 */
export async function deleteVehicle(context, id) {
  const vehicle = await vehicleRepository.findById(context, id);
  if (!vehicle) throw ApiError.notFound("Araç bulunamadı.");
  const storage = await getStorageClient(context.tenantId);

  const urls = [
    ...(vehicle.images ?? []),
    vehicle.videoUrl,
    vehicle.expertiseReportUrl,
    ...(vehicle.documents ?? []).map((doc) => doc.url),
  ].filter(Boolean);

  for (const url of urls) {
    const storagePath = extractStoragePath(url, context.tenantId);
    if (storagePath) {
      // eslint-disable-next-line no-await-in-loop -- birkaç dosya, sıralı silme yeterli, paralelleştirmeye değmez.
      await storage.deleteFile(storagePath).catch(() => {});
    }
  }

  return vehicleRepository.softDelete(context, id);
}
