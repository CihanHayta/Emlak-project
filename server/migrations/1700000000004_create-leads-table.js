// server/migrations/tenant/1700000000004_create-leads-table.js
//
// lead.model.js ile birebir aynı. `context` sayısal/JSON değil, serbest
// metin string (hangi formdan geldiği: hizmet adı / "İletişim Formu" /
// ilan başlığı) — faz0-frontend-envanteri.md'de doğrulandı, JSONB DEĞİL.

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    CREATE TABLE leads (
      id                       TEXT PRIMARY KEY,
      tenant_id                TEXT NOT NULL,
      name                     TEXT NOT NULL,
      phone                    TEXT NOT NULL,
      message                  TEXT NOT NULL DEFAULT '',
      context                  TEXT,
      funnel_id                TEXT REFERENCES funnels(id) ON DELETE SET NULL,
      status                   TEXT NOT NULL DEFAULT 'Yeni',
      response_alert_sent_at   BIGINT,
      created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at                TIMESTAMPTZ,
      created_by                 TEXT,
      updated_by                 TEXT
    );
  `);

  pgm.sql(`CREATE INDEX idx_leads_active ON leads (tenant_id) WHERE deleted_at IS NULL;`);
  pgm.sql(`CREATE INDEX idx_leads_funnel ON leads (funnel_id);`);
}

export async function down(pgm) {
  pgm.sql(`DROP TABLE IF EXISTS leads;`);
}
