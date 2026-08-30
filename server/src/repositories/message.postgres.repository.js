// server/src/repositories/message.postgres.repository.js
//
// message.repository.js'in (Firestore) PostgreSQL karşılığı — AYNI tek
// ekstra metod: findByConversation. `attachments` ([{type,url}]) JSONB
// sütun, jsonbColumns ile işaretlendi (aksi halde bir JS dizisi doğrudan
// jsonb'ye yazılmaya çalışılıp tip hatası verirdi — bkz. customer.postgres.repository.js'teki aynı desen).
import { BasePostgresRepository } from "./base.postgres.repository.js";
import { getPool } from "../db/pool.js";
import { toCamelCaseRow } from "../db/caseMapper.js";

class MessagePostgresRepository extends BasePostgresRepository {
  constructor() {
    super("messages", { jsonbColumns: ["attachments"] });
  }

  async findByConversation(context, conversationId) {
    const pool = await getPool();
    const { rows } = await pool.query(
      `SELECT * FROM messages WHERE tenant_id = $1 AND deleted_at IS NULL AND conversation_id = $2 ORDER BY created_at ASC`,
      [context.tenantId, conversationId],
    );
    return rows.map(toCamelCaseRow);
  }
}

export const messagePostgresRepository = new MessagePostgresRepository();
