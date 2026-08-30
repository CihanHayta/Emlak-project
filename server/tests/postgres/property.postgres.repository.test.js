// server/tests/postgres/property.postgres.repository.test.js
//
// property.postgres.repository.js'i GERÇEK yerel bir PostgreSQL'e karşı
// test eder (bkz. pgTestDb.js) — tests/property.repository üzerinde ayrı
// bir Firestore testi yok çünkü property.repository.js hiç ekstra metod
// eklemiyor (sadece BaseRepository), asıl davranış zaten
// tests/property.service.test.js'te (Firestore) dolaylı test ediliyor. Bu
// dosya BasePostgresRepository'nin (Firestore'un base.repository.js'i ile
// AYNI garantileri vermesi gereken) kendisini doğruluyor: tenant izolasyonu,
// soft-delete filtrelemesi, create/update alan eşlemesi.
import { jest } from "@jest/globals";
import { getTestPool, truncateAll, closeTestPool } from "./pgTestDb.js";

jest.unstable_mockModule("../../src/db/pool.js", () => ({
  getPool: async () => getTestPool(),
}));

const { propertyPostgresRepository } = await import("../../src/repositories/property.postgres.repository.js");
const { TenantScopeError } = await import("../../src/utils/TenantScopeError.js");

const tenantA = { tenantId: "tenant-a", userId: "u1", role: "owner" };
const tenantB = { tenantId: "tenant-b", userId: "u2", role: "owner" };

function baseProperty(overrides) {
  return {
    category: "satilik",
    type: "Daire",
    title: "Test İlan",
    listingNo: "123456",
    price: "1.500.000 TL",
    province: "İstanbul",
    district: "Kadıköy",
    neighborhood: "Moda",
    street: "",
    area: 100,
    amenities: [],
    showLocation: true,
    status: "published",
    ...overrides,
  };
}

describe("property.postgres.repository", () => {
  beforeAll(async () => {
    await getTestPool();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  it("bir ilan oluşturur ve tenant_id'yi otomatik damgalar", async () => {
    const created = await propertyPostgresRepository.create(tenantA, baseProperty({}));
    expect(created.id).toBeDefined();
    expect(created.tenantId).toBe("tenant-a");
    expect(created.title).toBe("Test İlan");
  });

  it("TEXT[] sütunu (amenities) doğru şekilde yazılıp okunur", async () => {
    const created = await propertyPostgresRepository.create(tenantA, baseProperty({ amenities: ["Otopark", "Asansör"] }));
    const fetched = await propertyPostgresRepository.findById(tenantA, created.id);
    expect(fetched.amenities).toEqual(["Otopark", "Asansör"]);
  });

  it("olmayan bir ilanı getirmeye çalışınca null döner", async () => {
    expect(await propertyPostgresRepository.findById(tenantA, "olmayan-id")).toBeNull();
  });

  it("IDOR: tenant B, tenant A'nın ilanını ID ile GETİREMEZ", async () => {
    const created = await propertyPostgresRepository.create(tenantA, baseProperty({}));
    expect(await propertyPostgresRepository.findById(tenantB, created.id)).toBeNull();
  });

  it("IDOR: tenant B, tenant A'nın ilanını GÜNCELLEYEMEZ — TenantScopeError fırlatır", async () => {
    const created = await propertyPostgresRepository.create(tenantA, baseProperty({}));
    await expect(propertyPostgresRepository.update(tenantB, created.id, { title: "Ele geçirildi" })).rejects.toThrow(
      TenantScopeError,
    );
    const stillOriginal = await propertyPostgresRepository.findById(tenantA, created.id);
    expect(stillOriginal.title).toBe("Test İlan");
  });

  it("IDOR: tenant B, tenant A'nın ilanını SİLEMEZ", async () => {
    const created = await propertyPostgresRepository.create(tenantA, baseProperty({}));
    await expect(propertyPostgresRepository.softDelete(tenantB, created.id)).rejects.toThrow(TenantScopeError);
    const stillThere = await propertyPostgresRepository.findById(tenantA, created.id);
    expect(stillThere).not.toBeNull();
  });

  it("findAll sadece o tenant'ın ilanlarını döner (başka tenant'ınkiler karışmaz)", async () => {
    await propertyPostgresRepository.create(tenantA, baseProperty({ title: "A'nın ilanı" }));
    await propertyPostgresRepository.create(tenantB, baseProperty({ title: "B'nin ilanı" }));

    const listA = await propertyPostgresRepository.findAll(tenantA);
    expect(listA).toHaveLength(1);
    expect(listA[0].title).toBe("A'nın ilanı");
  });

  it("soft delete: silinen ilan findAll/findById'de görünmez ama satır fiziksel olarak durur", async () => {
    const created = await propertyPostgresRepository.create(tenantA, baseProperty({}));
    await propertyPostgresRepository.softDelete(tenantA, created.id);

    expect(await propertyPostgresRepository.findById(tenantA, created.id)).toBeNull();
    expect(await propertyPostgresRepository.findAll(tenantA)).toHaveLength(0);

    const pool = await getTestPool();
    const { rows } = await pool.query("SELECT deleted_at FROM properties WHERE id = $1", [created.id]);
    expect(rows[0].deleted_at).not.toBeNull();
  });

  it("update sadece verilen alanları değiştirir, gerisini korur", async () => {
    const created = await propertyPostgresRepository.create(tenantA, baseProperty({ price: "1.000.000 TL" }));
    const updated = await propertyPostgresRepository.update(tenantA, created.id, { price: "1.200.000 TL" });
    expect(updated.price).toBe("1.200.000 TL");
    expect(updated.title).toBe("Test İlan");
  });
});
