// server/tests/postgres/property.postgres.service.test.js
//
// property.postgres.service.js'i GERÇEK yerel bir PostgreSQL'e (bkz.
// pgTestDb.js) VE R2 mock storage'a (bkz. db/mock/storage.mock.js,
// STORAGE_MODE=mock zaten tests/postgres/setupEnv.js'te) karşı test eder.
// tests/property.service.test.js'teki (Firestore) İLGİLİ senaryoların
// AYNISI burada tekrarlanıyor — "aynı davranış korundu" iddiasının
// kanıtı bu paralellik. AŞAMA 11: İlan Eşleşmesi otomasyonu testleri
// (customers/automationEvents artık Postgres) buraya taşındı — bkz. dosya
// sonundaki describe bloğu. AŞAMA (File Store kaldırma): tenant fixture'ları
// da artık Postgres (tenant.postgres.repository.js).
import { jest } from "@jest/globals";
import { getTestPool, truncateAll, closeTestPool } from "./pgTestDb.js";

jest.unstable_mockModule("../../src/db/pool.js", () => ({
  getPool: async () => getTestPool(),
}));

const {
  createProperty,
  getProperty,
  listProperties,
  updateProperty,
  deleteProperty,
  addPropertyMedia,
  listPropertyMedia,
  setCoverPropertyMedia,
  reorderPropertyMedia,
  deletePropertyMedia,
} = await import("../../src/services/property.postgres.service.js");
const { mockR2Storage } = await import("../../src/db/mock/storage.mock.js");
const { createDefaultTenant } = await import("../../src/models/tenant.model.js");
const tenantRepo = await import("../../src/repositories/tenant.postgres.repository.js");
const { customerPostgresRepository } = await import("../../src/repositories/customer.postgres.repository.js");
const { createDefaultCustomer } = await import("../../src/models/customer.model.js");
const { automationEventPostgresRepository } = await import("../../src/repositories/automationEvent.postgres.repository.js");

const context = { tenantId: "test-tenant", userId: "u1", role: "owner" };
const publicContext = { tenantId: "test-tenant", userId: null, role: "public" };
const otherTenantContext = { tenantId: "other-tenant", userId: "u2", role: "owner" };

function baseProperty(overrides) {
  return {
    category: "satilik",
    type: "Daire",
    title: "Test İlan",
    price: "1.500.000 TL",
    district: "Kadıköy",
    neighborhood: "Moda",
    ...overrides,
  };
}

describe("property.postgres.service — CRUD ve görünürlük (property.service.test.js ile paralel)", () => {
  let deleteFileSpy;

  beforeAll(async () => {
    await getTestPool();
  });

  beforeEach(async () => {
    await truncateAll();
    deleteFileSpy = jest.spyOn(mockR2Storage, "deleteFile").mockResolvedValue(undefined);
  });

  afterEach(() => deleteFileSpy.mockRestore());
  afterAll(() => closeTestPool());

  it("olmayan bir ilanı getirmeye çalışınca NotFound fırlatır", async () => {
    await expect(getProperty(context, "olmayan-id")).rejects.toThrow(/bulunamadı/);
  });

  it("silinen ilan listede görünmez (soft delete)", async () => {
    const property = await createProperty(context, baseProperty({}));
    await deleteProperty(context, property.id);
    const all = await listProperties(context);
    expect(all.find((p) => p.id === property.id)).toBeUndefined();
  });

  it("status belirtilmezse varsayılan 'published' — public'te görünür", async () => {
    const property = await createProperty(context, baseProperty({}));
    expect(property.status).toBe("published");
    const publicList = await listProperties(publicContext);
    expect(publicList.some((p) => p.id === property.id)).toBe(true);
  });

  it("status='unpublished' iken public listede GÖRÜNMEZ ama admin listesinde görünür", async () => {
    const property = await createProperty(context, baseProperty({ status: "unpublished" }));
    expect((await listProperties(publicContext)).some((p) => p.id === property.id)).toBe(false);
    expect((await listProperties(context)).some((p) => p.id === property.id)).toBe(true);
  });

  it("status='unpublished' iken public GET 'bulunamadı' fırlatır", async () => {
    const property = await createProperty(context, baseProperty({ status: "unpublished" }));
    await expect(getProperty(publicContext, property.id)).rejects.toThrow(/bulunamadı/);
  });

  it("taslaktan yayına geçince public'te tekrar görünür", async () => {
    const property = await createProperty(context, baseProperty({ status: "unpublished" }));
    await updateProperty(context, property.id, { status: "published" });
    expect((await listProperties(publicContext)).some((p) => p.id === property.id)).toBe(true);
  });

  it("IDOR: başka tenant bu ilanı göremez/silemez", async () => {
    const property = await createProperty(context, baseProperty({}));
    await expect(getProperty(otherTenantContext, property.id)).rejects.toThrow(/bulunamadı/);
    await expect(deleteProperty(otherTenantContext, property.id)).rejects.toThrow();
    expect(await getProperty(context, property.id)).toBeTruthy(); // hâlâ duruyor, silinmedi
  });

  it("`images`/`videoUrl` gibi eski medya alanları create'e gönderilirse properties tablosuna YAZILMAZ (sessizce yok sayılır)", async () => {
    const created = await createProperty(context, baseProperty({ images: ["https://x/1.jpg"], videoUrl: "https://x/v.mp4" }));
    expect(created.images).toBeUndefined();
    expect(created.videoUrl).toBeUndefined();
  });
});

