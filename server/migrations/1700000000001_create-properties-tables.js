// server/migrations/tenant/1700000000001_create-properties-tables.js
//
// `price` bilerek SAYI DEĞİL, hazır biçimlendirilmiş bir gösterim string'i
// ("2.750.000 TL") — server/src/models/property.model.js'in kendi yorumu
// bunu açıkça söylüyor: mevcut PropertyCard/filtre/sıralama kodu
// (digit-stripping ile sayıya çeviren parsePriceNumber) hiç değişmeden
// çalışmaya devam etsin diye BİLİNÇLİ bir tasarım kararı, buraya da aynen taşındı.
//
// Firestore'daki `images[]` (sıralı foto listesi) + `image` (kapak) +
// `videoUrl` (tekil video) üç ayrı alan yerine burada `property_media` adlı
// bağımsız bir tabloya ayrıştırıldı — `position` sıralamayı, `is_cover`
// kapak seçimini, `kind` foto/video ayrımını taşıyor. `has_video` yine de
// `properties` üzerinde denormalize bir bayrak olarak kalıyor çünkü ilan
// kartı/listesi her satırda "video var mı" diye join yapmadan tek bakışta
// bilmek istiyor (services katmanı media eklenip/silinince bunu günceller).

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    CREATE TABLE properties (
      id             TEXT PRIMARY KEY,
      tenant_id      TEXT NOT NULL,
      category       TEXT NOT NULL CHECK (category IN ('satilik','kiralik')),
      type           TEXT NOT NULL CHECK (type IN ('Daire','Müstakil','Arsa')),
      title          TEXT NOT NULL,
      listing_no     TEXT NOT NULL,
      price          TEXT NOT NULL,
      province       TEXT NOT NULL DEFAULT 'İstanbul',
      district       TEXT NOT NULL,
      neighborhood   TEXT NOT NULL,
      street         TEXT NOT NULL DEFAULT '',
      rooms          TEXT,                 -- sadece Daire/Müstakil'de anlamlı, Arsa'da null
      area           NUMERIC NOT NULL DEFAULT 0,
      floor          TEXT,                 -- serbest metin ("5. Kat"/"Tripleks"), sadece Daire/Müstakil'de
      zoning_status  TEXT,                 -- sadece Arsa'da anlamlı
      has_video      BOOLEAN NOT NULL DEFAULT false,
      description    TEXT NOT NULL DEFAULT '',
      amenities      TEXT[] NOT NULL DEFAULT '{}',
      show_location  BOOLEAN NOT NULL DEFAULT true,
      status         TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published','unpublished')),
      created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at     TIMESTAMPTZ,
      created_by     TEXT,
      updated_by     TEXT
    );
  `);

  pgm.sql(`CREATE INDEX idx_properties_active ON properties (tenant_id, status) WHERE deleted_at IS NULL;`);
  pgm.sql(`CREATE INDEX idx_properties_listing_no ON properties (listing_no);`);

  pgm.sql(`
    CREATE TABLE property_media (
      id             TEXT PRIMARY KEY,
      property_id    TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      kind           TEXT NOT NULL CHECK (kind IN ('image','video')),
      object_key     TEXT NOT NULL,   -- R2 anahtarı, örn. "image/<uuid>.webp" — sağlayıcıdan bağımsız, public URL bundan üretilir
      url            TEXT NOT NULL,   -- önbelleklenmiş public/CDN URL
      position       INT NOT NULL DEFAULT 0,
      is_cover       BOOLEAN NOT NULL DEFAULT false,
      video_duration_seconds NUMERIC,  -- sadece kind='video'
      created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at     TIMESTAMPTZ
    );
  `);

  pgm.sql(`CREATE INDEX idx_property_media_property ON property_media (property_id, position) WHERE deleted_at IS NULL;`);
  // Bir ilanın en fazla bir kapak fotoğrafı olabilir — kısmi unique index
  // ile veritabanı seviyesinde zorlanıyor (Firestore'da bu hiç garanti
  // edilmiyordu, servis katmanı disiplinine bağlıydı).
  pgm.sql(`
    CREATE UNIQUE INDEX idx_property_media_one_cover
      ON property_media (property_id)
      WHERE is_cover = true AND deleted_at IS NULL;
  `);
}

export async function down(pgm) {
  pgm.sql(`DROP TABLE IF EXISTS property_media;`);
  pgm.sql(`DROP TABLE IF EXISTS properties;`);
}
