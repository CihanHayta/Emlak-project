// server/tests/postgres/vehicle.postgres.service.test.js — tests/vehicle.service.test.js ile paralel,
// ama medya (images/videoUrl/documents/expertiseReportUrl) artık vehicles
// tablosunda YOK — vehicle_media'ya ayrıştı (bkz. vehicle.postgres.service.js'in
// kendi yorumu). Bu yüzden bu dosya iki bölüme ayrılıyor: (1) skaler alanlar
// hâlâ vehicles tablosunda — o kısım orijinal testle BİREBİR paralel; (2) medya
// — propertyMedia'nın testlerinde zaten kanıtlanan CRUD/kapak/sıra mantığını
// tekrar etmiyor, sadece vehicle_media'ya ÖZGÜ yeni şeyi (visibility: public/
// admin_only filtrelemesi) test ediyor.
import { jest } from "@jest/globals";
import { getTestPool, truncateAll, closeTestPool } from "./pgTestDb.js";

jest.unstable_mockModule("../../src/db/pool.js", () => ({ getPool: async () => getTestPool() }));

const { createVehicle, getVehicle, updateVehicle, deleteVehicle, listVehicles, addVehicleMedia, listVehicleMedia } = await import(
  "../../src/services/vehicle.postgres.service.js"
);
const { mockR2Storage } = await import("../../src/db/mock/storage.mock.js");

const context = { tenantId: "test-tenant", userId: "u1", role: "owner" };
const publicContext = { tenantId: "test-tenant", userId: null, role: "public" };

function baseVehicle(overrides) {
  return {
    category: "satilik",
    brand: "Toyota",
    model: "Corolla",
    year: 2022,
    km: 15000,
    fuelType: "Benzin",
    transmission: "Otomatik",
    title: "2022 Toyota Corolla",
    price: "850.000 TL",
    ...overrides,
  };
}

describe("vehicle.postgres.service — CRUD ve skaler alanlar", () => {
  beforeAll(() => getTestPool());
  beforeEach(() => truncateAll());
  afterAll(() => closeTestPool());

  it("olmayan bir aracı getirmeye çalışınca NotFound fırlatır", async () => {
    await expect(getVehicle(context, "olmayan-id")).rejects.toThrow(/bulunamadı/);
  });

  it("yeni araç ilanı otomatik bir ilan no ile oluşur", async () => {
    const vehicle = await createVehicle(context, baseVehicle({}));
    expect(vehicle.listingNo).toMatch(/^\d{6}$/);
  });

  it("silinen araç listede görünmez (soft delete)", async () => {
    const vehicle = await createVehicle(context, baseVehicle({}));
    await deleteVehicle(context, vehicle.id);
    expect((await listVehicles(context)).find((v) => v.id === vehicle.id)).toBeUndefined();
  });

  it("`documents`/`adminNotes` public context'te ASLA görünmez (adminNotes skaler sütun)", async () => {
    const vehicle = await createVehicle(context, baseVehicle({ adminNotes: "Gizli not" }));
    const fetched = await getVehicle(publicContext, vehicle.id);
    expect(fetched.adminNotes).toBeUndefined();
  });

  it('"unpublished" araç public detayında NotFound gibi davranır, admin panelinde görünür', async () => {
    const vehicle = await createVehicle(context, baseVehicle({ status: "unpublished" }));
    await expect(getVehicle(publicContext, vehicle.id)).rejects.toThrow(/bulunamadı/);
    expect((await getVehicle(context, vehicle.id)).id).toBe(vehicle.id);
  });

  it('"sold"/"reserved" araçlar public\'te HÂLÂ görünür (sadece unpublished gizlenir)', async () => {
    const sold = await createVehicle(context, baseVehicle({ status: "sold" }));
    const all = await listVehicles(publicContext);
    expect(all.find((v) => v.id === sold.id)).toBeDefined();
  });

  it("JSONB alanları (partsStatus/history) ve TEXT[] (equipment) doğru round-trip eder", async () => {
    const created = await createVehicle(
      context,
      baseVehicle({
        partsStatus: [{ part: "Ön Kaput", status: "Boyalı" }],
        history: [{ date: "2024-03-01", km: 98000, action: "Periyodik bakım", description: "" }],
        equipment: ["Sunroof", "Deri Koltuk"],
      }),
    );
    const fetched = await getVehicle(context, created.id);
    expect(fetched.partsStatus).toEqual([{ part: "Ön Kaput", status: "Boyalı" }]);
    expect(fetched.history[0].action).toBe("Periyodik bakım");
    expect(fetched.equipment).toEqual(["Sunroof", "Deri Koltuk"]);
  });

  it("güncelleme sadece gönderilen alanları değiştirir, gerisini korur", async () => {
    const created = await createVehicle(context, baseVehicle({ equipment: ["Sunroof"] }));
    const updated = await updateVehicle(context, created.id, { km: 20000 });
    expect(updated.km).toBe(20000);
    expect(updated.equipment).toEqual(["Sunroof"]);
  });
});

describe("vehicle.postgres.service — vehicle_media görünürlük (visibility)", () => {
  let vehicle;
  let deleteFileSpy;

  beforeAll(() => getTestPool());
  beforeEach(async () => {
    await truncateAll();
    deleteFileSpy = jest.spyOn(mockR2Storage, "deleteFile").mockResolvedValue(undefined);
    vehicle = await createVehicle(context, baseVehicle({}));
  });
  afterEach(() => deleteFileSpy.mockRestore());
  afterAll(() => closeTestPool());

  it("public görsel (ekspertiz raporu) public context'te görünür", async () => {
    await addVehicleMedia(context, vehicle.id, {
      kind: "document",
      objectKey: "document/ekspertiz.pdf",
      url: "http://cdn/ekspertiz.pdf",
      visibility: "public",
      documentLabel: "ekspertiz.pdf",
    });
    const publicMedia = await listVehicleMedia(publicContext, vehicle.id);
    expect(publicMedia).toHaveLength(1);
  });

  it("admin-only belge (servis kaydı vb.) public context'te HİÇ dönmez", async () => {
    await addVehicleMedia(context, vehicle.id, {
      kind: "document",
      objectKey: "document/servis.pdf",
      url: "http://cdn/servis.pdf",
      visibility: "admin_only",
      category: "servis",
    });
    expect(await listVehicleMedia(publicContext, vehicle.id)).toHaveLength(0);
    expect(await listVehicleMedia(context, vehicle.id)).toHaveLength(1); // admin panelinde görünür
  });

  it("ilan silinince tüm medya (fotoğraf + admin-only belgeler dahil) R2'den silinir", async () => {
    await addVehicleMedia(context, vehicle.id, { kind: "image", objectKey: "image/1.webp", url: "http://cdn/1.webp", visibility: "public" });
    await addVehicleMedia(context, vehicle.id, { kind: "document", objectKey: "document/servis.pdf", url: "http://cdn/servis.pdf", visibility: "admin_only" });

    await deleteVehicle(context, vehicle.id);

    expect(deleteFileSpy).toHaveBeenCalledWith("image/1.webp");
    expect(deleteFileSpy).toHaveBeenCalledWith("document/servis.pdf");
  });
});
