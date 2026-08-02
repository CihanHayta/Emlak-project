/**
 * TEK Firebase yapılandırma noktası — bu projeyi yeni bir müşteriye
 * kurarken değişmesi gereken TEK yer burasıdır (artı `.env`'deki
 * `VITE_FIREBASE_*` değerleri). Hiçbir başka dosyada Firebase proje kimliği,
 * API key'i vb. sabit yazılmaz; hepsi buradan (`firebaseApp`) türetilir.
 *
 * auth.js / firestore.js / storage.js bu dosyadaki `firebaseApp`'i alıp
 * kendi servislerini döndürür — uygulamanın geri kalanı SADECE o üç dosyayı
 * import eder, bu dosyayı ya da `firebase/app`'i doğrudan hiçbir yerde
 * import etmez.
 */
import { initializeApp } from "firebase/app";

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseApp = initializeApp(firebaseConfig);
