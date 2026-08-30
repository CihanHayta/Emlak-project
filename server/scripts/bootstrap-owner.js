// server/scripts/bootstrap-owner.js
//
// Kendi kendine kayıt akışı YOK — bu proje tek-kiracılı olarak paketlenip
// her müşteriye AYRI bir deployment (kendi sunucusu, kendi bu veritabanı,
// kendi R2 bucket'ı) olarak satılıyor. Bu betik o deployment'ın TEK admin
// (owner) hesabını + tenant satırını oluşturur. Danışman/Personel/Kısıtlı
// hesapları sonra owner'ın kendisi, admin panelindeki Ayarlar sayfasından
// açar (bkz. src/services/user.postgres.service.js) — bu betiğe ihtiyaç
// duymadan.
//
// AŞAMA (Firebase Auth kaldırma): kimlik doğrulama artık tamamen Postgres —
// bu betik artık hem "owner'ı ilk kez oluştur" HEM DE "owner şifresini
// unuttu, sıfırla" işini görüyor (EMAIL zaten varsa PASSWORD'ü günceller).
// Bilinçli tercih: self-servis "şifremi unuttum" (e-posta ile sıfırlama
// linki) akışı KURULMADI — bu uygulamada kendi kendine kayıt yok, tek bir
// owner hesabı var, ve `DATABASE_URL`'e erişimi olan (bu betiği
// çalıştırabilecek) kişi zaten deployment'ın sahibi. Ayrı bir SMTP/e-posta
// gönderme altyapısı kurmak burada gerçek bir güvenlik ya da kullanılabilirlik
// kazancı sağlamadan sadece bakım yükü ekler (bkz. docs/SECURITY.md,
// "en az bağımlılık" ilkesi). Danışman/Personel/Kısıtlı hesaplarının şifresi
// zaten owner tarafından Ayarlar sayfasından (bkz. user.postgres.service.js
// #updateTeamMember) sıfırlanabiliyor — eksik olan TEK senaryo owner'ın
// kendi şifresini unutması, o da bu betikle çözülüyor.
//
// Kullanım:
//   node scripts/bootstrap-owner.js <email> <şifre> ["Şirket Adı"] ["Yetkili Ad Soyad"]
import "../src/config/env.js";
import { randomUUID } from "node:crypto";
import { createTenantForOwner } from "../src/services/tenant.service.js";
import { userPostgresRepository } from "../src/repositories/user.postgres.repository.js";
import { sessionRepository } from "../src/repositories/session.postgres.repository.js";
import { createDefaultUser } from "../src/models/user.model.js";
import { withUpdateFields } from "../src/models/base.model.js";
import { hashPassword } from "../src/utils/password.util.js";
import { normalizeEmail } from "../src/utils/email.util.js";

const [, , RAW_EMAIL, PASSWORD, COMPANY_NAME = "Yeni Emlak Ofisi", OWNER_DISPLAY_NAME = COMPANY_NAME] = process.argv;

function usageAndExit() {
  console.error('Kullanım: node scripts/bootstrap-owner.js <email> <şifre> ["Şirket Adı"] ["Yetkili Ad Soyad"]');
  process.exit(1);
}

if (!RAW_EMAIL || !PASSWORD) usageAndExit();
if (PASSWORD.length < 6) {
  console.error("HATA: Şifre en az 6 karakter olmalı.");
  process.exit(1);
}

async function run() {
  const email = normalizeEmail(RAW_EMAIL);
  const passwordHash = await hashPassword(PASSWORD);
  const existing = await userPostgresRepository.findByEmailWithPasswordHash(email);

  if (existing) {
    // Owner zaten var — bu çalıştırma bir ŞİFRE SIFIRLAMADIR.
    const context = { tenantId: existing.tenantId, userId: existing.id, role: existing.role };
    await userPostgresRepository.update(context, existing.id, withUpdateFields({ passwordHash }));
    // Eski şifreyle açık kalmış oturumlar (varsa) hemen düşer — bkz.
    // user.postgres.service.js#updateTeamMember'daki AYNI gerekçe.
    await sessionRepository.revokeAllForUser(existing.id);
    console.log(`✅ Şifre güncellendi: ${email}`);
    console.log(`   Tenant  : ${existing.tenantId}`);
    return;
  }

  // Yeni owner: id'yi ÖNCEDEN üretiyoruz — tenant satırı `ownerUserId`
  // ister ve tenant, user satırından ÖNCE oluşuyor.
  const userId = randomUUID();
  const tenant = await createTenantForOwner({ name: COMPANY_NAME, ownerUserId: userId });
  console.log(`Tenant oluşturuldu: ${tenant.id} (slug: ${tenant.slug})`);

  const context = { tenantId: tenant.id, userId, role: "owner" };
  const userData = createDefaultUser({ tenantId: tenant.id, email, displayName: OWNER_DISPLAY_NAME, role: "owner" });
  await userPostgresRepository.createWithUid(context, userId, { ...userData, passwordHash });
  console.log("Postgres users satırı oluşturuldu.");

  console.log(`\n✅ Tamamlandı — artık bu e-posta/şifre ile giriş yapılabilir.`);
  console.log(`   E-posta : ${email}`);
  console.log(`   Tenant  : ${tenant.id}`);
  console.log("\nFrontend .env dosyanızda:");
  console.log(`   VITE_TENANT_ID=${tenant.id}`);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("HATA:", err);
    process.exit(1);
  });
