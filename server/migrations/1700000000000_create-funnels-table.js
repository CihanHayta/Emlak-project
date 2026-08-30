// server/migrations/tenant/1700000000000_create-funnels-table.js
//
// Bu dizindeki migrasyonlar TENANT-BAŞINA izole veritabanına uygulanır
// (bkz. src/db/migrate.js#migrateTenantDatabase) — kontrol düzlemindeki
// merkezi migrations/control-plane/ ile KARIŞTIRILMAMALI. `funnels` önce
// gelir çünkü `leads.funnel_id` buna referans verir (bkz. sıradaki migrasyon).
//
// Firestore'da tenantId dışındaki tüm koleksiyonlarda olduğu ortak alanlar
// (createdAt/updatedAt/deletedAt/createdBy/updatedBy, bkz.
// server/src/models/base.model.js#withCreateFields) burada da birebir
// korunuyor — silme hâlâ soft-delete (`deleted_at IS NULL` ile filtrelenir),
// repository katmanı bu davranışı DEĞİŞTİRMEDEN devralacak.

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    CREATE TABLE funnels (
      id             TEXT PRIMARY KEY,
      tenant_id      TEXT NOT NULL,
      name           TEXT NOT NULL,
      slug           TEXT NOT NULL,
      status         TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
      headline       TEXT NOT NULL DEFAULT '',
      subheadline    TEXT NOT NULL DEFAULT '',
      video_url      TEXT NOT NULL DEFAULT '',
      hero_image     TEXT NOT NULL DEFAULT '',
      cta_text       TEXT NOT NULL DEFAULT 'Hemen Randevu Al',
      form_enabled   BOOLEAN NOT NULL DEFAULT true,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at     TIMESTAMPTZ,
      created_by     TEXT,
      updated_by     TEXT
    );
  `);

  pgm.sql(`CREATE INDEX idx_funnels_active ON funnels (tenant_id) WHERE deleted_at IS NULL;`);
  // funnel.service.js slug'ı tenant içinde benzersiz tutuyor (bkz. faz0 envanteri)
  // — soft-delete sonrası aynı slug'ın tekrar kullanılabilmesi için kısmi index.
  pgm.sql(`CREATE UNIQUE INDEX idx_funnels_slug_active ON funnels (slug) WHERE deleted_at IS NULL;`);
}

export async function down(pgm) {
  pgm.sql(`DROP TABLE IF EXISTS funnels;`);
}
