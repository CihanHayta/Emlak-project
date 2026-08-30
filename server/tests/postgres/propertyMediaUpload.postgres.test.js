// server/tests/postgres/propertyMediaUpload.postgres.test.js — vehicleMediaUpload.postgres.test.js ile aynı desen, kısaltılmış (mekanizma ortak, bkz. mediaUpload.helpers.js).
import { jest } from "@jest/globals";
import request from "supertest";
import { getTestPool, truncateAll, closeTestPool } from "./pgTestDb.js";

jest.unstable_mockModule("../../src/db/pool.js", () => ({ getPool: async () => getTestPool() }));

const {
  createProperty,
  getProperty,
  listProperties,
  listPropertyMedia,
  createPropertyMediaUploadIntent,
  confirmPropertyMediaUpload,
  deletePropertyMedia,
} = await import("../../src/services/property.postgres.service.js");
const { app } = await import("../../src/app.js");

const context = { tenantId: "test-tenant", userId: "u1", role: "owner" };

function baseProperty() {
  return { category: "satilik", type: "Daire", title: "Test", price: "1 TL", district: "Kadıköy", neighborhood: "Moda" };
}

async function putToMockR2(uploadUrl, buffer, contentType) {
  const path = new URL(uploadUrl).pathname;
  const response = await request(app).put(path).set("Content-Type", contentType).send(buffer);
  if (response.status !== 200) throw new Error(`mock PUT başarısız: HTTP ${response.status}`);
}

describe("property.postgres.service — presigned upload akışı (mock R2)", () => {
  let property;

  beforeAll(() => getTestPool());
  beforeEach(async () => {
    await truncateAll();
    property = await createProperty(context, baseProperty());
  });
  afterAll(() => closeTestPool());

  it("intent → GERÇEK PUT → confirm → DB'de doğru metadata ile satır oluşur, object_key properties/{id}/ ile başlar", async () => {
    const intent = await createPropertyMediaUploadIntent(context, property.id, { kind: "image", mimeType: "image/webp" });
    expect(intent.objectKey).toMatch(new RegExp(`^properties/${property.id}/image/`));

    const buffer = Buffer.from("sahte-webp-verisi");
    await putToMockR2(intent.uploadUrl, buffer, "image/webp");

    const media = await confirmPropertyMediaUpload(context, property.id, { objectKey: intent.objectKey, kind: "image" });
    expect(media.fileSize).toBe(buffer.length);
    expect(media.mimeType).toBe("image/webp");

    expect(await listPropertyMedia(context, property.id)).toHaveLength(1);
  });

  it("dosya boyutu limiti aşan istek presign aşamasında reddedilir", async () => {
    await expect(
      createPropertyMediaUploadIntent(context, property.id, {
        kind: "image",
        mimeType: "image/jpeg",
        fileSize: 11 * 1024 * 1024, // limit 10MB
      }),
    ).rejects.toThrow(/büyük/);
  });

  // Regresyon testi: ListingForm.jsx'in yüklediği fotoğraf ilana hiç
  // bağlanmıyordu (image/images/videoUrl properties tablosunda yok, ama
  // frontend hâlâ bunları bekliyordu) — bkz. property.postgres.service.js
  // #withGalleryFields. Bu test tam olarak ilan detay sayfasının/kartının
  // gördüğü alanları (getProperty/listProperties'in DÖNÜŞ DEĞERİNİ) doğruluyor.
  it("yüklenen fotoğraf getProperty/listProperties yanıtında image/images alanlarına yansır, silinince kaybolur", async () => {
    expect((await getProperty(context, property.id)).images).toEqual([]);
    expect((await getProperty(context, property.id)).image).toBe("");

    const intent = await createPropertyMediaUploadIntent(context, property.id, { kind: "image", mimeType: "image/webp" });
    await putToMockR2(intent.uploadUrl, Buffer.from("sahte-webp-verisi"), "image/webp");
    const media = await confirmPropertyMediaUpload(context, property.id, { objectKey: intent.objectKey, kind: "image" });

    const withPhoto = await getProperty(context, property.id);
    expect(withPhoto.images).toEqual([media.url]);
    expect(withPhoto.image).toBe(media.url); // tek fotoğraf otomatik kapak olur

    // Liste görünümü (admin panel grid'i / public site kartları) de aynı alanı görmeli.
    const inList = (await listProperties(context)).find((p) => p.id === property.id);
    expect(inList.image).toBe(media.url);

    // Sayfa yenilenmiş gibi TEKRAR okunduğunda da aynı sonuç (kalıcılık, mock'ta değil DB'de duruyor).
    expect((await getProperty(context, property.id)).image).toBe(media.url);

    await deletePropertyMedia(context, property.id, media.id);
    const afterDelete = await getProperty(context, property.id);
    expect(afterDelete.images).toEqual([]);
    expect(afterDelete.image).toBe("");
  });
});
