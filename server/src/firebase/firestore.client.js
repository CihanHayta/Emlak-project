// server/src/firebase/firestore.client.js
//
// TEK seçim noktası: hangi Firestore implementasyonunun aktif olduğuna
// sadece burada karar verilir. Repository katmanı sadece `getFirestore()`/
// `getTenantFirestore()` çağırır, mock mu gerçek mi olduğunu hiç bilmez.
import { env } from "../config/env.js";
import { mockFirestore } from "./mock/firestore.mock.js";

let liveCentralFirestore;
const liveTenantFirestores = new Map(); // tenantId -> Promise<Firestore>

async function buildLiveCentralFirestore() {
  const { getCentralFirestoreInstance } = await import("./admin.js");
  return getCentralFirestoreInstance();
}

async function buildLiveTenantFirestore(tenantId) {
  const { getTenantFirestoreInstance } = await import("./admin.js");
  return getTenantFirestoreInstance(tenantId);
}

/** Merkezi (satıcının kendi) Firestore projesi — SADECE `tenant.repository.js`
 * ve `tenant.service.js#incrementTenantUsage` kullanır. Tenant-scoped veri
 * için ASLA kullanılmaz, bkz. `getTenantFirestore`. */
export async function getFirestore() {
  if (env.firebaseMode === "mock") return mockFirestore;
  if (!liveCentralFirestore) liveCentralFirestore = await buildLiveCentralFirestore();
  return liveCentralFirestore;
}

/** Bir tenant'ın KENDİ Firebase projesindeki Firestore'u — `base.repository.js`
 * üzerinden geçen her tenant-scoped sorgu bunu kullanır. Mock modda basitlik
 * için tüm tenant'lar aynı `mockFirestore`'u paylaşır (local geliştirmede
 * birden fazla gerçek Firebase projesi kurmak gerekmesin diye). */
export async function getTenantFirestore(tenantId) {
  if (!tenantId) throw new Error("getTenantFirestore: tenantId zorunlu.");
  if (env.firebaseMode === "mock") return mockFirestore;
  if (!liveTenantFirestores.has(tenantId)) {
    liveTenantFirestores.set(tenantId, buildLiveTenantFirestore(tenantId));
  }
  return liveTenantFirestores.get(tenantId);
}
