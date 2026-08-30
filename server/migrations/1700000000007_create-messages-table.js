// server/migrations/tenant/1700000000007_create-messages-table.js
//
// message.model.js ile birebir aynı — bir conversation'a ait tek mesaj.
// `conversation_id` gerçek bir sahiplik ilişkisi (bir mesaj konuşmasız var
// olamaz) olduğu için CASCADE — properties/vehicles→media desenindeki gibi.

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    CREATE TABLE messages (
      id                    TEXT PRIMARY KEY,
      tenant_id             TEXT NOT NULL,
      conversation_id       TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      direction              TEXT NOT NULL CHECK (direction IN ('inbound','outbound')),
      text                    TEXT NOT NULL DEFAULT '',
      attachments             JSONB NOT NULL DEFAULT '[]',   -- [{type,url}]
      external_message_id     TEXT,   -- Meta'nın ürettiği "mid" — bugün kontrol edilmiyor, ileride idempotency için
      sender_id                TEXT,   -- inbound: Instagram IGSID; outbound: bizim kullanıcı id'imiz
      status                    TEXT,
      created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at                   TIMESTAMPTZ,
      created_by                    TEXT,
      updated_by                     TEXT
    );
  `);

  pgm.sql(`CREATE INDEX idx_messages_active ON messages (tenant_id) WHERE deleted_at IS NULL;`);
  pgm.sql(`CREATE INDEX idx_messages_conversation ON messages (conversation_id, created_at);`);
}

export async function down(pgm) {
  pgm.sql(`DROP TABLE IF EXISTS messages;`);
}
