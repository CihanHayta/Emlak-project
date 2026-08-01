// server/src/firebase/storage.client.js
//
// TEK seçim noktası: hangi Storage implementasyonunun aktif olduğuna sadece
// burada karar verilir. Üst katmanlar (services/upload.service.js) sadece
// `getStorageClient()` çağırır, mock mu gerçek mi olduğunu hiç bilmez.
import { env } from "../config/env.js";
import { mockStorage } from "./mock/storage.mock.js";

let liveStorage;

async function buildLiveStorage() {
  // Dinamik import: firebase/admin.js (ve dolayısıyla admin.initializeApp)
  // SADECE gerçekten live moddayken yüklenir — mock modda hiç çalışmaz.
  const { getStorageBucket } = await import("./admin.js");
  const bucket = getStorageBucket();

  return {
    async upload(buffer, storagePath, metadata) {
      const file = bucket.file(storagePath);
      await file.save(buffer, { resumable: false, metadata: { contentType: metadata?.contentType } });
      await file.makePublic();
      return { url: `https://storage.googleapis.com/${bucket.name}/${storagePath}`, storagePath };
    },
    async deleteFile(storagePath) {
      await bucket.file(storagePath).delete({ ignoreNotFound: true });
    },
    async getSignedUrl(storagePath, expirySeconds) {
      const [url] = await bucket
        .file(storagePath)
        .getSignedUrl({ action: "read", expires: Date.now() + expirySeconds * 1000 });
      return url;
    },
  };
}

export async function getStorageClient() {
  if (env.firebaseMode === "mock") return mockStorage;
  if (!liveStorage) liveStorage = await buildLiveStorage();
  return liveStorage;
}
