/**
 * Araç medyası (fotoğraf/video/belge) için backend'in Aşama 6'da kurduğu
 * presigned-upload akışına bağlanan istemci katmanı. `lib/mediaStore.js`'teki
 * eski `uploadMediaFile` (dosyayı doğrudan backend'e POST eden, Firebase
 * Storage dönemi akışı) BİLEREK burada kullanılmıyor — bu dosya YENİ akışı
 * konuşuyor: backend'den kısa süreli bir yükleme izni al, dosyayı DOĞRUDAN
 * R2'ye yükle, backend'e "bitti" de.
 *
 * Eski `MediaUploadField`/`PhotoManagerList`/`PdfUploadField` (değer =
 * düz URL dizisi) bu akışa UYMUYOR — her medya artık backend'de gerçek bir
 * kimliğe (id) sahip bir satır, bir dizi string değil. Bu yüzden
 * `VehicleMediaSection.jsx` bu dosyayı kullanan, tamamen yeni bir bileşen.
 */
import { apiClient } from "../../lib/apiClient";

export function fetchVehicleMedia(vehicleId) {
  return apiClient.get(`/vehicles/${vehicleId}/media`);
}

export function setVehicleCoverMedia(vehicleId, mediaId) {
  return apiClient.post(`/vehicles/${vehicleId}/media/cover`, { mediaId });
}

export function reorderVehicleMedia(vehicleId, orderedMediaIds) {
  return apiClient.post(`/vehicles/${vehicleId}/media/reorder`, { orderedMediaIds });
}

export function deleteVehicleMedia(vehicleId, mediaId) {
  return apiClient.delete(`/vehicles/${vehicleId}/media/${mediaId}`);
}

/** Tarayıcının PUT sırasında verdiği gerçek yükleme ilerlemesini (`onProgress`, 0-100) izler — `fetch`'in aksine `XMLHttpRequest` bunu destekliyor. */
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

/** Fotoğrafın gerçek piksel boyutunu okur — backend'in `property_media.width/height` sütunlarına yazılır, listede/detayda doğru en-boy oranı için kullanılabilir. */
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
 * Uçtan uca akış: 1) backend'den bu TEK dosya için imzalı yükleme izni
 * iste, 2) dosyayı DOĞRUDAN R2'ye yükle (backend'in sunucusu bayta hiç
 * dokunmuyor), 3) backend'e "yükledim" de — backend R2'ye sorup gerçekten
 * doğrulayıp DB'ye yazıyor. Hata her adımda `throw` eder, çağıran taraf
 * (VehicleMediaSection) toast ile gösterir.
 */
export async function uploadVehicleMediaFile(vehicleId, file, kind, { category, visibility, documentLabel, onProgress } = {}) {
  const intent = await apiClient.post(`/vehicles/${vehicleId}/media/upload-intent`, {
    kind,
    mimeType: file.type,
    fileSize: file.size,
  });

  const dimensions = kind === "image" ? await readImageDimensions(file) : null;
  const videoDurationSeconds = kind === "video" ? await readVideoDuration(file) : null;

  await putWithProgress(intent.uploadUrl, file, onProgress);

  return apiClient.post(`/vehicles/${vehicleId}/media/confirm`, {
    objectKey: intent.objectKey,
    kind,
    mimeType: file.type,
    width: dimensions?.width ?? undefined,
    height: dimensions?.height ?? undefined,
    videoDurationSeconds: videoDurationSeconds ?? undefined,
    category,
    visibility,
    documentLabel,
  });
}
