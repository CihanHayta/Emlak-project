// server/migrations/tenant/1700000000003_create-customers-table.js
//
// customer.model.js/CustomerSheet.jsx ile birebir aynı alan seti.
// `timeline` (serbest metin log girdileri, [{id,label,at}]) JSONB olarak
// kalıyor — ayrı bir `customer_timeline_entries` tablosuna çıkarmadık çünkü
// hiçbir timeline girdisinin bağımsız bir kimliği/ilişkisi yok (başka hiçbir
// tablo bir timeline girdisine referans vermiyor), sadece append-only bir
// gösterim logu; ayrı tabloya bölmek join maliyeti eklerdi, kazancı olmazdı.

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    CREATE TABLE customers (
      id                     TEXT PRIMARY KEY,
      tenant_id              TEXT NOT NULL,
      role                   TEXT NOT NULL DEFAULT 'Alıcı' CHECK (role IN ('Alıcı','Satıcı')),
      selling_listing_id     TEXT REFERENCES properties(id) ON DELETE SET NULL,
      name                   TEXT NOT NULL,
      phone                  TEXT NOT NULL,
      email                  TEXT NOT NULL DEFAULT '',
      instagram              TEXT NOT NULL DEFAULT '',
      photo                  TEXT,
      source                 TEXT NOT NULL DEFAULT 'Manuel',
      status                 TEXT NOT NULL DEFAULT 'Yeni',
      interests              TEXT[] NOT NULL DEFAULT '{}',
      budget_min             NUMERIC NOT NULL DEFAULT 0,
      budget_max             NUMERIC NOT NULL DEFAULT 0,
      desired_province       TEXT NOT NULL DEFAULT '',
      desired_district       TEXT NOT NULL DEFAULT '',
      notes                  TEXT NOT NULL DEFAULT '',
      tags                   TEXT[] NOT NULL DEFAULT '{}',
      timeline                JSONB NOT NULL DEFAULT '[]',
      response_alert_sent_at BIGINT,   -- epoch-ms, Firestore Timestamp DEĞİL (automation.service.js idempotency alanı)
      created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at               TIMESTAMPTZ,
      created_by                TEXT,
      updated_by                TEXT
    );
  `);

  pgm.sql(`CREATE INDEX idx_customers_active ON customers (tenant_id) WHERE deleted_at IS NULL;`);
  pgm.sql(`CREATE INDEX idx_customers_selling_listing ON customers (selling_listing_id);`);
}

export async function down(pgm) {
  pgm.sql(`DROP TABLE IF EXISTS customers;`);
}
