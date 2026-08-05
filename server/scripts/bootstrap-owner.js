// server/scripts/bootstrap-owner.js
//
// Kendi kendine kayıt akışı YOK — yeni bir müşteri/ofis için bu betik
// çalıştırılır ve o ofisin tek admin (owner) hesabını + tenant'ını
// oluşturur. Danışman/Personel hesapları ise daha sonra bu owner'ın
// kendisi, admin panelindeki Ayarlar sayfasından açar (bkz.
// src/services/user.service.js) — bu betiğe ihtiyaç duymadan.
//
// Kaç kere çalıştırılabilir: Bu betik AYNI Firebase projesine karşı
// tekrar tekrar çalıştırılabilir — her çağrı `createTenantForOwner`
// (benzersiz slug üretir) ile yepyeni, izole bir tenant açar. Yani "her
// müşteri için ayrı bir Firebase projesi" ZORUNLU değil: paylaşımlı bir
// backend/Firestore işletiyorsan (bkz. docs/INSTALL.md, "Paylaşımlı
// Backend'e Yeni Tenant Ekleme"), her yeni müşteride sadece bu betiği bir
// kere daha çalıştırırsın — tenant izolasyonu `base.repository.js`'te
// yapısal olarak zaten garanti.
//
// Kullanım: node scripts/bootstrap-owner.js <email> <şifre> ["Şirket Adı"] ["Yetkili Ad Soyad"]
import "../src/config/env.js";
import { getAuth } from "../src/firebase/admin.js";
import { createTenantForOwner } from "../src/services/tenant.service.js";
import { userRepository } from "../src/repositories/user.repository.js";
import { createDefaultUser } from "../src/models/user.model.js";

const [, , EMAIL, PASSWORD, COMPANY_NAME = "Yeni Emlak Ofisi", OWNER_DISPLAY_NAME = COMPANY_NAME] = process.argv;

if (!EMAIL || !PASSWORD) {
  console.error('Kullanım: node scripts/bootstrap-owner.js <email> <şifre> ["Şirket Adı"] ["Yetkili Ad Soyad"]');
  process.exit(1);
}

async function run() {
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

  const context = { tenantId: tenant.id, userId: userRecord.uid, role: "owner" };
  const userData = createDefaultUser({ tenantId: tenant.id, email: EMAIL, displayName: OWNER_DISPLAY_NAME, role: "owner" });
  await userRepository.createWithUid(context, userRecord.uid, userData);
  console.log("users/{uid} dokümanı oluşturuldu.");

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
