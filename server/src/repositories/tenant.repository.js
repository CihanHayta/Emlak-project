// server/src/repositories/tenant.repository.js
//
// BaseRepository'yi extend ETMEZ: `tenants` koleksiyonu tenant-scoped
// değildir (bir tenant kendi kendinin scope'u olamaz) — doğrudan ID ile
// veya slug ile sorgulanır.
import { getFirestore } from "../firebase/firestore.client.js";

const COLLECTION = "tenants";

async function collection() {
  const db = await getFirestore();
  return db.collection(COLLECTION);
}

export async function findTenantById(id) {
  const doc = await (await collection()).doc(id).get();
  if (!doc.exists || doc.data().deletedAt) return null;
  return { id: doc.id, ...doc.data() };
}

export async function findTenantBySlug(slug) {
  const snapshot = await (await collection()).where("slug", "==", slug).limit(1).get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
}

export async function createTenant(data) {
  const col = await collection();
  const ref = col.doc();
  await ref.set(data);
  return { id: ref.id, ...data };
}

export async function updateTenant(id, updates) {
  const col = await collection();
  await col.doc(id).update(updates);
}

/** OAuth akışı tamamlanınca/bağlantı kaldırılınca çağrılır — `data` null ise bağlantıyı temizler. */
export async function updateTenantInstagram(id, data) {
  const col = await collection();
  await col.doc(id).update({ instagram: data });
}

/**
 * Webhook'ta `entry.id` (mesajı alan Instagram Business hesabı) elimizde
 * oluyor ama kimliksiz gelen bir istekten hangi tenant'a ait olduğunu
 * bilmiyoruz — hesap id'sinden tenant'a dönmek için kullanılır.
 * `instagram.accountId` üstünde composite index GEREKMEZ (Firestore tek
 * alanlı where'lerde otomatik index kullanır).
 */
export async function findTenantByInstagramAccountId(igAccountId) {
  const snapshot = await (await collection()).where("instagram.accountId", "==", igAccountId).limit(1).get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
}

/**
 * Token yenileme işi için (bkz. jobs/instagramTokenRefresh.job.js) — süresi
 * `beforeTimestamp`'ten önce dolacak, Instagram'ı bağlı tenant'ları bulur.
 * `instagram` alanı `null` olan (bağlı olmayan) tenant'larda `instagram.tokenExpiresAt`
 * de yok sayılır — Firestore eşitsizlik operatörlerinde alanı olmayan
 * dokümanları otomatik eler, mock Firestore da aynı davranışı taklit ediyor.
 */
export async function findTenantsWithExpiringInstagramToken(beforeTimestamp) {
  const snapshot = await (await collection()).where("instagram.tokenExpiresAt", "<=", beforeTimestamp).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

/**
 * `tenants/{id}.usage.{field}`'ı `delta` kadar artırır (negatifse azaltır),
 * transaction içinde oku-hesapla-yaz yaparak — mock ve gerçek Firestore
 * arasında taşınabilir olsun diye `FieldValue.increment`/dot-path update
 * yerine bilerek bu daha basit yöntem kullanıldı (bkz. firestore.mock.js'in
 * `update()`'i alan yollarını değil sadece yüzeysel birleştirmeyi destekler).
 */
export async function incrementTenantUsage(id, field, delta) {
  const db = await getFirestore();
  const col = await collection();
  const ref = col.doc(id);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data() ?? {};
    const usage = { users: 0, properties: 0, storageBytes: 0, ...data.usage };
    usage[field] = (usage[field] ?? 0) + delta;
    tx.update(ref, { usage });
  });
}
