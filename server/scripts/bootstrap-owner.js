// server/scripts/bootstrap-owner.js
//
// Bir kerelik kurulum betiği: ilk gerçek kullanıcıyı (owner) ve onun
// bağlı olduğu ilk tenant'ı (emlak ofisi) oluşturur. Sonraki ofisler için
// bu betiğe gerek yok — onlar `POST /auth/register-tenant` üzerinden
// (ileride açılacak) kendi kendine kayıt olacak.
//
// Kullanım: node scripts/bootstrap-owner.js <email> <şifre> ["Şirket Adı"]
import "../src/config/env.js";
import { getAuth } from "../src/firebase/admin.js";
import { createTenantForOwner } from "../src/services/tenant.service.js";
import { userRepository } from "../src/repositories/user.repository.js";
import { createDefaultUser } from "../src/models/user.model.js";

const [, , EMAIL, PASSWORD, COMPANY_NAME = "Şahin Emlak"] = process.argv;

if (!EMAIL || !PASSWORD) {
  console.error('Kullanım: node scripts/bootstrap-owner.js <email> <şifre> ["Şirket Adı"]');
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
  const userData = createDefaultUser({ tenantId: tenant.id, email: EMAIL, displayName: "Cihan Hayta", role: "owner" });
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
