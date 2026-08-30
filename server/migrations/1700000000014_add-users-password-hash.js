// server/migrations/1700000000014_add-users-password-hash.js
//
// AŞAMA (Firebase Auth kaldırma): kimlik doğrulama artık tamamen Postgres'te
// — `password_hash` (bcrypt) burada, `sessions` tablosu ayrı bir migrasyonda
// (bkz. 1700000000015). `email` üzerinde artık GERÇEK bir UNIQUE kısıtı var
// (öncesinde sadece bir index vardı, benzersizliği tamamen Firebase Auth
// sağlıyordu — DB seviyesinde hiç garanti yoktu). Var olan satırlarda
// `password_hash` NULL kalabilir (eski Firebase Auth kullanıcılarının şifre
// hash'i bu DB'de hiç var olmadı, tek yönlü bir sistemden aktarılamaz) —
// canlıya alınırken owner `scripts/bootstrap-owner.js`'i yeniden çalıştırıp
// kendi şifresini set etmeli, diğer kullanıcılar Ayarlar sayfasından admin
// tarafından yeniden şifrelendirilmeli (bkz. docs/INSTALL.md).

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`ALTER TABLE users ADD COLUMN password_hash TEXT;`);
  pgm.sql(`ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);`);
}

export async function down(pgm) {
  pgm.sql(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_unique;`);
  pgm.sql(`ALTER TABLE users DROP COLUMN IF EXISTS password_hash;`);
}
