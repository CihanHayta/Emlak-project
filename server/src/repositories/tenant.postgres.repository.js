// server/src/repositories/tenant.postgres.repository.js
//
// tenant.repository.js'in (Firestore) PostgreSQL karşılığı — AYNI gerekçeyle
// BasePostgresRepository'yi EXTEND ETMEZ: `tenants` tenant-scoped değil (bir
// tenant kendi kendinin scope'u olamaz), doğrudan id/slug ile sorgulanır.
// Tablo şeması zaten mevcuttu (bkz. migrations/1699999999999_create-tenants-table.js
// — tek-kiracılı pivot sırasında oluşturuldu ama hiç kullanılmadı, bu dosya
// onu ilk kez devreye alıyor).
//
// `updateTenantFirebase`/`findTenantsWithFirebaseConnected` BİLEREK
// TAŞINMADI — per-tenant Firebase projesi bağlama konsepti (her müşteri
// kendi Firebase projesini bağlar) tek-kiracılı + paylaşılan gerçek
// Firebase Auth pivotundan sonra ölü kod; job'ların tenant enumerate etme
// ihtiyacı `findActiveTenants`'a taşındı (bkz. tenant.service.js).
import { randomUUID } from "node:crypto";
import { getPool } from "../db/pool.js";
import { toCamelCaseRow } from "../db/caseMapper.js";

const JSONB_COLUMNS = ["plan", "usage", "instagram", "whatsapp", "facebookPage", "rolePermissions", "automations"];

function mapRow(row) {
  return toCamelCaseRow(row) ?? null;
}

/** INSERT/UPDATE için: camelCase alan adlarını snake_case sütun adına çevirir, JSONB alanları JSON.stringify eder. */
function serialize(data) {
  const out = {};
  for (const [key, value] of Object.entries(data)) {
    const column = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    out[column] = JSONB_COLUMNS.includes(key) && value !== null && value !== undefined ? JSON.stringify(value) : value;
  }
  return out;
}

export async function findTenantById(id) {
  const pool = await getPool();
  const { rows } = await pool.query(`SELECT * FROM tenants WHERE id = $1 AND deleted_at IS NULL`, [id]);
  return mapRow(rows[0]);
}

export async function findTenantBySlug(slug) {
  const pool = await getPool();
  const { rows } = await pool.query(`SELECT * FROM tenants WHERE slug = $1 AND deleted_at IS NULL`, [slug]);
  return mapRow(rows[0]);
}

export async function createTenant(data) {
  const pool = await getPool();
  const id = data.id ?? randomUUID();
  const payload = serialize({ ...data, id });
  const columns = Object.keys(payload);
  const values = Object.values(payload);
  const placeholders = columns.map((_, i) => `$${i + 1}`);
  const { rows } = await pool.query(
    `INSERT INTO tenants (${columns.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`,
    values,
  );
  return mapRow(rows[0]);
}

/**
 * Genel amaçlı kısmi güncelleme — üretim kodu daha spesifik setter'ları
 * (updateTenantInstagram vb.) kullanır, bu SADECE test fixture'larının
 * (birden fazla alanı tek seferde ayarlama ihtiyacı) rahatlığı için var,
 * Firestore repo'sundaki `updateTenant`'ın karşılığı.
 */
export async function updateTenant(id, updates) {
  const pool = await getPool();
  const payload = serialize(updates);
  const columns = Object.keys(payload);
  if (columns.length === 0) return;
  const values = Object.values(payload);
  const setClause = columns.map((column, i) => `${column} = $${i + 2}`).join(", ");
  await pool.query(`UPDATE tenants SET ${setClause}, updated_at = now() WHERE id = $1`, [id, ...values]);
}

async function updateColumn(id, column, value, { jsonb = false } = {}) {
  const pool = await getPool();
  const serialized = jsonb && value !== null ? JSON.stringify(value) : value;
  await pool.query(`UPDATE tenants SET ${column} = $1, updated_at = now() WHERE id = $2`, [serialized, id]);
}

/** OAuth akışı tamamlanınca/bağlantı kaldırılınca çağrılır — `data` null ise bağlantıyı temizler. */
export async function updateTenantInstagram(id, data) {
  await updateColumn(id, "instagram", data, { jsonb: true });
}

/** Webhook'ta `entry.id` (mesajı alan Instagram Business hesabı) elimizde oluyor — hesap id'sinden tenant'a dönmek için. JSONB path operatörü (`->>`), az sayıda satırda (B2B, elle onboard) ek indekse gerek duymayacak kadar hızlı. */
export async function findTenantByInstagramAccountId(igAccountId) {
  const pool = await getPool();
  const { rows } = await pool.query(
    `SELECT * FROM tenants WHERE deleted_at IS NULL AND instagram->>'accountId' = $1 LIMIT 1`,
    [igAccountId],
  );
  return mapRow(rows[0]);
}

