// server/migrations/tenant/1700000000006_create-conversations-table.js
//
// conversation.model.js ile birebir aynı — Instagram DM entegrasyonu
// (webhook/OAuth mantığının kendisi bu migrasyonun kapsamı dışında, sadece
// kalıcılık katmanı Postgres'e taşınıyor). `last_message_at`/
// `window_expires_at`/`last_auto_reply_at`/`window_alert_sent_at` hepsi
// epoch-ms BIGINT — appointments.date_time'daki aynı gerekçe geçerli.

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    CREATE TABLE conversations (
      id                       TEXT PRIMARY KEY,
      tenant_id                TEXT NOT NULL,
      channel                  TEXT NOT NULL DEFAULT 'instagram',
      external_user_id         TEXT NOT NULL,   -- Instagram-scoped user id (IGSID)
      participant_name         TEXT,
      participant_username     TEXT,
      participant_avatar_url   TEXT,
      customer_id              TEXT REFERENCES customers(id) ON DELETE SET NULL,
      status                   TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
      last_message_at          BIGINT,
      last_message_preview     TEXT NOT NULL DEFAULT '',
      last_message_direction   TEXT NOT NULL DEFAULT 'inbound' CHECK (last_message_direction IN ('inbound','outbound')),
      unread_count             INT NOT NULL DEFAULT 0,
      window_expires_at        BIGINT,
      last_auto_reply_at       BIGINT,
      window_alert_sent_at     BIGINT,
      created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at                TIMESTAMPTZ,
      created_by                 TEXT,
      updated_by                  TEXT
    );
  `);

  pgm.sql(`CREATE INDEX idx_conversations_active ON conversations (tenant_id) WHERE deleted_at IS NULL;`);
  // conversation.repository.js#findByExternalUser — webhook'tan gelen her
  // olay bununla eşleştiriliyor, sık çalışan bir lookup.
  pgm.sql(`CREATE INDEX idx_conversations_external_user ON conversations (channel, external_user_id);`);
}

export async function down(pgm) {
  pgm.sql(`DROP TABLE IF EXISTS conversations;`);
}
