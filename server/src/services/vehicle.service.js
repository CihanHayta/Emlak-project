// server/src/services/vehicle.service.js
import { vehicleRepository } from "../repositories/vehicle.repository.js";
import { createDefaultVehicle } from "../models/vehicle.model.js";
import { withUpdateFields } from "../models/base.model.js";
import { getStorageClient } from "../firebase/storage.client.js";
import { ApiError } from "../utils/ApiError.js";

export async function listVehicles(context) {
  return vehicleRepository.findAll(context);
}

export async function getVehicle(context, id) {
  const vehicle = await vehicleRepository.findById(context, id);
  if (!vehicle) throw ApiError.notFound("Araç bulunamadı.");
  return vehicle;
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

/** property.service.js#deleteProperty ile birebir aynı desen (soft-delete kayıt, gerçek silme dosyalar) — bkz. o dosyanın yorumu. */
export async function deleteVehicle(context, id) {
  const vehicle = await getVehicle(context, id);
  const storage = await getStorageClient(context.tenantId);

  const urls = [...(vehicle.images ?? []), vehicle.videoUrl].filter(Boolean);
  for (const url of urls) {
    const storagePath = extractStoragePath(url, context.tenantId);
    if (storagePath) {
      // eslint-disable-next-line no-await-in-loop -- birkaç dosya, sıralı silme yeterli, paralelleştirmeye değmez.
      await storage.deleteFile(storagePath).catch(() => {});
    }
  }

  return vehicleRepository.softDelete(context, id);
}
