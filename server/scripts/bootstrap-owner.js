// server/scripts/bootstrap-owner.js
//
// Kendi kendine kayıt akışı YOK — yeni bir müşteri/ofis için bu betik
// çalıştırılır ve o ofisin tek admin (owner) hesabını + tenant'ını
// oluşturur. Danışman/Personel hesapları ise daha sonra bu owner'ın
// kendisi, admin panelindeki Ayarlar sayfasından açar (bkz.
// src/services/user.service.js) — bu betiğe ihtiyaç duymadan.
//
// Her tenant'ın verisi KENDİ Firebase projesinde yaşar (bkz.
// docs/ARCHITECTURE.md, "Hibrit Mimari") — bu yüzden bu betik artık
// müşterinin KENDİ Google hesabında oluşturduğu bir Firebase projesinin
// service-account JSON'unu da istiyor. Backend (bu betiğin çalıştığı yer)
// ve Firebase Authentication paylaşımlı/merkezi kalıyor; sadece
// Firestore/Storage müşteriye özel.
//
// Önce müşteri (veya siz, onun adına) kendi Google hesabıyla:
//   1. Yeni bir Firebase projesi açar, Blaze plana geçer.
//   2. Firestore (Native mode) + Storage'ı etkinleştirir.
//   3. Proje Ayarları → Hizmet Hesapları → "Yeni özel anahtar oluştur" ile
//      bir service-account JSON dosyası indirir, size verir.
//
// Kullanım:
//   node scripts/bootstrap-owner.js <email> <şifre> <service-account.json yolu> <storage-bucket> ["Şirket Adı"] ["Yetkili Ad Soyad"]
import { readFileSync } from "node:fs";
import "../src/config/env.js";
import { getAuth } from "../src/firebase/admin.js";
import { getTenantFirestore } from "../src/firebase/firestore.client.js";
import { createTenantForOwner, connectTenantFirebaseProject } from "../src/services/tenant.service.js";
import { userRepository } from "../src/repositories/user.repository.js";
import { createDefaultUser } from "../src/models/user.model.js";

const [, , EMAIL, PASSWORD, SERVICE_ACCOUNT_PATH, STORAGE_BUCKET, COMPANY_NAME = "Yeni Emlak Ofisi", OWNER_DISPLAY_NAME = COMPANY_NAME] =
  process.argv;

function usageAndExit() {
  console.error(
    'Kullanım: node scripts/bootstrap-owner.js <email> <şifre> <service-account.json yolu> <storage-bucket> ["Şirket Adı"] ["Yetkili Ad Soyad"]',
  );
  process.exit(1);
}

if (!EMAIL || !PASSWORD || !SERVICE_ACCOUNT_PATH || !STORAGE_BUCKET) usageAndExit();

function readServiceAccountJson(path) {
  let raw;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    console.error(`\n[bootstrap-owner] Dosya okunamadı: ${path}\n`);
    process.exit(1);
  }
  let json;
  try {
    json = JSON.parse(raw);
  } catch {
    console.error(`\n[bootstrap-owner] Geçerli bir JSON değil: ${path}\n`);
    process.exit(1);
  }
  if (!json.project_id || !json.client_email || !json.private_key) {
    console.error(`\n[bootstrap-owner] Eksik alan(lar) — project_id/client_email/private_key hepsi olmalı: ${path}\n`);
    process.exit(1);
  }
  return json;
}

/** Bozuk key/kapalı Firestore API'si/olmayan bucket gibi sorunlar
 * müşterinin ilk gerçek işleminde değil, kurulum anında patlasın diye. */
async function smokeTestTenantProject(tenantId) {
  const db = await getTenantFirestore(tenantId);
  const ref = db.collection("_healthcheck").doc("boot");
  await ref.set({ checkedAt: new Date() });
  await ref.delete();
}

async function run() {
  const serviceAccountJson = readServiceAccountJson(SERVICE_ACCOUNT_PATH);
  const auth = getAuth();

  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(EMAIL);
    console.log(`Firebase Auth kullanıcısı zaten mevcut: ${userRecord.uid}`);
  } catch {
    userRecord = await auth.createUser({ email: EMAIL, password: PASSWORD, emailVerified: true });
    console.log(`Firebase Auth kullanıcısı oluşturuldu: ${userRecord.uid}`);
  }

  const tenant = await createTenantForOwner({ name: COMPANY_NAME, ownerUserId: userRecord.uid });
  console.log(`Tenant oluşturuldu: ${tenant.id} (slug: ${tenant.slug})`);

  await connectTenantFirebaseProject(tenant.id, { serviceAccountJson, storageBucket: STORAGE_BUCKET });
  console.log(`Tenant, kendi Firebase projesine bağlandı: ${serviceAccountJson.project_id}`);

  await smokeTestTenantProject(tenant.id);
  console.log("Bağlantı doğrulandı (yaz+sil testi geçti).");

  // Bu noktadan sonraki her repository çağrısı artık müşterinin KENDİ
  // projesine gider (bkz. base.repository.js → firestore.client.js#getTenantFirestore).
  const context = { tenantId: tenant.id, userId: userRecord.uid, role: "owner" };
  const userData = createDefaultUser({ tenantId: tenant.id, email: EMAIL, displayName: OWNER_DISPLAY_NAME, role: "owner" });
  await userRepository.createWithUid(context, userRecord.uid, userData);
  console.log("users/{uid} dokümanı (müşterinin kendi projesinde) oluşturuldu.");

  await auth.setCustomUserClaims(userRecord.uid, { tenantId: tenant.id, role: "owner" });
  console.log("Custom claims ayarlandı:", { tenantId: tenant.id, role: "owner" });

  console.log("\n✅ Tamamlandı — artık bu e-posta/şifre ile giriş yapılabilir.");
  console.log(`   E-posta : ${EMAIL}`);
  console.log(`   Tenant  : ${tenant.name} (${tenant.id})`);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("HATA:", err);
    process.exit(1);
  });
