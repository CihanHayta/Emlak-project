// server/src/repositories/conversation.postgres.repository.js
//
// conversation.repository.js'in (Firestore) PostgreSQL karşılığı — AYNI tek
// ekstra metod: findByExternalUser (webhook'un "bu Instagram kullanıcısıyla
// zaten bir sohbet var mı" kontrolü). `last_message_at`/`window_expires_at`/
// `last_auto_reply_at`/`window_alert_sent_at` hepsi BIGINT — number olarak döner.
import { BasePostgresRepository } from "./base.postgres.repository.js";
import { getPool } from "../db/pool.js";
import { toCamelCaseRow } from "../db/caseMapper.js";

class ConversationPostgresRepository extends BasePostgresRepository {
  constructor() {
    super("conversations");
  }

  async findByExternalUser(context, channel, externalUserId) {
    const pool = await getPool();
    const { rows } = await pool.query(
      `SELECT * FROM conversations WHERE tenant_id = $1 AND deleted_at IS NULL AND channel = $2 AND external_user_id = $3 LIMIT 1`,
      [context.tenantId, channel, externalUserId],
    );
    return rows[0] ? toCamelCaseRow(rows[0]) : null;
  }
}

export const conversationPostgresRepository = new ConversationPostgresRepository();
