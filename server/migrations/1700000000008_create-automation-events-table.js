// server/migrations/tenant/1700000000008_create-automation-events-table.js
//
// automationEvent.model.js ile birebir aynı — Otomasyonlar sayfasındaki
// aktivite kaydı. Beş ayrı FK'nin hepsi opsiyonel (SET NULL) çünkü olay
// tipine göre hangisinin dolu olacağı değişiyor (bkz. model.js yorumları:
// windowClosing'de customerId null olabilir, sadece leadResponseAlert'te
// leadId dolu vb.) — hiçbiri "her zaman zorunlu" değil.

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    CREATE TABLE automation_events (
      id                TEXT PRIMARY KEY,
      tenant_id         TEXT NOT NULL,
      type              TEXT NOT NULL,   -- listingMatch | appointmentReminder | windowClosing | newLeadWelcome | leadResponseAlert
      customer_id       TEXT REFERENCES customers(id) ON DELETE SET NULL,
      listing_id        TEXT REFERENCES properties(id) ON DELETE SET NULL,
      appointment_id    TEXT REFERENCES appointments(id) ON DELETE SET NULL,
      conversation_id   TEXT REFERENCES conversations(id) ON DELETE SET NULL,
      lead_id           TEXT REFERENCES leads(id) ON DELETE SET NULL,
      channel           TEXT NOT NULL DEFAULT 'whatsapp',
      status            TEXT NOT NULL CHECK (status IN ('sent','pending_manual','manual_sent','failed')),
      message           TEXT,
      wa_link           TEXT,
      error_message     TEXT,
      sent_at           BIGINT,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at         TIMESTAMPTZ,
      created_by          TEXT,
      updated_by            TEXT
    );
  `);

  pgm.sql(`CREATE INDEX idx_automation_events_active ON automation_events (tenant_id) WHERE deleted_at IS NULL;`);
  pgm.sql(`CREATE INDEX idx_automation_events_type ON automation_events (type);`);
}

export async function down(pgm) {
  pgm.sql(`DROP TABLE IF EXISTS automation_events;`);
}
