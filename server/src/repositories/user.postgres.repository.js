// server/src/repositories/user.postgres.repository.js
//
// AŞAMA (Firebase Auth kaldırma): `id` artık dışarıdan (Firebase uid)
// gelmiyor, `create()` (BasePostgresRepository) gibi otomatik üretiliyor.
// `users` tablosunda `deleted_at` pratikte hep NULL kalır — gerçek (hard)
// delete kullanılıyor (bkz. #hardDelete), diğer tüm tenant tablolarından
// FARKLI.
//
// GÜVENLİK: `password_hash` sütunu bu repository'nin SINIRLARINI ASLA
// aşmamalı — controller'a/API yanıtına kaçarsa şifre hash'i dışarı sızmış
// olur. Bu yüzden findById/findAll/create/update BURADA override edilip
// `password_hash` her zaman çıkarılıyor; hash'i GERÇEKTEN ihtiyaç duyan tek
// yer (`auth.service.js#login`, parola doğrulamak için) ayrı, açıkça
// isimlendirilmiş `findByEmailWithPasswordHash`'i kullanıyor.
import { BasePostgresRepository } from "./base.postgres.repository.js";
import { getPool } from "../db/pool.js";
import { toCamelCaseRow } from "../db/caseMapper.js";

class UserPostgresRepository extends BasePostgresRepository {
  constructor() {
    super("users");
  }

  #omitPasswordHash(user) {
    if (!user) return user;
    // eslint-disable-next-line no-unused-vars -- passwordHash bilerek atılıyor, rest döndürülüyor.
    const { passwordHash, ...rest } = user;
    return rest;
  }

  async findById(context, id) {
    return this.#omitPasswordHash(await super.findById(context, id));
  }

  async findAll(context, options) {
    const rows = await super.findAll(context, options);
    return rows.map((row) => this.#omitPasswordHash(row));
  }

  async create(context, data) {
    return this.#omitPasswordHash(await super.create(context, data));
  }

  async update(context, id, updates) {
    return this.#omitPasswordHash(await super.update(context, id, updates));
  }

  /**
   * SADECE bootstrap-owner.js kullanır: owner'ın id'sini tenant satırından
   * ÖNCE bilmek gerekiyor (`createTenantForOwner`'a `ownerUserId` olarak
   * geçiliyor), bu yüzden id burada `create()`'in otomatik ürettiği gibi
   * DEĞİL, çağıran tarafından (bootstrap script'i `randomUUID()` ile)
   * önceden üretilip veriliyor.
   */
  async createWithUid(context, uid, data) {
    return this.#omitPasswordHash(await super.createWithId(context, uid, data));
  }

  /** `findById`nin eski isimlendirmesi — user.postgres.service.js ve auth.service.js'de hâlâ kullanılıyor, gereksiz churn'den kaçınmak için tutuldu. */
  async findByUid(context, uid) {
    return this.findById(context, uid);
  }

  /**
   * Login zamanı henüz hangi tenant'a ait olduğumuzu BİLMİYORUZ (tenant'ı
   * bulmak için email'e bakıyoruz) — bu yüzden normal tenant-scoped
   * find*'lardan farklı olarak context istemiyor. Tek-kiracılı mimaride
   * (bkz. docs/ARCHITECTURE.md) bu güvenlik riski yaratmaz, zaten tek
   * tenant var. `password_hash` BİLEREK dahil — bu metodun TEK çağıranı
   * auth.service.js#login, parolayı doğrulamak için buna ihtiyaç duyuyor.
   */
  async findByEmailWithPasswordHash(email) {
    const pool = await getPool();
    const { rows } = await pool.query(`SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL`, [email]);
    return rows[0] ? toCamelCaseRow(rows[0]) : null;
  }

  /** Oturum doğrulamasında (her istekte) tenant'tan bağımsız, id'den canlı kullanıcı satırını çeker — bkz. auth.service.js#verifySessionToken. */
  async findByIdUnscoped(id) {
    const pool = await getPool();
    const { rows } = await pool.query(`SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL`, [id]);
    return rows[0] ? this.#omitPasswordHash(toCamelCaseRow(rows[0])) : null;
  }

  /** users tablosunda deleted_at pratikte hep NULL kalır — gerçek DELETE. */
  async hardDelete(context, id) {
    const pool = await getPool();
    await pool.query(`DELETE FROM users WHERE id = $1 AND tenant_id = $2`, [id, context.tenantId]);
  }
}

export const userPostgresRepository = new UserPostgresRepository();
