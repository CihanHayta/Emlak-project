// server/tests/postgres/vehicleMediaUpload.postgres.test.js
//
// Aşama 6 — presigned upload akışının uçtan uca testi: intent iste → R2
// mock'a GERÇEKTEN PUT et (app.js'teki /mock-r2-upload route'u, bkz. o
// dosyanın yorumu) → confirm et → DB satırı doğru mu kontrol et. Ayrıca
// "yarım/bozuk kayıt oluşmasın" gereksinimi: hiç upload edilmeden confirm
// çağrılırsa DB'ye HİÇBİR satır yazılmadığını doğruluyor.
import { jest } from "@jest/globals";
import request from "supertest";
import { getTestPool, truncateAll, closeTestPool } from "./pgTestDb.js";

jest.unstable_mockModule("../../src/db/pool.js", () => ({ getPool: async () => getTestPool() }));

const { createVehicle, getVehicle, listVehicles, listVehicleMedia, deleteVehicleMedia } = await import(
  "../../src/services/vehicle.postgres.service.js"
);
const { createVehicleMediaUploadIntent, confirmVehicleMediaUpload } = await import(
  "../../src/services/vehicle.postgres.service.js"
);
const { app } = await import("../../src/app.js");

const context = { tenantId: "test-tenant", userId: "u1", role: "owner" };
const otherTenant = { tenantId: "other-tenant", userId: "u2", role: "owner" };

function baseVehicle() {
  return { category: "satilik", brand: "Toyota", model: "Corolla", year: 2022, title: "Test", price: "1 TL" };
}

/**
 * `getUploadUrl` mock modda `http://localhost:PORT/mock-r2-upload/...` gibi
 * MUTLAK bir URL döner (gerçek dev ortamındaki gibi) — burada gerçek bir
 * port açmak yerine supertest ile doğrudan `app`'e enjekte ediyoruz, path
 * kısmını URL'den çıkarıp kullanıyoruz.
 */
async function putToMockR2(uploadUrl, buffer, contentType) {
  const path = new URL(uploadUrl).pathname;
  const response = await request(app).put(path).set("Content-Type", contentType).send(buffer);
  if (response.status !== 200) throw new Error(`mock PUT başarısız: HTTP ${response.status}`);
}

