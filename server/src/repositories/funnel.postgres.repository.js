// server/src/repositories/funnel.postgres.repository.js
//
// funnel.repository.js'in (Firestore) PostgreSQL karşılığı — AYNI tek ekstra
// metod: findBySlug (genel/public kampanya sayfası render'ı). Slug'ın tenant
// içinde benzersizliği artık ayrıca `idx_funnels_slug_active` kısmi unique
// index'iyle DB seviyesinde de garanti (bkz. migrations) — Firestore
// versiyonunda bu SADECE servis katmanı disipliniyle sağlanıyordu.
import { BasePostgresRepository } from "./base.postgres.repository.js";
import { getPool } from "../db/pool.js";
import { toCamelCaseRow } from "../db/caseMapper.js";

class FunnelPostgresRepository extends BasePostgresRepository {
  constructor() {
    super("funnels");
  }

  async findBySlug(context, slug) {
    const pool = await getPool();
    const { rows } = await pool.query(
      `SELECT * FROM funnels WHERE tenant_id = $1 AND deleted_at IS NULL AND slug = $2 LIMIT 1`,
      [context.tenantId, slug],
    );
    return rows[0] ? toCamelCaseRow(rows[0]) : null;
  }
}

export const funnelPostgresRepository = new FunnelPostgresRepository();
