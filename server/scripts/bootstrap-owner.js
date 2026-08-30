// server/scripts/bootstrap-owner.js
//
// Kendi kendine kayıt akışı YOK — bu proje tek-kiracılı olarak paketlenip
// her müşteriye AYRI bir deployment (kendi sunucusu, kendi bu veritabanı,
// kendi R2 bucket'ı, kendi Firebase Auth projesi) olarak satılıyor. Bu
// betik o deployment'ın TEK admin (owner) hesabını + tenant satırını
// oluşturur. Danışman/Personel hesapları sonra owner'ın kendisi, admin
// panelindeki Ayarlar sayfasından açar (bkz. src/services/user.postgres.service.js)
// — bu betiğe ihtiyaç duymadan.
//
// FIREBASE_MODE=mock VEYA live, İKİSİNDE DE ÇALIŞIR — `getAuthClient()`
// (bkz. firebase/auth.client.js) zaten mod-farkında, bu betiğin kendisinin
// hangi modda olduğunu bilmesine gerek yok. Eskiden (per-tenant federe
// Firebase-projesi mimarisinde) müşterinin KENDİ service-account JSON'unu
// isteyen ayrı bir akış vardı — o mimari tek-kiracılı + paylaşılan gerçek
// Firebase Auth pivotuyla öldü (bkz. tenant.postgres.repository.js'in başı);
// artık TEK bir (bu deployment'ın .env'indeki) Firebase Auth projesi var,
// tenant verisi de zaten Postgres'te — bu yüzden ayrı bir
// "bootstrap-owner-mock.js" gerekmiyor, bu TEK betik ikisini de kapsıyor.
//
// Kullanım:
//   node scripts/bootstrap-owner.js <email> <şifre> ["Şirket Adı"] ["Yetkili Ad Soyad"]
import "../src/config/env.js";
import { env } from "../src/config/env.js";
import { getAuthClient } from "../src/firebase/auth.client.js";
import { createTenantForOwner } from "../src/services/tenant.service.js";
import { userPostgresRepository } from "../src/repositories/user.postgres.repository.js";
import { createDefaultUser } from "../src/models/user.model.js";

const [, , EMAIL, PASSWORD, COMPANY_NAME = "Yeni Emlak Ofisi", OWNER_DISPLAY_NAME = COMPANY_NAME] = process.argv;

function usageAndExit() {
  console.error('Kullanım: node scripts/bootstrap-owner.js <email> <şifre> ["Şirket Adı"] ["Yetkili Ad Soyad"]');
  process.exit(1);
}

if (!EMAIL || !PASSWORD) usageAndExit();

async function run() {
  const auth = await getAuthClient();

  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(EMAIL);
    console.log(`Firebase Auth kullanıcısı zaten mevcut: ${userRecord.uid}`);
  } catch {
    userRecord = await auth.createUser({ email: EMAIL, password: PASSWORD, emailVerified: true });
    console.log(`Firebase Auth kullanıcısı oluşturuldu: ${userRecord.uid}`);
  }

  // customClaims'te tenantId zaten varsa (daha önce bootstrap edilmiş) o
  // tenant'ı yeniden kullan — aksi halde her çalıştırmada yeni bir tenant
  // (ve slug çakışması) üretmiş oluruz.
  let tenantId = userRecord.customClaims?.tenantId;
  if (!tenantId) {
    const tenant = await createTenantForOwner({ name: COMPANY_NAME, ownerUserId: userRecord.uid });
    tenantId = tenant.id;
    console.log(`Tenant oluşturuldu: ${tenant.id} (slug: ${tenant.slug})`);
  } else {
    console.log(`Mevcut tenant kullanılıyor: ${tenantId}`);
  }

  const context = { tenantId, userId: userRecord.uid, role: "owner" };

  const existingUserRow = await userPostgresRepository.findByUid(context, userRecord.uid);
  if (!existingUserRow) {
    const userData = createDefaultUser({ tenantId, email: EMAIL, displayName: OWNER_DISPLAY_NAME, role: "owner" });
    await userPostgresRepository.createWithUid(context, userRecord.uid, userData);
    console.log("Postgres users satırı oluşturuldu.");
  } else {
    console.log("Postgres users satırı zaten mevcut.");
  }

  await auth.setCustomUserClaims(userRecord.uid, { tenantId, role: "owner" });
  console.log("Custom claims ayarlandı:", { tenantId, role: "owner" });

  console.log(`\n✅ Tamamlandı (FIREBASE_MODE=${env.firebaseMode}) — artık bu e-posta/şifre ile giriş yapılabilir.`);
  console.log(`   E-posta : ${EMAIL}`);
  console.log(`   Tenant  : ${tenantId}`);
  if (env.firebaseMode === "mock") {
    console.log("\nFrontend .env dosyanızda:");
    console.log(`   VITE_AUTH_MODE=mock`);
    console.log(`   VITE_TENANT_ID=${tenantId}`);
  } else {
    console.log("\nFrontend .env dosyanızda:");
    console.log(`   VITE_AUTH_MODE= (boş — mock DEĞİL)`);
    console.log(`   VITE_TENANT_ID=${tenantId}`);
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("HATA:", err);
    process.exit(1);
  });
