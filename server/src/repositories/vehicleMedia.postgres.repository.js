// server/src/repositories/vehicleMedia.postgres.repository.js
//
// propertyMedia.postgres.repository.js ile AYNI desen (tenant_id yok,
// sahiplik vehicle_id üzerinden transitif — bkz. o dosyanın IDOR sözleşmesi
// yorumu, burada da AYNI kural geçerli). TEK gerçek fark: `visibility`
// sütunu — vehicle.service.js#toPublicVehicle'ın bugün elle yaptığı
// "documents/adminNotes public'e sızmasın" temizliğinin bir kısmı artık
// SORGU SEVİYESİNDE yapılabiliyor (`includeAdminOnly:false` ile public
// context'ten çağrıldığında admin-only satırlar hiç dönmez).
import { getPool } from "../db/pool.js";
import { toCamelCaseRow, toSnakeCaseRow } from "../db/caseMapper.js";
import { randomUUID } from "node:crypto";

function mapRow(row) {
  return row ? toCamelCaseRow(row) : null;
}

async function listByVehicle(tenantId, vehicleId, { includeAdminOnly = true } = {}) {
  const pool = await getPool();
  const visibilityClause = includeAdminOnly ? "" : "AND visibility = 'public'";
  const { rows } = await pool.query(
    `SELECT * FROM vehicle_media WHERE vehicle_id = $1 AND deleted_at IS NULL ${visibilityClause} ORDER BY position ASC`,
    [vehicleId],
  );
  return rows.map(mapRow);
}

async function create(tenantId, vehicleId, data) {
  const pool = await getPool();
  const id = data.id ?? randomUUID();
  const payload = toSnakeCaseRow({ ...data, id, vehicleId });
  const columns = Object.keys(payload);
  const values = Object.values(payload);
  const placeholders = columns.map((_, index) => `$${index + 1}`);
  const { rows } = await pool.query(
    `INSERT INTO vehicle_media (${columns.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`,
    values,
  );
  return mapRow(rows[0]);
}

/** propertyMediaPostgresRepository#setCover ile birebir aynı transaction deseni. */
async function setCover(tenantId, vehicleId, mediaId) {
  const pool = await getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`UPDATE vehicle_media SET is_cover = false WHERE vehicle_id = $1 AND is_cover = true`, [vehicleId]);
    const { rows } = await client.query(
      `UPDATE vehicle_media SET is_cover = true WHERE id = $1 AND vehicle_id = $2 AND deleted_at IS NULL RETURNING *`,
      [mediaId, vehicleId],
    );
    if (rows.length === 0) throw new Error(`setCover: media "${mediaId}" vehicle "${vehicleId}" altında bulunamadı.`);
    await client.query("COMMIT");
    return mapRow(rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function reorder(tenantId, vehicleId, orderedMediaIds) {
  const pool = await getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const [index, mediaId] of orderedMediaIds.entries()) {
      // eslint-disable-next-line no-await-in-loop -- tek transaction içinde sıralı güncelleme, propertyMedia ile aynı gerekçe.
      await client.query(`UPDATE vehicle_media SET position = $1 WHERE id = $2 AND vehicle_id = $3`, [index, mediaId, vehicleId]);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function softDelete(tenantId, vehicleId, mediaId) {
  const pool = await getPool();
  const { rows } = await pool.query(
    `UPDATE vehicle_media SET deleted_at = now() WHERE id = $1 AND vehicle_id = $2 RETURNING *`,
    [mediaId, vehicleId],
  );
  return mapRow(rows[0]) ?? null;
}

export const vehicleMediaPostgresRepository = { listByVehicle, create, setCover, reorder, softDelete };
