// server/src/firebase/storage.client.js
//
// TEK seçim noktası: hangi Storage implementasyonunun aktif olduğuna sadece
// burada karar verilir. Üst katmanlar (services/upload.service.js,
// property.service.js) sadece `getStorageClient(tenantId)` çağırır, mock mu
// gerçek mi olduğunu hiç bilmez.
//
// Storage'ın tek kullanım şekli tenant-scoped'dır (yüklenen fotoğraf/video
// her zaman bir tenant'a ait) — merkezi (satıcının) projede hiç dosya
// tutulmuyor, bu yüzden burada "merkezi" bir Storage kavramı yok.
import { env } from "../config/env.js";
import { mockStorage } from "./mock/storage.mock.js";

const liveStorageClients = new Map(); // tenantId -> Promise<StorageClient>

async function buildLiveStorage(tenantId) {
  // Dinamik import: firebase/admin.js (ve dolayısıyla admin.initializeApp)
  // SADECE gerçekten live moddayken yüklenir — mock modda hiç çalışmaz.
  const { getTenantStorageBucket } = await import("./admin.js");
  const bucket = await getTenantStorageBucket(tenantId);

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

export async function getStorageClient(tenantId) {
  if (!tenantId) throw new Error("getStorageClient: tenantId zorunlu.");
  if (env.firebaseMode === "mock") return mockStorage;
  if (!liveStorageClients.has(tenantId)) {
    liveStorageClients.set(tenantId, buildLiveStorage(tenantId));
  }
  return liveStorageClients.get(tenantId);
}
