// server/migrations/tenant/1700000000002_create-vehicles-tables.js
//
// server/src/models/vehicle.model.js ile birebir aynı alan seti — properties
// ile aynı desen (price bilerek string, media ayrı tabloda). `parts_status`/
// `equipment`/`history` Firestore'da da serbest biçimli dizi/obje listeleriydi
// (sabit bir şemaya oturmuyorlar, ör. partsStatus:[{part,status}]) — burada
// da JSONB olarak kalıyorlar, ayrı bir tabloya çıkarmanın (join karmaşıklığı
// dışında) hiçbir kazancı yok çünkü hiçbir yerde bunların içine tek başına
// sorgu/filtre atılmıyor.
//
// `vehicle_media` properties'in `property_media`'sından farklı olarak
// `visibility` taşıyor — vehicle.model.js'in kendi yorumu: expertiseReportUrl
// PUBLIC (araç detayında km yanında gösterilir), documents[] ADMIN-ONLY
// (public context'te asla dönmüyor, bkz. vehicle.service.js#toPublicVehicle).
// Bu ayrım Firestore'da servis katmanının elle filtrelemesiyle sağlanıyordu;
// burada bir kolon olarak modellemek, "public endpoint admin-only bir belgeyi
// yanlışlıkla döndürdü" sınıfı bir hatayı sorgu seviyesinde önlüyor.

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    CREATE TABLE vehicles (
      id                         TEXT PRIMARY KEY,
      tenant_id                  TEXT NOT NULL,
      category                   TEXT NOT NULL CHECK (category IN ('satilik','kiralik')),
      brand                      TEXT NOT NULL,
      model                      TEXT NOT NULL,
      year                       INT,
      km                         NUMERIC NOT NULL DEFAULT 0,
      fuel_type                  TEXT,
      transmission               TEXT,
      body_type                  TEXT NOT NULL DEFAULT '',
      engine_size                TEXT NOT NULL DEFAULT '',
      engine_power               TEXT NOT NULL DEFAULT '',
      drivetrain                 TEXT NOT NULL DEFAULT '',
      color                      TEXT NOT NULL DEFAULT '',
      door_count                 INT,
      seat_count                 INT,
      plate_nationality          TEXT NOT NULL DEFAULT 'TR',
      warranty                   BOOLEAN NOT NULL DEFAULT false,
      service_maintained         BOOLEAN NOT NULL DEFAULT false,
      inspection_valid_until     TEXT,   -- "YYYY-MM-DD", ISO tarih string'i (model.js'te de öyle)
      key_count                  INT,
      title                      TEXT NOT NULL,
      listing_no                 TEXT NOT NULL,
      price                      TEXT NOT NULL,
      negotiable                 BOOLEAN NOT NULL DEFAULT false,
      trade_in                   BOOLEAN NOT NULL DEFAULT false,
      credit_eligible            BOOLEAN NOT NULL DEFAULT false,
      status                     TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','reserved','sold','unpublished')),
      tramer_record               TEXT NOT NULL DEFAULT '',
      damage_amount               NUMERIC NOT NULL DEFAULT 0,
      changed_parts_count         INT NOT NULL DEFAULT 0,
      painted_parts_count         INT NOT NULL DEFAULT 0,
      local_painted_parts_count   INT NOT NULL DEFAULT 0,
      parts_status                JSONB NOT NULL DEFAULT '[]',
      equipment                   TEXT[] NOT NULL DEFAULT '{}',
      has_video                   BOOLEAN NOT NULL DEFAULT false,
      description                 TEXT NOT NULL DEFAULT '',
      history                     JSONB NOT NULL DEFAULT '[]',
      expertise_report_name       TEXT,  -- yüklenen dosyanın orijinal adı (gösterim için)
      admin_notes                 TEXT NOT NULL DEFAULT '',
      created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at                  TIMESTAMPTZ,
      created_by                  TEXT,
      updated_by                  TEXT
    );
  `);

  pgm.sql(`CREATE INDEX idx_vehicles_active ON vehicles (tenant_id, status) WHERE deleted_at IS NULL;`);
  pgm.sql(`CREATE INDEX idx_vehicles_listing_no ON vehicles (listing_no);`);

  pgm.sql(`
    CREATE TABLE vehicle_media (
      id             TEXT PRIMARY KEY,
      vehicle_id     TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
      kind           TEXT NOT NULL CHECK (kind IN ('image','video','document')),
      object_key     TEXT NOT NULL,
      url            TEXT NOT NULL,
      category       TEXT,             -- foto için "Ön"|"Arka"|... (imageCategories'in karşılığı); belge için tür (servis/tramer/garanti/diger)
      visibility     TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','admin_only')),
      document_label TEXT,             -- documents[].name / expertiseReportName karşılığı
      position       INT NOT NULL DEFAULT 0,
      is_cover       BOOLEAN NOT NULL DEFAULT false,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at     TIMESTAMPTZ
    );
  `);

  pgm.sql(`CREATE INDEX idx_vehicle_media_vehicle ON vehicle_media (vehicle_id, position) WHERE deleted_at IS NULL;`);
  pgm.sql(`
    CREATE UNIQUE INDEX idx_vehicle_media_one_cover
      ON vehicle_media (vehicle_id)
      WHERE is_cover = true AND deleted_at IS NULL;
  `);
}

export async function down(pgm) {
  pgm.sql(`DROP TABLE IF EXISTS vehicle_media;`);
  pgm.sql(`DROP TABLE IF EXISTS vehicles;`);
}
