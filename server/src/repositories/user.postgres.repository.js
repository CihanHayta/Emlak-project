// server/src/repositories/user.postgres.repository.js
//
// user.repository.js'in (Firestore) PostgreSQL karşılığı — AYNI iki ekstra
// metod (createWithUid, hardDelete), AYNI gerekçeyle: doküman/satır ID'si
// Firebase Auth `uid`'i (Auth bu aşamada DEĞİŞMİYOR, bkz. Aşama 12), ve
// kullanıcı hesapları soft-delete DEĞİL gerçek (hard) delete kullanıyor
// çünkü Auth hesabıyla her zaman birlikte, tam senkron silinmesi gerekiyor.
import { BasePostgresRepository } from "./base.postgres.repository.js";
import { getPool } from "../db/pool.js";

class UserPostgresRepository extends BasePostgresRepository {
  constructor() {
    super("users");
  }

  async createWithUid(context, uid, data) {
    return this.createWithId(context, uid, data);
  }

  async findByUid(context, uid) {
    return this.findById(context, uid);
  }

  /** users tablosunda deleted_at YOK (bkz. migrations) — gerçek DELETE. */
  async hardDelete(context, id) {
    const pool = await getPool();
    await pool.query(`DELETE FROM users WHERE id = $1 AND tenant_id = $2`, [id, context.tenantId]);
  }
}

export const userPostgresRepository = new UserPostgresRepository();
