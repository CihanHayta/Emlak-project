// server/src/repositories/session.postgres.repository.js
//
// `sessions` tablosu diğer domain tablolarından farklı: BasePostgresRepository
// KULLANMIYOR, çünkü onun tüm metodları `context.tenantId` zorunlu kılıyor
// (bkz. #assertTenantId) — ama bir oturumu token'dan DOĞRULAMAK tam olarak
// "hangi tenant'a ait olduğumuzu henüz bilmediğimiz" andır (tenantId'yi
// BULMAK için bu sorguyu yapıyoruz). Bu yüzden doğrudan pool üzerinden,
// tenant'tan bağımsız çalışan küçük bir repository.
import { randomUUID } from "node:crypto";
import { getPool } from "../db/pool.js";
import { toCamelCaseRow } from "../db/caseMapper.js";

export const sessionRepository = {
  async create({ userId, tenantId, tokenHash, expiresAt }) {
    const pool = await getPool();
    const id = randomUUID();
    const { rows } = await pool.query(
      `INSERT INTO sessions (id, user_id, tenant_id, token_hash, expires_at) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [id, userId, tenantId, tokenHash, expiresAt],
    );
    return toCamelCaseRow(rows[0]);
  },

  /** Geçerli (iptal edilmemiş VE süresi geçmemiş) bir oturumu token hash'inden bulur — authMiddleware'in tek girişi. */
  async findValidByTokenHash(tokenHash) {
    const pool = await getPool();
    const { rows } = await pool.query(
      `SELECT * FROM sessions WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()`,
      [tokenHash],
    );
    return rows[0] ? toCamelCaseRow(rows[0]) : null;
  },

  /** Logout: SADECE mevcut tarayıcının oturumunu iptal eder — diğer cihazlardaki oturumlara dokunmaz. */
  async revokeByTokenHash(tokenHash) {
    const pool = await getPool();
    await pool.query(`UPDATE sessions SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL`, [tokenHash]);
  },

  /** Şifre değişti / hesap pasife alındı / hesap silindi: o kullanıcının TÜM oturumları (her cihazda) hemen geçersiz kılınır. */
  async revokeAllForUser(userId) {
    const pool = await getPool();
    await pool.query(`UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`, [userId]);
  },
};
