// server/src/firebase/admin.js
//
// Sadece FIREBASE_MODE=live iken import edilir (bkz. firebase/auth.client.js'in
// dinamik import'u) — mock modda bu dosya hiç yüklenmez, null kimlik
// bilgileriyle initializeApp çağrılmaya çalışılmaz.
//
// TEK amacı: merkezi (satıcının) Firebase projesindeki Authentication'a
// erişmek. Firestore/Storage/tenant-başına-federe-Firebase-projesi
// kavramları Postgres+R2 cutover'ıyla tamamen kaldırıldı (bkz.
// docs/ARCHITECTURE.md) — bu dosya artık SADECE Auth Admin SDK'sını kurar.
import admin from "firebase-admin";
import { env } from "../config/env.js";

let centralApp;

function getCentralApp() {
  if (!centralApp) {
    centralApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.firebase.projectId,
        clientEmail: env.firebase.clientEmail,
        privateKey: env.firebase.privateKey,
      }),
    });
  }
  return centralApp;
}

export function getAuth() {
  return admin.auth(getCentralApp());
}
