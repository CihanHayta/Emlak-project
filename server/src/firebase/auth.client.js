// server/src/firebase/auth.client.js
//
// Auth için henüz bir "mock" implementasyonu yok (kapsam şimdilik buna
// ihtiyaç duymuyor — gerçek giriş akışı zaten FIREBASE_MODE=live
// gerektiriyor). mock modda çağrılırsa açık bir hata verir; ileride gerçek
// bir sahte Auth gerekirse buraya storage.client.js'teki gibi bir
// mock/auth.mock.js eklenir.
import { env } from "../config/env.js";

let liveAuth;

export async function getAuthClient() {
  if (env.firebaseMode === "mock") {
    throw new Error("Auth için mock mod henüz desteklenmiyor — FIREBASE_MODE=live gerekli.");
  }
  if (!liveAuth) {
    const { getAuth } = await import("./admin.js");
    liveAuth = getAuth();
  }
  return liveAuth;
}
