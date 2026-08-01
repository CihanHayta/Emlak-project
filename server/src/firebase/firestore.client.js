// server/src/firebase/firestore.client.js
//
// TEK seçim noktası: hangi Firestore implementasyonunun aktif olduğuna
// sadece burada karar verilir. Repository katmanı sadece `getFirestore()`
// çağırır, mock mu gerçek mi olduğunu hiç bilmez.
import { env } from "../config/env.js";
import { mockFirestore } from "./mock/firestore.mock.js";

let liveFirestore;

async function buildLiveFirestore() {
  const { getFirestoreInstance } = await import("./admin.js");
  return getFirestoreInstance();
}

export async function getFirestore() {
  if (env.firebaseMode === "mock") return mockFirestore;
  if (!liveFirestore) liveFirestore = await buildLiveFirestore();
  return liveFirestore;
}
