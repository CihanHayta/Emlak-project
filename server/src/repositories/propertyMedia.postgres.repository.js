// server/src/repositories/propertyMedia.postgres.repository.js
//
// `property_media` (bkz. migrations/tenant/1700000000001_..., ve metadata
// eklentisi 1700000000010_...) BasePostgresRepository'yi GENİŞLETMİYOR —
// diğer tüm tablolardan farklı olarak `tenant_id` sütunu YOK, sahiplik
// SADECE `property_id` üzerinden, property'nin kendi tenant'ına transitif
// olarak bağlı (Firestore'da da media hiç bağımsız bir koleksiyon değildi,
// `properties/{id}.images[]` içine gömülüydü — burada ayrı bir tabloya
// çıkarılmış olması ilişkiyi DEĞİŞTİRMEDİ, sadece normalize etti).
//
// *** GÜVENLİK SÖZLEŞMESİ (IDOR) ***: bu repository'nin HİÇBİR metodu
// kendi başına "bu property gerçekten bu tenant'a mı ait" diye KONTROL
// ETMEZ — edemez de, elindeki tek bilgi zaten hangi tenant'ın pool'una
// bağlandığı. Sahiplik kontrolü ZORUNLU olarak ÇAĞIRAN tarafta
// (property.postgres.service.js) `propertyPostgresRepository.findById(context,
// propertyId)` ile, HER metoddan ÖNCE yapılmalı — bu dosya sadece bu
// sözleşmeye güvenerek çalışır, servis katmanı atlarsa IDOR açığı oluşur.
import { getPool } from "../db/pool.js";
import { toCamelCaseRow, toSnakeCaseRow } from "../db/caseMapper.js";
import { randomUUID } from "node:crypto";

function mapRow(row) {
  return row ? toCamelCaseRow(row) : null;
}

async function listByProperty(tenantId, propertyId) {
  const pool = await getPool();
  const { rows } = await pool.query(
    `SELECT * FROM property_media WHERE property_id = $1 AND deleted_at IS NULL ORDER BY position ASC`,
    [propertyId],
  );
  return rows.map(mapRow);
}

async function create(tenantId, propertyId, data) {
  const pool = await getPool();
  const id = data.id ?? randomUUID();
  const payload = toSnakeCaseRow({ ...data, id, propertyId });
  const columns = Object.keys(payload);
  const values = Object.values(payload);
  const placeholders = columns.map((_, index) => `$${index + 1}`);
  const { rows } = await pool.query(
    `INSERT INTO property_media (${columns.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`,
    values,
  );
  return mapRow(rows[0]);
}

/**
 * Kapak fotoğrafını değiştirir — TEK bir transaction içinde eskisini
 * indirir, yeniyi kapak yapar. `idx_property_media_one_cover` kısmi unique
 * index'i (bkz. migrations) zaten "en fazla bir kapak" kuralını
 * zorluyor, ama bu iki adım (unset + set) TEK ATOMIK işlem olmazsa ara
 * anda ya iki kapak ya da hiç kapak olmayan bir durumdan geçilebilir
 * (ya da index çakışma hatası fırlatabilir) — bu yüzden transaction zorunlu.
 */
async function setCover(tenantId, propertyId, mediaId) {
  const pool = await getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `UPDATE property_media SET is_cover = false WHERE property_id = $1 AND is_cover = true`,
      [propertyId],
    );
    const { rows } = await client.query(
      `UPDATE property_media SET is_cover = true WHERE id = $1 AND property_id = $2 AND deleted_at IS NULL RETURNING *`,
      [mediaId, propertyId],
    );
    if (rows.length === 0) {
      throw new Error(`setCover: media "${mediaId}" property "${propertyId}" altında bulunamadı.`);
    }
    await client.query("COMMIT");
    return mapRow(rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Sürükle-bırak sıralamasını tek bir transaction'da uygular — yarıda kesilen
 * bir sıralama isteği (ör. bağlantı koptu) bazı fotoğrafların eski, bazılarının
 * yeni sırada kalmasına yol açmamalı; ya hepsi ya hiçbiri.
 */
async function reorder(tenantId, propertyId, orderedMediaIds) {
  const pool = await getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const [index, mediaId] of orderedMediaIds.entries()) {
      // eslint-disable-next-line no-await-in-loop -- tek transaction içinde sıralı güncelleme, bir ilanın foto sayısı (onlarca) için paralelleştirmeye değmez.
      await client.query(`UPDATE property_media SET position = $1 WHERE id = $2 AND property_id = $3`, [
        index,
        mediaId,
        propertyId,
      ]);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function softDelete(tenantId, propertyId, mediaId) {
  const pool = await getPool();
  const { rows } = await pool.query(
    `UPDATE property_media SET deleted_at = now() WHERE id = $1 AND property_id = $2 RETURNING *`,
    [mediaId, propertyId],
  );
  return mapRow(rows[0]) ?? null;
}

export const propertyMediaPostgresRepository = { listByProperty, create, setCover, reorder, softDelete };
