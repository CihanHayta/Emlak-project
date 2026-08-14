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

/** WhatsApp Embedded Signup akışı tamamlanınca/bağlantı kaldırılınca çağrılır — `data` null ise bağlantıyı temizler. */
export async function updateTenantWhatsapp(id, data) {
  const col = await collection();
  await col.doc(id).update({ whatsapp: data });
}

/** Webhook'ta `entry.id` (WhatsApp Business Account id'si) elimizde oluyor — hesap id'sinden tenant'a dönmek için. */
export async function findTenantByWhatsappWabaId(wabaId) {
  const snapshot = await (await collection()).where("whatsapp.wabaId", "==", wabaId).limit(1).get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
}

/** Token yenileme işi için (bkz. jobs/whatsappTokenRefresh.job.js) — bkz. findTenantsWithExpiringInstagramToken'ın açıklaması, aynı desen. */
export async function findTenantsWithExpiringWhatsappToken(beforeTimestamp) {
  const snapshot = await (await collection()).where("whatsapp.tokenExpiresAt", "<=", beforeTimestamp).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

/** Tenant kendi Firebase projesine bağlanınca çağrılır — bkz.
 * tenant.service.js#connectTenantFirebaseProject. `data` null ise bağlantıyı
 * temizler (o andan itibaren bu tenant'a ait hiçbir sorgu çalışmaz). */
export async function updateTenantFirebase(id, data) {
  const col = await collection();
  await col.doc(id).update({ firebase: data });
}

/**
 * Yedekleme işi için (bkz. jobs/backupTenants.job.js) — kendi Firebase
 * projesi bağlı (silinmemiş) tüm tenant'ları döner. Tenant sayısı az
 * olacağından (B2B, elle onboard edilen müşteriler) tümünü çekip JS'te
 * filtrelemek, Firestore'un eşitsizlik sorgusu kısıtlarıyla uğraşmaktan
 * daha basit.
 */
export async function findTenantsWithFirebaseConnected() {
  const snapshot = await (await collection()).get();
  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((tenant) => !tenant.deletedAt && tenant.firebase);
}

/** Owner "Ayarlar > Yetkiler" sayfasından kaydedince çağrılır — bkz. tenant.service.js#setTenantRolePermissions. */
export async function updateTenantRolePermissions(id, data) {
  const col = await collection();
  await col.doc(id).update({ rolePermissions: data });
}

/** Otomasyonlar sayfasından kaydedince çağrılır — bkz. tenant.service.js#updateTenantAutomations. */
export async function updateTenantAutomations(id, data) {
  const col = await collection();
  await col.doc(id).update({ automations: data });
}

/** Facebook Sayfası bağlantısı kurulunca/kaldırılınca çağrılır — `data` null ise bağlantıyı temizler. */
export async function updateTenantFacebookPage(id, data) {
  const col = await collection();
  await col.doc(id).update({ facebookPage: data });
}

/** Webhook'ta `entry.id` (leadgen olayını gönderen Facebook Sayfası'nın id'si) elimizde oluyor — sayfa id'sinden tenant'a dönmek için. */
export async function findTenantByFacebookPageId(pageId) {
  const snapshot = await (await collection()).where("facebookPage.pageId", "==", pageId).limit(1).get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
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
