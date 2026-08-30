// server/migrations/tenant/1700000000005_create-appointments-table.js
//
// appointment.model.js ile birebir aynı. `date_time` BİLEREK BIGINT (epoch-ms
// düz sayı) — appointments.dateTime, DATA-MODEL.md'nin kendi belirttiği gibi
// diğer tüm alanların aksine Firestore Timestamp DEĞİL, ham Date.now() sayısı
// olarak tutuluyordu; frontend bunu bir Timestamp değil bir number bekliyor.
// BIGINT + src/db/typeParsers.js'teki int8 parser kaydı olmadan node-postgres
// bunu string döner — bu satırı unutmak sessizce "1737..." bir string
// döndürüp frontend'deki new Date(x) çağrılarını kırar.

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    CREATE TABLE appointments (
      id                 TEXT PRIMARY KEY,
      tenant_id          TEXT NOT NULL,
      customer_id        TEXT REFERENCES customers(id) ON DELETE SET NULL,
      service_type       TEXT NOT NULL DEFAULT 'İlan Gösterimi',
      listing_id         TEXT REFERENCES properties(id) ON DELETE SET NULL,
      date_time          BIGINT NOT NULL,
      status             TEXT NOT NULL DEFAULT 'Beklemede' CHECK (status IN ('Beklemede','Onaylandı','Tamamlandı','İptal Edildi')),
      note               TEXT NOT NULL DEFAULT '',
      reminder_sent_at   BIGINT,
      created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at          TIMESTAMPTZ,
      created_by           TEXT,
      updated_by            TEXT
    );
  `);

  pgm.sql(`CREATE INDEX idx_appointments_active ON appointments (tenant_id) WHERE deleted_at IS NULL;`);
  pgm.sql(`CREATE INDEX idx_appointments_customer ON appointments (customer_id);`);
  pgm.sql(`CREATE INDEX idx_appointments_listing ON appointments (listing_id);`);
  pgm.sql(`CREATE INDEX idx_appointments_date_time ON appointments (date_time);`);
}

export async function down(pgm) {
  pgm.sql(`DROP TABLE IF EXISTS appointments;`);
}
