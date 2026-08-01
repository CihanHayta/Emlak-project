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