describe("vehicle.postgres.service — presigned upload akışı (mock R2)", () => {
  let vehicle;

  beforeAll(() => getTestPool());
  beforeEach(async () => {
    await truncateAll();
    vehicle = await createVehicle(context, baseVehicle());
  });
  afterAll(() => closeTestPool());

  it("intent → GERÇEK PUT → confirm → DB'de doğru metadata ile satır oluşur", async () => {
    const intent = await createVehicleMediaUploadIntent(context, vehicle.id, {
      kind: "image",
      mimeType: "image/jpeg",
      fileSize: 12,
    });
    expect(intent.objectKey).toMatch(new RegExp(`^vehicles/${vehicle.id}/image/`));
    expect(intent.uploadUrl).toContain("mock-r2-upload");

    const buffer = Buffer.from("sahte-jpeg1");
    await putToMockR2(intent.uploadUrl, buffer, "image/jpeg");

    const media = await confirmVehicleMediaUpload(context, vehicle.id, {
      objectKey: intent.objectKey,
      kind: "image",
      mimeType: "image/jpeg",
    });

    expect(media.objectKey).toBe(intent.objectKey);
    expect(media.fileSize).toBe(buffer.length); // R2'nin (mock'un) KENDİSİNDEN okundu, istemcinin iddiasından değil
    expect(media.isCover).toBe(true); // ilk fotoğraf otomatik kapak

    const all = await listVehicleMedia(context, vehicle.id);
    expect(all).toHaveLength(1);
  });

  it("desteklenmeyen mime type presign aşamasında reddedilir (R2'ye hiç istek gitmez)", async () => {
    await expect(
      createVehicleMediaUploadIntent(context, vehicle.id, { kind: "image", mimeType: "application/zip" }),
    ).rejects.toThrow(/Desteklenmeyen/);
  });

  it("HİÇ upload edilmeden confirm çağrılırsa DB'ye satır YAZILMAZ (yarım kayıt koruması)", async () => {
    const intent = await createVehicleMediaUploadIntent(context, vehicle.id, { kind: "image", mimeType: "image/jpeg" });

    await expect(
      confirmVehicleMediaUpload(context, vehicle.id, { objectKey: intent.objectKey, kind: "image" }),
    ).rejects.toThrow(/bulunamadı/);

    expect(await listVehicleMedia(context, vehicle.id)).toHaveLength(0);
  });

  it("IDOR: başka tenant bu araç için upload intent isteyemez", async () => {
    await expect(
      createVehicleMediaUploadIntent(otherTenant, vehicle.id, { kind: "image", mimeType: "image/jpeg" }),
    ).rejects.toThrow(/bulunamadı/);
  });

  it("IDOR: başka bir kayıt için üretilmiş object_key bu araca confirm edilemez", async () => {
    const otherVehicle = await createVehicle(context, baseVehicle());
    const intent = await createVehicleMediaUploadIntent(context, otherVehicle.id, { kind: "image", mimeType: "image/jpeg" });
    await putToMockR2(intent.uploadUrl, Buffer.from("x"), "image/jpeg");

    // Aynı tenant, ama object_key BAŞKA bir araca ait — vehicle.id'nin kendi confirm'üne sokulmaya çalışılıyor.
    await expect(
      confirmVehicleMediaUpload(context, vehicle.id, { objectKey: intent.objectKey, kind: "image" }),
    ).rejects.toThrow(/ait değil/);
  });

  it("video onaylanınca vehicles.has_video true olur, PDF ekspertiz raporu admin_only olmadan public listelenir", async () => {
    const videoIntent = await createVehicleMediaUploadIntent(context, vehicle.id, { kind: "video", mimeType: "video/mp4" });
    await putToMockR2(videoIntent.uploadUrl, Buffer.from("sahte-video-verisi"), "video/mp4");
    await confirmVehicleMediaUpload(context, vehicle.id, { objectKey: videoIntent.objectKey, kind: "video" });

    const docIntent = await createVehicleMediaUploadIntent(context, vehicle.id, { kind: "document", mimeType: "application/pdf" });
    await putToMockR2(docIntent.uploadUrl, Buffer.from("%PDF-1.4 sahte"), "application/pdf");
    await confirmVehicleMediaUpload(context, vehicle.id, {
      objectKey: docIntent.objectKey,
      kind: "document",
      visibility: "public",
      documentLabel: "ekspertiz.pdf",
    });

    const { getVehicle } = await import("../../src/services/vehicle.postgres.service.js");
    expect((await getVehicle(context, vehicle.id)).hasVideo).toBe(true);

    const publicContext = { tenantId: "test-tenant", userId: null, role: "public" };
    const publicMedia = await listVehicleMedia(publicContext, vehicle.id);
    expect(publicMedia.some((m) => m.kind === "document" && m.documentLabel === "ekspertiz.pdf")).toBe(true);
  });

  // Regresyon testi: property.postgres.service.js#withGalleryFields'in aynı
  // kök sebep/çözümü — VehicleDetail.jsx da (PropertyGallery.jsx üzerinden)
  // image/images/videoUrl/expertiseReportUrl bekliyor, bunlar artık
  // vehicle_media'dan okuma anında hesaplanıyor.
  it("fotoğraf+video+ekspertiz PDF'i getVehicle/listVehicles yanıtında image/images/videoUrl/expertiseReportUrl alanlarına yansır, silinince kaybolur", async () => {
    const empty = await getVehicle(context, vehicle.id);
    expect(empty.images).toEqual([]);
    expect(empty.image).toBe("");
    expect(empty.videoUrl).toBeNull();
    expect(empty.expertiseReportUrl).toBeNull();

    const photoIntent = await createVehicleMediaUploadIntent(context, vehicle.id, { kind: "image", mimeType: "image/jpeg" });
    await putToMockR2(photoIntent.uploadUrl, Buffer.from("sahte-foto"), "image/jpeg");
    const photo = await confirmVehicleMediaUpload(context, vehicle.id, { objectKey: photoIntent.objectKey, kind: "image" });

    const videoIntent = await createVehicleMediaUploadIntent(context, vehicle.id, { kind: "video", mimeType: "video/mp4" });
    await putToMockR2(videoIntent.uploadUrl, Buffer.from("sahte-video"), "video/mp4");
    const video = await confirmVehicleMediaUpload(context, vehicle.id, { objectKey: videoIntent.objectKey, kind: "video" });

    const docIntent = await createVehicleMediaUploadIntent(context, vehicle.id, { kind: "document", mimeType: "application/pdf" });
    await putToMockR2(docIntent.uploadUrl, Buffer.from("%PDF-1.4 sahte"), "application/pdf");
    await confirmVehicleMediaUpload(context, vehicle.id, {
      objectKey: docIntent.objectKey,
      kind: "document",
      category: "ekspertiz",
      visibility: "public",
      documentLabel: "ekspertiz-raporu.pdf",
    });

    const withMedia = await getVehicle(context, vehicle.id);
    expect(withMedia.images).toEqual([photo.url]);
    expect(withMedia.image).toBe(photo.url);
    expect(withMedia.videoUrl).toBe(video.url);
    expect(withMedia.expertiseReportUrl).toContain(docIntent.objectKey.split("/").pop());
    expect(withMedia.expertiseReportName).toBe("ekspertiz-raporu.pdf");

    // Liste görünümü (admin panel grid'i / public site kartları) da aynı kapak fotoğrafını görmeli.
    const inList = (await listVehicles(context)).find((v) => v.id === vehicle.id);
    expect(inList.image).toBe(photo.url);

    await deleteVehicleMedia(context, vehicle.id, photo.id);
    const afterDelete = await getVehicle(context, vehicle.id);
    expect(afterDelete.images).toEqual([]);
    expect(afterDelete.image).toBe("");
  });
});
