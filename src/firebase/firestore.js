/**
 * Firestore servisi — merkezi `firebaseApp`'ten (config.js) türetilir.
 *
 * Bugün hiçbir yerde kullanılmıyor: tarayıcı Firestore'a hiç doğrudan
 * bağlanmıyor, tüm veri backend (server/) üzerinden Admin SDK ile akıyor
 * (bkz. server/src/firebase/firestore.client.js). Bu dosya sadece yapısal
 * bütünlük için var — backend'deki firestore.client.js'in frontend
 * karşılığı — ileride tarayıcıdan doğrudan bir Firestore ihtiyacı çıkarsa
 * (örn. gerçek zamanlı `onSnapshot` dinleme) buradan başlanır.
 */
import { getFirestore } from "firebase/firestore";
import { firebaseApp } from "./config";

export const firestore = getFirestore(firebaseApp);
