// server/scripts/create-launch-funnel.js
//
// Funnel oluşturma admin UI'dan bilerek kaldırıldı (her kampanya sayfası
// artık referans bir tasarıma göre elle kodlanıyor, bkz. src/pages/FunnelPage.jsx)
// — bu yüzden ilk funnel kaydı (id + slug) burada tek seferlik bir script ile
// açılıyor. Sonrasında admin panelden (/admin/funnel/:id) metin/CTA alanları
// ve yayın durumu düzenlenebilir.
//
// Kullanım: node scripts/create-launch-funnel.js <tenantId>
import "../src/config/env.js";
import { createFunnel, updateFunnel } from "../src/services/funnel.service.js";

const [, , TENANT_ID] = process.argv;

if (!TENANT_ID) {
  console.error("Kullanım: node scripts/create-launch-funnel.js <tenantId>");
  process.exit(1);
}

async function run() {
  const context = { tenantId: TENANT_ID, userId: "script", role: "owner" };

  const funnel = await createFunnel(context, {
    name: "Instagram Kampanya",
    slug: "randevu",
    headline: "Hayalinizdeki Evi Bulmanın En Doğru Adresi",
    subheadline: "İster ilk eviniz olsun ister yatırım amaçlı arıyor olun, ihtiyacınıza en uygun portföyü birlikte bulalım.",
    ctaText: "Hemen Randevu Al",
    formEnabled: true,
  });
  console.log(`Funnel oluşturuldu: ${funnel.id} (slug: ${funnel.slug})`);

  await updateFunnel(context, funnel.id, { status: "published" });
  console.log("Yayına alındı.");
  console.log(`\n✅ Adres: /kampanya/${funnel.slug}`);
  console.log(`   Admin: /admin/funnel/${funnel.id}`);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("HATA:", err);
    process.exit(1);
  });
