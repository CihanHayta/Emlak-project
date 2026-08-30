// server/src/repositories/base.postgres.repository.js
//
// base.repository.js'in (Firestore) BİREBİR PostgreSQL karşılığı — AYNI
// public API (findById/findAll/create/createWithId/update/softDelete),
// AYNI tenant-scoping garantisi, AYNI TenantScopeError. Amaç: bir servis
// katmanı, hangi repository'yi (Firestore mü Postgres mü) çağırdığını
// bilmeden aynı şekilde yazılabilsin — property.repository.js ile
// property.postgres.repository.js'in metod imzaları kasıtlı olarak
// AYNI'dır (bkz. docs, Aşama 2 tasarımı).
//
// Firestore'un "get sonra tenantId karşılaştır" iki adımlı savunmasının
// (bkz. base.repository.js#findById) burada TEK bir sorguya
// (`WHERE id=$1 AND tenant_id=$2`) sadeleşmesi bilinçli — DB-başına-tenant
// izolasyonunda tenant_id artık birincil güvenlik sınırı değil, bir kanarya
// sütunu (yanlış pool'a bağlanma gibi bir kod hatasını erken yakalamak
// için); bkz. Aşama 2 tasarım notları.
import { getPool } from "../db/pool.js";
import { toCamelCaseRow, toSnakeCaseRow, camelToSnake } from "../db/caseMapper.js";
import { TenantScopeError } from "../utils/TenantScopeError.js";
import { randomUUID } from "node:crypto";

export class BasePostgresRepository {
  #tableName;
  #jsonbColumns;

  /**
   * @param {string} tableName
   * @param {{ jsonbColumns?: string[] }} [options] - JSON.stringify edilmesi
   *   gereken sütunlar (JSONB) — TEXT[] sütunlar (ör. amenities/tags) buna
   *   dahil DEĞİL, pg driver'ı JS dizilerini onlar için doğrudan formatlıyor.
   */
  constructor(tableName, { jsonbColumns = [] } = {}) {
    this.#tableName = tableName;
    // Çağıranlar camelCase verebilir (ör. "partsStatus") — #serializeRow
    // zaten snake_case'e çevrilmiş bir satıma karşı bu setten arıyor, bu
    // yüzden burada BİR KERE snake_case'e normalize ediyoruz (aksi halde
    // "partsStatus" hiçbir zaman "parts_status" anahtarıyla eşleşmez, JSONB
    // sütun sessizce JSON.stringify EDİLMEZ ve bir JS dizisi/objesi
    // doğrudan yazılmaya çalışılıp tip hatası verir).
    this.#jsonbColumns = new Set(jsonbColumns.map(camelToSnake));
  }

  #assertTenantId(context) {
    if (!context || typeof context.tenantId !== "string" || context.tenantId.trim() === "") {
      throw new TenantScopeError(
        `${this.#tableName}: context.tenantId olmadan sorgu kurulamaz (alınan: ${JSON.stringify(context)}).`,
      );
    }
  }

  async #pool(context) {
    this.#assertTenantId(context);
    return getPool();
  }

  #serializeRow(row) {
    const snake = toSnakeCaseRow(row);
    for (const column of this.#jsonbColumns) {
      if (column in snake && snake[column] !== null && snake[column] !== undefined) {
        snake[column] = JSON.stringify(snake[column]);
      }
    }
    return snake;
  }

  #mapRow(row) {
    if (!row) return null;
    const camel = toCamelCaseRow(row);
    return camel;
  }

  async findById(context, id) {
    const pool = await this.#pool(context);
    const { rows } = await pool.query(
      `SELECT * FROM ${this.#tableName} WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [id, context.tenantId],
    );
    return this.#mapRow(rows[0]) ?? null;
  }

  async findAll(context, { limit } = {}) {
    const pool = await this.#pool(context);
    const limitClause = limit ? `LIMIT ${Number(limit)}` : "";
    const { rows } = await pool.query(
      `SELECT * FROM ${this.#tableName} WHERE tenant_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC ${limitClause}`,
      [context.tenantId],
    );
    return rows.map((row) => this.#mapRow(row));
  }

  async create(context, data) {
    this.#assertTenantId(context);
    const id = data.id ?? randomUUID();
    return this.createWithId(context, id, data);
  }

  /** id verilmezse create() otomatik üretir; users gibi (Firebase uid'yi doküman id'si yapan) tablolar id'yi kendi verir. */
  async createWithId(context, id, data) {
    const pool = await this.#pool(context);
    const payload = this.#serializeRow({ ...data, id, tenantId: context.tenantId });
    const columns = Object.keys(payload);
    const values = Object.values(payload);
    const placeholders = columns.map((_, index) => `$${index + 1}`);
    const { rows } = await pool.query(
      `INSERT INTO ${this.#tableName} (${columns.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`,
      values,
    );
    return this.#mapRow(rows[0]);
  }

  async update(context, id, updates) {
    const existing = await this.findById(context, id);
    if (!existing) throw new TenantScopeError(`${this.#tableName}/${id}: bu tenant'a ait bulunamadı.`);

    const pool = await this.#pool(context);
    const payload = this.#serializeRow(updates);
    const columns = Object.keys(payload);
    if (columns.length === 0) return existing;
    const values = Object.values(payload);
    const setClause = columns.map((column, index) => `${column} = $${index + 3}`).join(", ");
    const { rows } = await pool.query(
      `UPDATE ${this.#tableName} SET ${setClause} WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [id, context.tenantId, ...values],
    );
    return this.#mapRow(rows[0]);
  }

  async softDelete(context, id) {
    return this.update(context, id, { deletedAt: new Date() });
  }
}
