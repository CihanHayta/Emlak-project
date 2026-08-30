/**
 * TEK Firebase yapılandırma noktası — bu projeyi yeni bir müşteriye
 * kurarken değişmesi gereken TEK yer burasıdır (artı `.env`'deki
 * `VITE_FIREBASE_*` değerleri). Hiçbir başka dosyada Firebase proje kimliği,
 * API key'i vb. sabit yazılmaz; hepsi buradan (`firebaseApp`) türetilir.
 *
 * auth.js bu dosyadaki `firebaseApp`'i alıp Auth servisini döndürür —
 * uygulama SADECE Firebase Authentication için Firebase kullanıyor
 * (Firestore ve Firebase Storage kaldırıldı, bkz. docs/ARCHITECTURE.md);
 * geri kalan kod bu dosyayı ya da `firebase/app`'i doğrudan import etmez.
 */
import { initializeApp } from "firebase/app";

// VITE_AUTH_MODE=mock: gerçek bir Firebase projesi hiç kurulmadan test
// edilebilsin diye (bkz. admin/lib/auth.js#login, server/src/firebase/mock/
// auth.mock.js) — ama `getAuth()` (auth.js) apiKey biçimsel olarak boş/
// geçersizse SENKRON `auth/invalid-api-key` fırlatıyor, bu da onu import
// eden HER modülü (admin/lib/auth.js dahil, dolayısıyla TÜM admin panelini)
// çöktürüp beyaz ekrana yol açıyordu (2026-08-29'da bulunup düzeltildi).
// Mock modda gerçek bir Firebase network çağrısı ASLA yapılmadığı için
// (login() mock dalına düşer, bkz. isMockAuth) sahte ama BİÇİMSEL olarak
// geçerli bir config `getAuth()`'u sessizce geçmesi için yeterli.
const isMockAuth = import.meta.env.VITE_AUTH_MODE === "mock";

export const firebaseConfig = isMockAuth
  ? {
      apiKey: "mock-api-key-not-a-real-firebase-project",
      authDomain: "mock.firebaseapp.com",
      projectId: "mock-project",
      messagingSenderId: "000000000000",
      appId: "1:000000000000:web:0000000000000000000000",
    }
  : {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    };

export const firebaseApp = initializeApp(firebaseConfig);