/** Token yenileme işi için (bkz. jobs/instagramTokenRefresh.job.js) — süresi `beforeTimestamp`'ten önce dolacak, Instagram'ı bağlı tenant'ları bulur. */
export async function findTenantsWithExpiringInstagramToken(beforeTimestamp) {
  const pool = await getPool();
  const { rows } = await pool.query(
    `SELECT * FROM tenants WHERE deleted_at IS NULL AND instagram->>'tokenExpiresAt' IS NOT NULL AND (instagram->>'tokenExpiresAt')::timestamptz <= $1`,
    [beforeTimestamp],
  );
  return rows.map(mapRow);
}

/** WhatsApp Embedded Signup akışı tamamlanınca/bağlantı kaldırılınca çağrılır — `data` null ise bağlantıyı temizler. */
export async function updateTenantWhatsapp(id, data) {
  await updateColumn(id, "whatsapp", data, { jsonb: true });
}

/** Webhook'ta `entry.id` (WhatsApp Business Account id'si) elimizde oluyor — hesap id'sinden tenant'a dönmek için. */
export async function findTenantByWhatsappWabaId(wabaId) {
  const pool = await getPool();
  const { rows } = await pool.query(
    `SELECT * FROM tenants WHERE deleted_at IS NULL AND whatsapp->>'wabaId' = $1 LIMIT 1`,
    [wabaId],
  );
  return mapRow(rows[0]);
}

/** Token yenileme işi için (bkz. jobs/whatsappTokenRefresh.job.js) — bkz. findTenantsWithExpiringInstagramToken'ın açıklaması, aynı desen. */
export async function findTenantsWithExpiringWhatsappToken(beforeTimestamp) {
  const pool = await getPool();
  const { rows } = await pool.query(
    `SELECT * FROM tenants WHERE deleted_at IS NULL AND whatsapp->>'tokenExpiresAt' IS NOT NULL AND (whatsapp->>'tokenExpiresAt')::timestamptz <= $1`,
    [beforeTimestamp],
  );
  return rows.map(mapRow);
}

/** Facebook Sayfası bağlantısı kurulunca/kaldırılınca çağrılır — `data` null ise bağlantıyı temizler. */
export async function updateTenantFacebookPage(id, data) {
  await updateColumn(id, "facebook_page", data, { jsonb: true });
}

/** Webhook'ta `entry.id` (leadgen olayını gönderen Facebook Sayfası'nın id'si) elimizde oluyor — sayfa id'sinden tenant'a dönmek için. */
export async function findTenantByFacebookPageId(pageId) {
  const pool = await getPool();
  const { rows } = await pool.query(
    `SELECT * FROM tenants WHERE deleted_at IS NULL AND facebook_page->>'pageId' = $1 LIMIT 1`,
    [pageId],
  );
  return mapRow(rows[0]);
}

/** Owner "Ayarlar > Yetkiler" sayfasından kaydedince çağrılır. */
export async function updateTenantRolePermissions(id, data) {
  await updateColumn(id, "role_permissions", data, { jsonb: true });
}

/** Otomasyonlar sayfasından kaydedince çağrılır. */
export async function updateTenantAutomations(id, data) {
  await updateColumn(id, "automations", data, { jsonb: true });
}

const USAGE_FIELDS = new Set(["users", "properties", "storageBytes"]);

/**
 * `tenants.usage.{field}`'ı `delta` kadar artırır (negatifse azaltır).
 * Firestore versiyonu bunu bir transaction'da (oku-hesapla-yaz) yapıyordu;
 * Postgres'te `jsonb_set` ile TEK, atomik bir UPDATE yeterli — `field` sabit
 * bir küçük kümeden (USAGE_FIELDS) geldiği için SQL'e güvenle gömülebilir
 * (bind parametresi olarak JSONB path'e konamaz), `delta` her zaman
 * parametreli.
 */
export async function incrementTenantUsage(id, field, delta) {
  if (!USAGE_FIELDS.has(field)) throw new Error(`incrementTenantUsage: bilinmeyen alan "${field}".`);
  const pool = await getPool();
  await pool.query(
    `UPDATE tenants
     SET usage = jsonb_set(usage, '{${field}}', to_jsonb(COALESCE((usage->>'${field}')::numeric, 0) + $1::numeric)),
         updated_at = now()
     WHERE id = $2`,
    [delta, id],
  );
}

/**
 * Job'ların ("her tenant için otomasyon kontrolü yap") tenant enumerate
 * etme ihtiyacı — eski `findTenantsWithFirebaseConnected`'ın yerine geçti
 * (bkz. dosya başı notu). `cancelled` hariç tüm tenant'ları döner.
 */
export async function findActiveTenants() {
  const pool = await getPool();
  const { rows } = await pool.query(`SELECT * FROM tenants WHERE deleted_at IS NULL AND status != 'cancelled'`);
  return rows.map(mapRow);
}
