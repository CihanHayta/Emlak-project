// server/src/firebase/admin.js
//
// Sadece FIREBASE_MODE=live iken import edilir (bkz. firebase/storage.client.js'in
// dinamik import'u) — mock modda bu dosya hiç yüklenmez, null kimlik
// bilgileriyle initializeApp çağrılmaya çalışılmaz.
//
// İki tür Firebase App var:
// - MERKEZİ app: `tenants` dizinini ve Firebase Authentication'ı barındıran,
//   bizim (satıcının) kendi küçük Firebase projemiz. `env.firebase.*`'ten
//   kurulur, tek ve sabit.
// - TENANT app'leri: her müşterinin KENDİ Firebase projesi (kendi Google
//   hesabı/faturası) — kimlik bilgileri `tenants/{id}.firebase` alanında
//   şifreli duruyor (bkz. tenant.service.js#connectTenantFirebaseProject).
//   Auth SADECE merkezi projede yaşar (bir idToken hangi Auth projesinden
//   geldiği bellidir — tenant'ı bilmeden hangi Auth'a bakılacağı
//   bilinemeyeceği için Auth'u tenant'a göre bölmek çözümsüz bir
//   "önce tenant'ı bilmen lazım, tenant'ı bilmek için önce login lazım"
//   döngüsü yaratır).
import admin from "firebase-admin";
import { env } from "../config/env.js";
import { decryptToken } from "../utils/crypto.util.js";

let centralApp;
// tenantId -> Promise<admin.app.App> — promise cache (değer değil), aynı
// tenant için eşzamanlı iki ilk-istek birbirini ezip admin.initializeApp'i
// iki kere (aynı isimle) çağırmasın diye. initializeApp aynı isimle ikinci
// çağrıda hata fırlatır.
const tenantAppPromises = new Map();

function getCentralApp() {
  if (!centralApp) {
    centralApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.firebase.projectId,
        clientEmail: env.firebase.clientEmail,
        privateKey: env.firebase.privateKey,
      }),
      storageBucket: env.firebase.storageBucket,
    });
  }
  return centralApp;
}

/** Merkezi projeden ham `tenants/{tenantId}` dokümanını okur — `tenant.repository.js`
 * BURADA import EDİLMEZ (o firestore.client.js'i import ediyor, o da bu dosyayı
 * dinamik import ediyor; tenant.repository.js'i burada import etmek gerçek bir
 * dairesel bağımlılık yaratırdı). Birkaç satırlık tekrar, DAG'ı korumaya değer. */
async function fetchTenantFirebaseConfig(tenantId) {
  const snap = await admin.firestore(getCentralApp()).collection("tenants").doc(tenantId).get();
  if (!snap.exists) throw new Error(`Tenant bulunamadı: ${tenantId}`);
  const data = snap.data();
  if (!data.firebase) {
    throw new Error(`Tenant "${tenantId}" için henüz bir Firebase projesi bağlanmamış (tenant.firebase alanı boş).`);
  }
  return data.firebase;
}

async function buildTenantApp(tenantId) {
  const { projectId, clientEmail, storageBucket, encryptedPrivateKey } = await fetchTenantFirebaseConfig(tenantId);
  const privateKey = decryptToken(encryptedPrivateKey);
  return admin.initializeApp(
    {
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      storageBucket,
    },
    tenantId, // app adı — merkezi (varsayılan) app'ten ayırt etmek için tenantId kullanılıyor.
  );
}

function getTenantApp(tenantId) {
  if (!tenantAppPromises.has(tenantId)) {
    const promise = buildTenantApp(tenantId).catch((err) => {
      // Başarısız bir denemeyi SONSUZA KADAR cache'lemeyiz — aksi halde
      // geçici bir sorun (örn. henüz Firestore'a yazılmamış kimlik bilgisi,
      // ağ hatası) düzeldikten SONRA bile process yeniden başlayana kadar
      // her istekte aynı eski hatayı döndürmeye devam eder. Cache'ten
      // düşürüp hatayı olduğu gibi yeniden fırlatıyoruz — bir sonraki
      // çağrı temiz bir şekilde yeniden dener.
      tenantAppPromises.delete(tenantId);
      throw err;
    });
    tenantAppPromises.set(tenantId, promise);
  }
  return tenantAppPromises.get(tenantId);
}

/** Bir tenant'ın Firebase kimlik bilgileri değiştiğinde (key rotasyonu gibi)
 * cache'ten düşürür — bir sonraki istekte yeniden kurulur. */
export function invalidateTenantFirebaseApp(tenantId) {
  tenantAppPromises.delete(tenantId);
}

export function getAuth() {
  return admin.auth(getCentralApp());
}

export function getCentralFirestoreInstance() {
  return admin.firestore(getCentralApp());
}

export function getCentralStorageBucket() {
  return admin.storage(getCentralApp()).bucket();
}

export async function getTenantFirestoreInstance(tenantId) {
  const app = await getTenantApp(tenantId);
  return admin.firestore(app);
}

export async function getTenantStorageBucket(tenantId) {
  const app = await getTenantApp(tenantId);
  return admin.storage(app).bucket();
}
