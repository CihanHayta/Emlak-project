// server/src/firebase/admin.js
//
// Sadece FIREBASE_MODE=live iken import edilir (bkz. firebase/storage.client.js'in
// dinamik import'u) — mock modda bu dosya hiç yüklenmez, null kimlik
// bilgileriyle initializeApp çağrılmaya çalışılmaz.
import admin from "firebase-admin";
import { env } from "../config/env.js";

let app;

function getApp() {
  if (!app) {
    app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.firebase.projectId,
        clientEmail: env.firebase.clientEmail,
        privateKey: env.firebase.privateKey,
      }),
      storageBucket: env.firebase.storageBucket,
    });
  }
  return app;
}

export function getAuth() {
  return admin.auth(getApp());
}

export function getFirestoreInstance() {
  return admin.firestore(getApp());
}

export function getStorageBucket() {
  return admin.storage(getApp()).bucket();
}
