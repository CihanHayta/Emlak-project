// server/tests/postgres/propertyMediaUpload.postgres.test.js — vehicleMediaUpload.postgres.test.js ile aynı desen, kısaltılmış (mekanizma ortak, bkz. mediaUpload.helpers.js).
import { jest } from "@jest/globals";
import request from "supertest";
import { getTestPool, truncateAll, closeTestPool } from "./pgTestDb.js";

jest.unstable_mockModule("../../src/db/pool.js", () => ({ getPool: async () => getTestPool() }));

const { createProperty, listPropertyMedia, createPropertyMediaUploadIntent, confirmPropertyMediaUpload } = await import(
  "../../src/services/property.postgres.service.js"
);
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
});
