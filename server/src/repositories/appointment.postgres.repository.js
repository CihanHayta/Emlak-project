// server/src/repositories/appointment.postgres.repository.js
//
// appointment.repository.js'in (Firestore) PostgreSQL karşılığı — AYNI tek
// ekstra metod: findByDateRange (slot çakışma kontrolü, bkz.
// appointment.service.js). `date_time` BIGINT (epoch-ms) — Aşama 2'de
// typeParsers.js ile number olarak dönmesi garanti edildi.
import { BasePostgresRepository } from "./base.postgres.repository.js";
import { getPool } from "../db/pool.js";
import { toCamelCaseRow } from "../db/caseMapper.js";

class AppointmentPostgresRepository extends BasePostgresRepository {
  constructor() {
    super("appointments");
  }

  /** `[startMs, endMs)` aralığındaki randevuları döner — appointment.repository.js#findByDateRange ile birebir aynı yarı-açık aralık semantiği. */
  async findByDateRange(context, startMs, endMs) {
    const pool = await getPool();
    const { rows } = await pool.query(
      `SELECT * FROM appointments WHERE tenant_id = $1 AND deleted_at IS NULL AND date_time >= $2 AND date_time < $3`,
      [context.tenantId, startMs, endMs],
    );
    return rows.map(toCamelCaseRow);
  }
}

export const appointmentPostgresRepository = new AppointmentPostgresRepository();