describe("property.postgres.service — property_media", () => {
  let property;
  let deleteFileSpy;

  beforeAll(async () => {
    await getTestPool();
  });

  beforeEach(async () => {
    await truncateAll();
    deleteFileSpy = jest.spyOn(mockR2Storage, "deleteFile").mockResolvedValue(undefined);
    property = await createProperty(context, baseProperty({}));
  });

  afterEach(() => deleteFileSpy.mockRestore());
  afterAll(() => closeTestPool());

  it("ilk eklenen fotoğraf otomatik kapak olur", async () => {
    const media = await addPropertyMedia(context, property.id, {
      kind: "image",
      objectKey: "image/1.webp",
      url: "http://cdn/1.webp",
      mimeType: "image/webp",
    });
    expect(media.isCover).toBe(true);
  });

  it("ikinci fotoğraf otomatik kapak OLMAZ, sıradaki position'a eklenir", async () => {
    await addPropertyMedia(context, property.id, { kind: "image", objectKey: "image/1.webp", url: "http://cdn/1.webp" });
    const second = await addPropertyMedia(context, property.id, { kind: "image", objectKey: "image/2.webp", url: "http://cdn/2.webp" });
    expect(second.isCover).toBe(false);
    expect(second.position).toBe(1);
  });

  it("setCoverPropertyMedia eskisini indirir, yenisini kapak yapar (tek kapak garantisi)", async () => {
    const first = await addPropertyMedia(context, property.id, { kind: "image", objectKey: "image/1.webp", url: "http://cdn/1.webp" });
    const second = await addPropertyMedia(context, property.id, { kind: "image", objectKey: "image/2.webp", url: "http://cdn/2.webp" });

    await setCoverPropertyMedia(context, property.id, second.id);

    const all = await listPropertyMedia(context, property.id);
    expect(all.find((m) => m.id === first.id).isCover).toBe(false);
    expect(all.find((m) => m.id === second.id).isCover).toBe(true);
  });

  it("reorderPropertyMedia sırayı değiştirir", async () => {
    const a = await addPropertyMedia(context, property.id, { kind: "image", objectKey: "image/a.webp", url: "http://cdn/a.webp" });
    const b = await addPropertyMedia(context, property.id, { kind: "image", objectKey: "image/b.webp", url: "http://cdn/b.webp" });

    await reorderPropertyMedia(context, property.id, [b.id, a.id]);

    const ordered = await listPropertyMedia(context, property.id);
    expect(ordered.map((m) => m.id)).toEqual([b.id, a.id]);
  });

  it("video eklenince properties.has_video true olur, video silinince tekrar false olur", async () => {
    const video = await addPropertyMedia(context, property.id, {
      kind: "video",
      objectKey: "video/1.mp4",
      url: "http://cdn/1.mp4",
      isCover: false,
    });
    expect((await getProperty(context, property.id)).hasVideo).toBe(true);

    await deletePropertyMedia(context, property.id, video.id);
    expect((await getProperty(context, property.id)).hasVideo).toBe(false);
  });

  it("medya silinince R2'den de gerçekten silinir", async () => {
    const media = await addPropertyMedia(context, property.id, { kind: "image", objectKey: "image/x.webp", url: "http://cdn/x.webp" });
    await deletePropertyMedia(context, property.id, media.id);
    expect(deleteFileSpy).toHaveBeenCalledWith("image/x.webp");
  });

  it("ilan silinince TÜM medya dosyaları R2'den silinir", async () => {
    await addPropertyMedia(context, property.id, { kind: "image", objectKey: "image/1.webp", url: "http://cdn/1.webp" });
    await addPropertyMedia(context, property.id, { kind: "image", objectKey: "image/2.webp", url: "http://cdn/2.webp" });

    await deleteProperty(context, property.id);

    expect(deleteFileSpy).toHaveBeenCalledWith("image/1.webp");
    expect(deleteFileSpy).toHaveBeenCalledWith("image/2.webp");
  });

  it("IDOR: başka tenant bu property'ye medya ekleyemez/silemez/sıralayamaz", async () => {
    const media = await addPropertyMedia(context, property.id, { kind: "image", objectKey: "image/1.webp", url: "http://cdn/1.webp" });

    await expect(addPropertyMedia(otherTenantContext, property.id, { kind: "image", objectKey: "x", url: "x" })).rejects.toThrow(/bulunamadı/);
    await expect(setCoverPropertyMedia(otherTenantContext, property.id, media.id)).rejects.toThrow(/bulunamadı/);
    await expect(reorderPropertyMedia(otherTenantContext, property.id, [media.id])).rejects.toThrow(/bulunamadı/);
    await expect(deletePropertyMedia(otherTenantContext, property.id, media.id)).rejects.toThrow(/bulunamadı/);
  });
});

