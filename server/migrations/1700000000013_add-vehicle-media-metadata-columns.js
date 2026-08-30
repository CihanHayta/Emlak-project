// server/migrations/1700000000013_add-vehicle-media-metadata-columns.js
//
// Aşama 6 (upload sistemi) analizinde bulunan eksiklik: 1700000000010
// migrasyonu mime_type/file_size/width/height'ı sadece property_media'ya
// eklemişti ("vehicles'ın sırası geldiğinde eklenir" notuyla) — o sıra şimdi
// geldi. `video_duration_seconds` de property_media'da vardı, vehicle_media'da
// hiç yoktu (araç videoları için de aynı ihtiyaç var) — bu da ekleniyor.
// Hepsi NULLABLE, mevcut satırları bozmaz.

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    ALTER TABLE vehicle_media
      ADD COLUMN mime_type TEXT,
      ADD COLUMN file_size BIGINT,
      ADD COLUMN width INT,
      ADD COLUMN height INT,
      ADD COLUMN video_duration_seconds NUMERIC;
  `);
}

export async function down(pgm) {
  pgm.sql(`
    ALTER TABLE vehicle_media
      DROP COLUMN IF EXISTS mime_type,
      DROP COLUMN IF EXISTS file_size,
      DROP COLUMN IF EXISTS width,
      DROP COLUMN IF EXISTS height,
      DROP COLUMN IF EXISTS video_duration_seconds;
  `);
}
