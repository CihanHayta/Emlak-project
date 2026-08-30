// server/migrations/tenant/1700000000010_add-property-media-metadata-columns.js
//
// Aşama 3 (properties/property_media geçişi) sırasında istenen metadata
// alanları — orijinal 1700000000001 migrasyonuna EKLENMEDİ, zaten uygulanmış
// bir migrasyonu değiştirmek yerine (node-pg-migrate her hedef veritabanında
// "hangi migration'lar uygulandı" diye kendi pgmigrations tablosuna bakıyor,
// geçmiş bir dosyayı sessizce değiştirmek zaten migrate edilmiş ortamlarda
// hiçbir etki yaratmaz ve şema/dosya arasında sessiz bir tutarsızlık
// bırakır) her zaman YENİ, ADDITIVE bir migrasyon eklemek doğru yol.
// Hepsi NULLABLE — mevcut satırları bozmaz.

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    ALTER TABLE property_media
      ADD COLUMN mime_type TEXT,
      ADD COLUMN file_size BIGINT,
      ADD COLUMN width INT,
      ADD COLUMN height INT;
  `);
}

export async function down(pgm) {
  pgm.sql(`
    ALTER TABLE property_media
      DROP COLUMN IF EXISTS mime_type,
      DROP COLUMN IF EXISTS file_size,
      DROP COLUMN IF EXISTS width,
      DROP COLUMN IF EXISTS height;
  `);
}
