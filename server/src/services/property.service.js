// server/src/services/property.service.js
import { propertyRepository } from "../repositories/property.repository.js";
import { createDefaultProperty } from "../models/property.model.js";
import { withUpdateFields } from "../models/base.model.js";
import { getStorageClient } from "../firebase/storage.client.js";
import { ApiError } from "../utils/ApiError.js";

export async function listProperties(context) {
  return propertyRepository.findAll(context);
}

export async function getProperty(context, id) {
  const property = await propertyRepository.findById(context, id);
  if (!property) throw ApiError.notFound("İlan bulunamadı.");
  return property;
}

export async function createProperty(context, data) {
  return propertyRepository.create(context, createDefaultProperty(data));
}

export async function updateProperty(context, id, updates) {
  return propertyRepository.update(context, id, withUpdateFields(updates, { actorUserId: context.userId }));
}

/**
 * `url` bizim Storage'a yüklediğimiz bir dosyaysa (bkz.
 * upload.service.js'in `tenants/{tenantId}/{kind}/{uuid}.{ext}` şeması)
 * onun `storagePath`'ini çıkarır; örnek/dış URL'lerde (Unsplash, vb. —
 * ilk 19 seed ilanı gibi) `null` döner, çünkü silinecek bir Storage
 * dosyası yoktur.
 */
function extractStoragePath(url, tenantId) {
  if (!url) return null;
  const marker = `tenants/${tenantId}/`;
  const index = url.indexOf(marker);
  return index === -1 ? null : url.slice(index);
}

/**
 * Firestore kaydı soft-delete edilir (diğer koleksiyonlarla tutarlı —
 * yanlışlıkla silinen bir ilan geri getirilebilir kalsın). Ama fotoğraf/
 * video dosyaları GERÇEKTEN silinir — kullanıcının bu ilanı bir daha
 * göreceği bir "geri getir" ekranı olmadığı sürece, silinmiş bir ilana
 * ait dosyaları Storage'da tutmanın hiçbir faydası yok, sadece maliyet.
 */
export async function deleteProperty(context, id) {
  const property = await getProperty(context, id);
  const storage = await getStorageClient(context.tenantId);

  const urls = [...(property.images ?? []), property.videoUrl].filter(Boolean);
  for (const url of urls) {
    const storagePath = extractStoragePath(url, context.tenantId);
    if (storagePath) {
      // eslint-disable-next-line no-await-in-loop -- birkaç dosya, sıralı silme yeterli, paralelleştirmeye değmez.
      await storage.deleteFile(storagePath).catch(() => {});
    }
  }

  return propertyRepository.softDelete(context, id);
}
