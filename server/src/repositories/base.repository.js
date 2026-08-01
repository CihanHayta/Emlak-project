// server/src/repositories/base.repository.js
import { getFirestore } from "../firebase/firestore.client.js";
import { TenantScopeError } from "../utils/TenantScopeError.js";

/**
 * `tenants` ve `users` DIŞINDAKİ her koleksiyon repository'si bunu extend
 * eder. Amaç: tek satırlık bir unutkanlığın ("context geçmeyi unuttum")
 * veri sızıntısına dönüşmesini KOD SEVİYESİNDE imkânsız kılmak.
 *
 * `#collection` private class field olduğu için (JS dilinin kendisi
 * tarafından garanti edilir) alt sınıflar dahil hiçbir yerden doğrudan
 * erişilemez — tek yol bu sınıfın sunduğu `scoped*` metotlarıdır ve
 * hepsi önce `#assertTenantId` kontrolünden geçer.
 */
export class BaseRepository {
  #collectionName;

  constructor(collectionName) {
    this.#collectionName = collectionName;
  }

  #assertTenantId(context) {
    if (!context || typeof context.tenantId !== "string" || context.tenantId.trim() === "") {
      throw new TenantScopeError(
        `${this.#collectionName}: context.tenantId olmadan sorgu kurulamaz (alınan: ${JSON.stringify(context)}).`,
      );
    }
  }

  async #rawCollection() {
    const db = await getFirestore();
    return db.collection(this.#collectionName);
  }

  /** Alt sınıflar bunun üzerine SADECE ek `.where()/.orderBy()/.limit()` zincirleyebilir. */
  async scopedQuery(context) {
    this.#assertTenantId(context);
    const collection = await this.#rawCollection();
    return collection.where("tenantId", "==", context.tenantId).where("deletedAt", "==", null);
  }

  /** Var olan (veya yeni oluşturulacak) bir dokümana tenant-güvenli referans. */
  async scopedDocRef(context, id) {
    this.#assertTenantId(context);
    const collection = await this.#rawCollection();
    return collection.doc(id);
  }

  async findById(context, id) {
    const ref = await this.scopedDocRef(context, id);
    const doc = await ref.get();
    if (!doc.exists) return null;
    const data = doc.data();
    // Savunma amaçlı ikinci kontrol: doküman gerçekten bu tenant'a mı ait,
    // silinmiş mi. scopedQuery zaten bunu filtreler ama doğrudan ID ile
    // erişimde (get by id, where'siz) bu kontrol tek güvence.
    if (data.tenantId !== context.tenantId || data.deletedAt) return null;
    return { id: doc.id, ...data };
  }

  async findAll(context, { limit } = {}) {
    let query = await this.scopedQuery(context);
    if (limit) query = query.limit(limit);
    const snapshot = await query.get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async create(context, data) {
    this.#assertTenantId(context);
    const collection = await this.#rawCollection();
    const ref = collection.doc();
    const payload = { ...data, tenantId: context.tenantId };
    await ref.set(payload);
    return { id: ref.id, ...payload };
  }

  /** id verilmezse otomatik üretilir; users gibi (uid'yi doküman id'si yapan) koleksiyonlar id'yi kendi verir. */
  async createWithId(context, id, data) {
    const ref = await this.scopedDocRef(context, id);
    const payload = { ...data, tenantId: context.tenantId };
    await ref.set(payload);
    return { id, ...payload };
  }

  async update(context, id, updates) {
    const existing = await this.findById(context, id);
    if (!existing) throw new TenantScopeError(`${this.#collectionName}/${id}: bu tenant'a ait bulunamadı.`);
    const ref = await this.scopedDocRef(context, id);
    await ref.update(updates);
    return { ...existing, ...updates };
  }

  async softDelete(context, id) {
    return this.update(context, id, { deletedAt: new Date() });
  }
}
