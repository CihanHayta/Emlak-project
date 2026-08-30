// server/migrations/tenant/1700000000011_fix-users-role-check-constraint.js
//
// DÜZELTME: orijinal 1700000000009 migrasyonu `role IN ('owner','agent',
// 'assistant')` yazmıştı — user.model.js'in KENDİ yorumundan birebir
// alınmıştı, ama o yorum GÜNCEL DEĞİLMİŞ. Gerçek kaynak (src/config/
// constants.js#ROLES, src/config/permissions.js#BASE_PERMISSIONS,
// src/services/user.service.js#ASSIGNABLE_ROLES) 5 rol tanımlıyor: owner,
// admin, agent, assistant, viewer — "admin" (owner ile aynı taban izne
// sahip, `permissions.js` satır 13-14) ve "viewer" (salt-okunur personel,
// 2026-08-13'te eklendi) eksikti. Bu haliyle bir "viewer" ya da "admin"
// kullanıcısı oluşturmak CHECK ihlaliyle patlardı — Aşama 3'te users
// domain'i gerçekten koda bakılırken fark edildi, düzeltiliyor.

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`ALTER TABLE users DROP CONSTRAINT users_role_check;`);
  pgm.sql(`ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('owner','admin','agent','assistant','viewer'));`);
}

export async function down(pgm) {
  pgm.sql(`ALTER TABLE users DROP CONSTRAINT users_role_check;`);
  pgm.sql(`ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('owner','agent','assistant'));`);
}
