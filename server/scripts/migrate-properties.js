// server/scripts/migrate-properties.js
//
// Bir kerelik göç betiği: public site'ın statik örnek ilanlarını
// (src/data/properties.js — artık sadece 19 "flagship" ilan, eski 253'lük
// otomatik-üretilmiş filler seti Firestore kullanımını gereksiz
// şişirmemesi için kaldırıldı) gerçek Firestore'a yazar.
//
// Tek tenant (bu projenin kurulduğu emlak ofisi) varsayılır — hangi Firebase
// projesine bağlıysa, o projedeki ilk (tek) tenant'ı bulur.
//
// Kullanım: node scripts/migrate-properties.js
import "../src/config/env.js";
import { getFirestoreInstance } from "../src/firebase/admin.js";
import { propertyRepository } from "../src/repositories/property.repository.js";
import { createDefaultProperty } from "../src/models/property.model.js";
import { PROPERTIES } from "../../src/data/properties.js";

async function run() {
  const db = getFirestoreInstance();
  const tenantsSnap = await db.collection("tenants").limit(2).get();

  if (tenantsSnap.empty) {
    console.error("Hiç tenant bulunamadı — önce scripts/bootstrap-owner.js çalıştırın.");
    process.exit(1);
  }
  if (tenantsSnap.size > 1) {
    console.error("Birden fazla tenant var — bu betik tek-kiracılı kurulum varsayıyor, elle hangi tenant'a yazılacağını belirtmeniz gerekir.");
    process.exit(1);
  }

  const tenantDoc = tenantsSnap.docs[0];
  const tenantId = tenantDoc.id;
  console.log(`Tenant: ${tenantDoc.data().name} (${tenantId})`);

  const context = { tenantId, userId: null, role: "owner" };

  console.log(`${PROPERTIES.length} ilan taşınacak...`);
  let created = 0;
  for (const listing of PROPERTIES) {
    // eslint-disable-next-line no-unused-vars -- eski statik id'yi bilerek atıyoruz, Firestore kendi id'sini üretir.
    const { id, ...data } = listing;
    // eslint-disable-next-line no-await-in-loop -- sıralı, tek seferlik bir göç betiği; paralelleştirmeye gerek yok.
    await propertyRepository.create(context, createDefaultProperty(data));
    created += 1;
    console.log(`  [${created}/${PROPERTIES.length}] ${data.title}`);
  }

  console.log(`\n✅ Tamamlandı — ${created} ilan Firestore'a yazıldı.`);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("HATA:", err);
    process.exit(1);
  });
