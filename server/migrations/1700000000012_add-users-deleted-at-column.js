// server/migrations/tenant/1700000000012_add-users-deleted-at-column.js
//
// DÜZELTME: orijinal users migrasyonu `deleted_at` sütununu BİLEREK atlamıştı
// ("users hard-delete kullanıyor, soft-delete alanı gereksiz" mantığıyla) —
// ama bu, base.repository.js'in (Firestore) GERÇEK davranışıyla uyuşmuyor:
// `createDefaultUser` → `withCreateFields` HER koleksiyonda (users dahil,
// hiçbir istisna YOK) `deletedAt: null` yazıyor, VE `BaseRepository#scopedQuery`
// HER koleksiyonda (yine users dahil) `.where("deletedAt","==",null)`
// filtresini UYGULUYOR — users hard-delete kullandığı için bu alan pratikte
// hiç `null` dışında bir değer almıyor, ama alanın KENDİSİ var ve sorgu onu
// bekliyor. `BasePostgresRepository`'nin generic findById/findAll/update
// metodları da AYNI şekilde her tabloda `deleted_at IS NULL` varsayıyor —
// bu sütun olmadan users tablosunda her sorgu "column deleted_at does not
// exist" hatasıyla patlar. Ekleyip DEFAULT NULL bırakmak, Firestore'daki
// gerçek satır şeklini birebir eşliyor.

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`ALTER TABLE users ADD COLUMN deleted_at TIMESTAMPTZ;`);
}

export async function down(pgm) {
  pgm.sql(`ALTER TABLE users DROP COLUMN IF EXISTS deleted_at;`);
}