describe("property.postgres.service — İlan Eşleşmesi otomasyonu tetikleyicisi", () => {
  // notifyIfPublished BİLEREK awaited DEĞİL (floating promise, response'u
  // bloklamasın diye — property.postgres.service.js'in kendi yorumu). Bu
  // zincir artık GERÇEK Postgres round-trip'leri içeriyor (tenant/customer
  // sorgusu + automationEvent yazma) — Firestore mock'taki gibi anlık değil,
  // bu yüzden tek bir 0ms tick yetmiyordu (canlıda bu test dosyası
  // yazılırken yakalandı). Gerçek I/O'nun oturması için yeterli pay bırakıyoruz.
  function flushMicrotasks() {
    return new Promise((resolve) => setTimeout(resolve, 150));
  }

  async function makeTenantWithAutomationEnabled() {
    const tenant = await tenantRepo.createTenant(createDefaultTenant({ name: "Test Ofis", slug: `ofis-${Date.now()}-${Math.random()}`, ownerUserId: "owner1" }));
    const automations = { ...tenant.automations, listingMatch: { enabled: true, templateStatus: "not_submitted", templateName: null, templateMetaId: null } };
    await tenantRepo.updateTenant(tenant.id, { automations });
    return { ...tenant, automations };
  }

  beforeAll(() => getTestPool());
  beforeEach(async () => {
    await truncateAll();
  });
  afterAll(() => closeTestPool());

  it("YAYINDAKİ bir ilan oluşturulunca eşleşen müşteri için otomasyon event'i oluşur", async () => {
    const tenant = await makeTenantWithAutomationEnabled();
    const ctx = { tenantId: tenant.id, userId: "u1", role: "owner" };
    await customerPostgresRepository.create(ctx, createDefaultCustomer({ name: "Ahmet", phone: "0555 123 45 67", interests: ["Daire"] }));

    await createProperty(ctx, baseProperty({ status: "published" }));
    await flushMicrotasks();

    const events = await automationEventPostgresRepository.findAll(ctx);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("listingMatch");
  });

  it("taslaktan yayına GEÇİNCE (update) otomasyon tetiklenir", async () => {
    const tenant = await makeTenantWithAutomationEnabled();
    const ctx = { tenantId: tenant.id, userId: "u1", role: "owner" };
    await customerPostgresRepository.create(ctx, createDefaultCustomer({ name: "Ahmet", phone: "0555 123 45 67", interests: ["Daire"] }));
    const draft = await createProperty(ctx, baseProperty({ status: "unpublished" }));
    await flushMicrotasks();
    expect(await automationEventPostgresRepository.findAll(ctx)).toHaveLength(0);

    await updateProperty(ctx, draft.id, { status: "published" });
    await flushMicrotasks();

    expect(await automationEventPostgresRepository.findAll(ctx)).toHaveLength(1);
  });

  it("ZATEN yayındaki bir ilanın sıradan güncellemesinde (ör. fiyat) TEKRAR tetiklenmez", async () => {
    const tenant = await makeTenantWithAutomationEnabled();
    const ctx = { tenantId: tenant.id, userId: "u1", role: "owner" };
    await customerPostgresRepository.create(ctx, createDefaultCustomer({ name: "Ahmet", phone: "0555 123 45 67", interests: ["Daire"] }));
    const published = await createProperty(ctx, baseProperty({ status: "published" }));
    await flushMicrotasks();
    expect(await automationEventPostgresRepository.findAll(ctx)).toHaveLength(1);

    await updateProperty(ctx, published.id, { price: "2.000.000 TL" });
    await flushMicrotasks();

    expect(await automationEventPostgresRepository.findAll(ctx)).toHaveLength(1);
  });
});
