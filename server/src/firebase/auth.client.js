// server/src/firebase/auth.client.js
//
// TEK seçim noktası: hangi Auth implementasyonunun aktif olduğuna sadece
// burada karar verilir — firestore.client.js/storage.client.js'teki AYNI
// desen. mock modda `mockAuth` (bkz. mock/auth.mock.js) döner; canlıda
// gerçek Firebase Admin Auth.
import { env } from "../config/env.js";
import { mockAuth } from "./mock/auth.mock.js";

let liveAuth;

export async function getAuthClient() {
  if (env.firebaseMode === "mock") return mockAuth;
  if (!liveAuth) {
    const { getAuth } = await import("./admin.js");
    liveAuth = getAuth();
  }
  return liveAuth;
}
