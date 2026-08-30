/**
 * İlan medyası (fotoğraf/video) için backend'in presigned-upload akışına
 * bağlanan istemci katmanı — `vehicleMediaStore.js` ile BİREBİR AYNI desen
 * (bkz. o dosyanın kendi yorumu), sadece `/vehicles` yerine `/properties`
 * uçlarına gider ve `category`/`visibility`/`documentLabel` YOK —
 * `property_media` tablosunda bu sütunlar yok (belgeler/ekspertiz raporu
 * property_media'nın kapsamında değil, sadece "image"/"video").
 *
 * Eski `MediaUploadField` (değer = düz URL dizisi, `lib/mediaStore.js`
 * üzerinden backend-proxied genel yükleme ucuna gider) bu akışa UYMUYOR —
 * her medya artık backend'de gerçek bir kimliğe (id) sahip bir satır. Bu
 * yüzden `PropertyMediaSection.jsx` bu dosyayı kullanan ayrı bir bileşen.
 */
import { apiClient } from "../../lib/apiClient";

export function fetchPropertyMedia(propertyId) {
  return apiClient.get(`/properties/${propertyId}/media`);
}

export function setPropertyCoverMedia(propertyId, mediaId) {
  return apiClient.post(`/properties/${propertyId}/media/cover`, { mediaId });
}

export function reorderPropertyMedia(propertyId, orderedMediaIds) {
  return apiClient.post(`/properties/${propertyId}/media/reorder`, { orderedMediaIds });
}

export function deletePropertyMedia(propertyId, mediaId) {
  return apiClient.delete(`/properties/${propertyId}/media/${mediaId}`);
}

/** Tarayıcının PUT sırasında verdiği gerçek yükleme ilerlemesini (`onProgress`, 0-100) izler — vehicleMediaStore.js#putWithProgress ile birebir aynı. */
function putWithProgress(url, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (event) => {
      if (onProgress && event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Yükleme başarısız oldu (HTTP ${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error("Yükleme sırasında bir ağ hatası oluştu."));
    xhr.send(file);
  });
}

/** Fotoğrafın gerçek piksel boyutunu okur — backend'in `property_media.width/height` sütunlarına yazılır. */
function readImageDimensions(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: null, height: null });
    };
    img.src = url;
  });
}

function readVideoDuration(file) {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(video.duration) ? video.duration : null);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    video.src = url;
  });
}

/**
 * Uçtan uca akış (vehicleMediaStore.js#uploadVehicleMediaFile ile aynı):
 * 1) backend'den bu TEK dosya için imzalı yükleme izni iste, 2) dosyayı
 * DOĞRUDAN R2'ye yükle, 3) backend'e "yükledim" de — backend R2'ye sorup
 * gerçekten doğrulayıp DB'ye yazıyor.
 */
export async function uploadPropertyMediaFile(propertyId, file, kind, { onProgress } = {}) {
  const intent = await apiClient.post(`/properties/${propertyId}/media/upload-intent`, {
    kind,
    mimeType: file.type,
    fileSize: file.size,
  });

  const dimensions = kind === "image" ? await readImageDimensions(file) : null;
  const videoDurationSeconds = kind === "video" ? await readVideoDuration(file) : null;

  await putWithProgress(intent.uploadUrl, file, onProgress);

  return apiClient.post(`/properties/${propertyId}/media/confirm`, {
    objectKey: intent.objectKey,
    kind,
    mimeType: file.type,
    width: dimensions?.width ?? undefined,
    height: dimensions?.height ?? undefined,
    videoDurationSeconds: videoDurationSeconds ?? undefined,
  });
}
