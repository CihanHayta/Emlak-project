// server/scripts/test-upload-flow.js
//
// Aşama 6 — presigned upload akışının GERÇEK ortamda (gerçek Postgres +
// gerçek R2) uçtan uca testi: fotoğraf, video, PDF için ayrı ayrı
// intent → GERÇEK PUT (R2'ye doğrudan) → confirm → DB satırı doğrulaması.
// Test verileri sonunda temizlenir (medya + geçici araç kaydı silinir) —
// gerçek ortamda kalıcı çöp bırakmaz. Secret'lar loglanmaz.
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { closePool } from "../src/db/pool.js";
import {
  createVehicle,
  deleteVehicle,
  createVehicleMediaUploadIntent,
  confirmVehicleMediaUpload,
  listVehicleMedia,
} from "../src/services/vehicle.postgres.service.js";

const TEST_TENANT_ID = `upload-test-${randomUUID()}`;
const context = { tenantId: TEST_TENANT_ID, userId: "test-script", role: "owner" };

function checkEnv() {
  if (!process.env.DATABASE_URL) {
    console.error("[test-upload-flow] DATABASE_URL ayarlanmamış.");
    process.exit(1);
  }
  if (process.env.STORAGE_MODE !== "live") {
    console.error(`[test-upload-flow] STORAGE_MODE=live olmalı (şu an: ${process.env.STORAGE_MODE})`);
    process.exit(1);
  }
}

// Küçük ama GERÇEKTEN geçerli dosya imzalarıyla başlayan test verileri —
// R2 içerik doğrulaması yapmıyor ama gerçekçi bir mime/uzantı eşleşmesi
// için önemli (gerçek bir tarayıcının göndereceğine yakın baytlar).
const JPEG_HEADER = Buffer.from([0xff, 0xd8, 0xff, 0xe0]); // gerçek bir JPEG'in ilk baytları
const PDF_CONTENT = Buffer.from("%PDF-1.4\n%%EOF\n", "utf8");
const FAKE_MP4 = Buffer.concat([Buffer.from("ftypmp42", "utf8"), Buffer.alloc(64, 1)]); // gerçekçi boyutlu sahte video

async function uploadAndConfirm(vehicleId, { kind, mimeType, buffer, extra = {} }) {
  const intent = await createVehicleMediaUploadIntent(context, vehicleId, { kind, mimeType, fileSize: buffer.length });
  console.log(`   → object_key: ${intent.objectKey}`);

  const response = await fetch(intent.uploadUrl, { method: "PUT", body: buffer, headers: { "Content-Type": mimeType } });
  if (!response.ok) throw new Error(`R2'ye PUT başarısız: HTTP ${response.status}`);
  console.log("   → R2'ye gerçekten yüklendi.");

  const media = await confirmVehicleMediaUpload(context, vehicleId, { objectKey: intent.objectKey, kind, mimeType, ...extra });
  if (media.fileSize !== buffer.length) throw new Error(`Boyut uyuşmuyor: beklenen ${buffer.length}, DB'de ${media.fileSize}`);
  console.log(`   ✓ DB'ye kaydedildi — id=${media.id}, fileSize=${media.fileSize}, mimeType=${media.mimeType}`);
  return media;
}

async function run() {
  checkEnv();
  console.log(`Test tenant: ${TEST_TENANT_ID} (gerçek verilerinize KARIŞMAZ, sonda silinir)\n`);

  const vehicle = await createVehicle(context, {
    category: "satilik",
    brand: "Test",
    model: "UploadFlow",
    year: 2026,
    title: "Aşama 6 test aracı",
    price: "1 TL",
  });
  console.log(`Geçici test aracı oluşturuldu: ${vehicle.id}\n`);

  console.log("1) FOTOĞRAF (image/jpeg)...");
  await uploadAndConfirm(vehicle.id, { kind: "image", mimeType: "image/jpeg", buffer: JPEG_HEADER });

  console.log("\n2) VİDEO (video/mp4)...");
  await uploadAndConfirm(vehicle.id, { kind: "video", mimeType: "video/mp4", buffer: FAKE_MP4 });

  console.log("\n3) PDF (application/pdf, ekspertiz raporu — public)...");
  await uploadAndConfirm(vehicle.id, {
    kind: "document",
    mimeType: "application/pdf",
    buffer: PDF_CONTENT,
    extra: { visibility: "public", documentLabel: "ekspertiz-raporu.pdf" },
  });

  console.log("\n4) Hepsi listede görünüyor mu?...");
  const media = await listVehicleMedia(context, vehicle.id);
  if (media.length !== 3) throw new Error(`3 medya bekleniyordu, ${media.length} bulundu`);
  console.log(`   ✓ ${media.length} medya kaydı doğrulandı (image + video + document).`);

  console.log("\n5) Video onaylandıktan sonra vehicles.has_video=true mu?...");
  const { getVehicle } = await import("../src/services/vehicle.postgres.service.js");
  const fetched = await getVehicle(context, vehicle.id);
  if (!fetched.hasVideo) throw new Error("hasVideo true olmalıydı");
  console.log("   ✓ hasVideo=true.");

  console.log("\n6) Temizlik — test aracı ve TÜM medyası (DB + R2) siliniyor...");
  await deleteVehicle(context, vehicle.id);
  console.log("   ✓ Silindi.");

  console.log("\n✅ AŞAMA 6 — UÇTAN UCA UPLOAD TESTİ (fotoğraf + video + PDF) BAŞARILI.");
}

run()
  .catch((error) => {
    console.error("\n❌ Upload akışı testi BAŞARISIZ:", error.message);
    process.exitCode = 1;
  })
  .finally(closePool);
